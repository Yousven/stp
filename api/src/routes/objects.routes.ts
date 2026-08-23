import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const objectsRouter = Router();
objectsRouter.use(requireAuth);

// Aktiivsete objektide nimekiri (tööpäeva alustamise objekti-valija jaoks),
// piiritletud kasutaja enda ettevõttega.
// Täielik admin CRUD (muuda/deaktiveeri) tuleb Faas 3-s.
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

const createObjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().int().positive(),
});

// Minimaalne loomisvõimalus, et äsja registreeritud ettevõte saaks üldse
// objekti lisada ja tööpäeva testida. Täielik admin CRUD tuleb Faas 3-s.
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
