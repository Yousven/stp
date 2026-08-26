import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";

export const workTypesRouter = Router();
workTypesRouter.use(requireAuth);

const listQuerySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
});

/**
 * Tööliikide nimekiri.
 *
 * `objectId` andmisel tagastatakse ainult selle objekti tööliigid koos
 * seal kehtiva tunnihinnaga. Ilma selleta kogu ettevõtte nimekiri.
 *
 * Objektipõhine piirang on tahtlik: töötaja ei pea tööpäeva alustades
 * kerima läbi kõiki ettevõtte tööliike, vaid näeb neid, mis sellel
 * objektil päriselt käivad.
 */
workTypesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { objectId } = listQuerySchema.parse(req.query);
    const organizationId = req.user!.organizationId;

    if (objectId === undefined) {
      const types = await prisma.workType.findMany({
        where: { organizationId, deleted: false },
        orderBy: { name: "asc" },
      });
      res.json(types.map((t) => ({ ...t, rate: t.defaultRate })));
      return;
    }

    const assigned = await prisma.objectWorkType.findMany({
      where: { objectId, workType: { organizationId, deleted: false } },
      include: { workType: true },
      orderBy: { workType: { name: "asc" } },
    });

    res.json(
      assigned.map((row) => ({
        ...row.workType,
        // Objektil kehtiv hind: objekti oma, muidu tööliigi vaikehind.
        rate: row.rate ?? row.workType.defaultRate,
        objectRate: row.rate,
      }))
    );
  })
);

const workTypeSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(40).nullable().optional(),
  // Tühi väli tähendab "määramata", mitte nulli: null hoiab tunnid
  // arveldusraportis eraldi välja, 0 loeks need tasuta tehtuks.
  defaultRate: z.number().nonnegative().nullable().optional(),
});

workTypesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = workTypeSchema.parse(req.body);
    try {
      const created = await prisma.workType.create({
        data: {
          organizationId: req.user!.organizationId,
          name: data.name,
          code: data.code || null,
          defaultRate: data.defaultRate ?? null,
        },
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, req.m.workTypes.duplicate);
      }
      throw err;
    }
  })
);

workTypesRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = workTypeSchema.parse(req.body);

    const existing = await prisma.workType.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw new HttpError(404, req.m.workTypes.notFound);

    try {
      const updated = await prisma.workType.update({
        where: { id },
        data: { name: data.name, code: data.code || null, defaultRate: data.defaultRate ?? null },
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, req.m.workTypes.duplicate);
      }
      throw err;
    }
  })
);

/**
 * Eemaldamine on "pehme": olemasolevad töölogid ja arveread viitavad
 * tööliigile ja peavad ajaloos loetavad jääma, seega märgime ainult
 * kasutusest maha.
 */
workTypesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.workType.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw new HttpError(404, req.m.workTypes.notFound);

    await prisma.workType.update({ where: { id }, data: { deleted: true } });
    res.status(204).end();
  })
);
