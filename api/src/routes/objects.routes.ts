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
});

// Port: public/admin_add_object.php
objectsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createObjectSchema.parse(req.body);
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
