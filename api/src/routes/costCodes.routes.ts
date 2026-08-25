import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";

export const costCodesRouter = Router();
costCodesRouter.use(requireAuth);

const listQuerySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
});

/**
 * Kasutatavad kulukoodid.
 *
 * `objectId` andmisel tagastatakse nii selle objekti omad kui ka üldised
 * (objektiga sidumata) koodid — töötaja peab tööpäeva alustades nägema
 * mõlemat.
 */
costCodesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { objectId } = listQuerySchema.parse(req.query);

    const codes = await prisma.costCode.findMany({
      where: {
        organizationId: req.user!.organizationId,
        deleted: false,
        ...(objectId ? { OR: [{ objectId }, { objectId: null }] } : {}),
      },
      orderBy: [{ objectId: "asc" }, { code: "asc" }],
    });
    res.json(codes);
  })
);

const codeSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(255),
  objectId: z.number().int().positive().nullable().optional(),
  billableRate: z.number().nonnegative().nullable().optional(),
});

costCodesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = codeSchema.parse(req.body);

    if (data.objectId) {
      const object = await prisma.workObject.findFirst({
        where: { id: data.objectId, organizationId: req.user!.organizationId },
        select: { id: true },
      });
      if (!object) throw new HttpError(404, "Objekti ei leitud.");
    }

    try {
      const created = await prisma.costCode.create({
        data: { ...data, organizationId: req.user!.organizationId },
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "Selline kulukood on juba olemas.");
      }
      throw err;
    }
  })
);

costCodesRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = codeSchema.parse(req.body);

    const existing = await prisma.costCode.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw new HttpError(404, "Kulukoodi ei leitud.");

    const updated = await prisma.costCode.update({ where: { id }, data });
    res.json(updated);
  })
);

/**
 * Kulukoodi eemaldamine on "pehme": olemasolevad töölogid viitavad sellele
 * ja peavad ajaloos loetavad jääma, seega märgime ainult kasutusest maha.
 */
costCodesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.costCode.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw new HttpError(404, "Kulukoodi ei leitud.");

    await prisma.costCode.update({ where: { id }, data: { deleted: true } });
    res.status(204).end();
  })
);
