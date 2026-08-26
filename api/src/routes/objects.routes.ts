import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { Messages } from "../i18n/messages.js";

export const objectsRouter = Router();
objectsRouter.use(requireAuth);

// Aktiivsete objektide nimekiri (tööpäeva alustamise objekti-valija jaoks),
// piiritletud kasutaja enda ettevõttega.
objectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const objects = await prisma.workObject.findMany({
      where: { organizationId: req.user!.organizationId, deleted: false },
      orderBy: { name: "asc" },
      include: { client: { select: { id: true, name: true } } },
    });
    res.json(objects);
  })
);

// Halduse nimekiri (admin) — sisaldab ka deaktiveeritud objekte.
// Port: public/admin_objects.php
objectsRouter.get(
  "/all",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const objects = await prisma.workObject.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { name: "asc" },
      include: { client: { select: { id: true, name: true } } },
    });
    res.json(objects);
  })
);

const createObjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().int().positive(),
  // --- Arvelduse väljad ---
  // Kuni need olid ainult andmebaasis, aga mitte siin skeemis, ei saanud
  // kliendihinda üldse sisestada ja arveldusraport näitas alati nulli.
  clientId: z.number().int().positive().nullable().optional(),
  billableRate: z.number().nonnegative().nullable().optional(),
  budgetHours: z.number().nonnegative().nullable().optional(),
});

/** Tellija peab kuuluma samale ettevõttele — muidu saaks võõra siduda. */
async function assertOwnClient(clientId: number | null | undefined, organizationId: number, m: Messages) {
  if (!clientId) return;
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) throw new HttpError(404, m.clients.notFound);
}

// Port: public/admin_add_object.php
objectsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createObjectSchema.parse(req.body);
    await assertOwnClient(data.clientId, req.user!.organizationId, req.m);
    const object = await prisma.workObject.create({
      data: { ...data, organizationId: req.user!.organizationId },
    });
    res.status(201).json(object);
  })
);

/** Veateade tuleb päringu küljest, seega antakse `req` kaasa. */
async function findOwnObjectOr404(id: number, organizationId: number, m: Messages) {
  const object = await prisma.workObject.findFirst({ where: { id, organizationId } });
  if (!object) throw new HttpError(404, m.objects.notFound);
  return object;
}

// Port: public/admin_edit_object.php
objectsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = createObjectSchema.parse(req.body);
    await findOwnObjectOr404(id, req.user!.organizationId, req.m);
    await assertOwnClient(data.clientId, req.user!.organizationId, req.m);
    const object = await prisma.workObject.update({ where: { id }, data });
    res.json(object);
  })
);

// Port: public/admin_activate_object.php / admin_deactivate_object.php
objectsRouter.post(
  "/:id/activate",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await findOwnObjectOr404(id, req.user!.organizationId, req.m);
    const object = await prisma.workObject.update({ where: { id }, data: { deleted: false } });
    res.json(object);
  })
);

objectsRouter.post(
  "/:id/deactivate",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await findOwnObjectOr404(id, req.user!.organizationId, req.m);
    const object = await prisma.workObject.update({ where: { id }, data: { deleted: true } });
    res.json(object);
  })
);

// Port: public/admin_delete_object.php
objectsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await findOwnObjectOr404(id, req.user!.organizationId, req.m);
    try {
      await prisma.workObject.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new HttpError(409, req.m.objects.hasTimeLogs);
      }
      throw err;
    }
  })
);

/**
 * Objektil kasutatavad tööliigid koos seal kehtiva hinnaga.
 *
 * Tagastatakse kogu ettevõtte nimekiri, iga rea juures märge, kas see on
 * sellel objektil kasutusel — nii saab admin ühelt ekraanilt linnukesi
 * panna, ilma kahte nimekirja kõrvutamata.
 */
objectsRouter.get(
  "/:id/work-types",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const organizationId = req.user!.organizationId;
    await findOwnObjectOr404(id, organizationId, req.m);

    const [all, assigned] = await Promise.all([
      prisma.workType.findMany({ where: { organizationId, deleted: false }, orderBy: { name: "asc" } }),
      prisma.objectWorkType.findMany({ where: { objectId: id } }),
    ]);
    const byId = new Map(assigned.map((row) => [row.workTypeId, row]));

    res.json(
      all.map((type) => ({
        workTypeId: type.id,
        name: type.name,
        code: type.code,
        defaultRate: type.defaultRate,
        enabled: byId.has(type.id),
        rate: byId.get(type.id)?.rate ?? null,
      }))
    );
  })
);

const assignSchema = z.object({
  workTypes: z.array(
    z.object({
      workTypeId: z.number().int().positive(),
      rate: z.number().nonnegative().nullable().optional(),
    })
  ),
});

/**
 * Objekti tööliikide nimekirja asendamine.
 *
 * Eemaldamine ei puuduta juba tehtud töölogisid — need viitavad tööliigile
 * otse ja jäävad ajaloos ning juba esitatud arvetel alles. Nimekiri ütleb
 * ainult, mida saab EDASPIDI valida.
 */
objectsRouter.put(
  "/:id/work-types",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const organizationId = req.user!.organizationId;
    await findOwnObjectOr404(id, organizationId, req.m);
    const { workTypes } = assignSchema.parse(req.body);

    const owned = await prisma.workType.findMany({
      where: { organizationId, id: { in: workTypes.map((w) => w.workTypeId) } },
      select: { id: true },
    });
    if (owned.length !== workTypes.length) throw new HttpError(404, req.m.workTypes.notFound);

    await prisma.$transaction([
      prisma.objectWorkType.deleteMany({ where: { objectId: id } }),
      prisma.objectWorkType.createMany({
        data: workTypes.map((w) => ({ objectId: id, workTypeId: w.workTypeId, rate: w.rate ?? null })),
      }),
    ]);

    const rows = await prisma.objectWorkType.findMany({
      where: { objectId: id },
      include: { workType: true },
    });
    res.json(rows);
  })
);
