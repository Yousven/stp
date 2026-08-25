import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { recordAudit } from "../utils/audit.js";

export const absencesRouter = Router();
absencesRouter.use(requireAuth);

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kuupäev peab olema kujul YYYY-MM-DD");

const listQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  from: DATE.optional(),
  to: DATE.optional(),
});

/**
 * Puudumiste nimekiri. Töötaja näeb ainult enda omi; admin kõiki ja saab
 * `userId`-ga filtreerida.
 */
absencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, from, to } = listQuerySchema.parse(req.query);
    const isAdmin = req.user!.role === "admin";

    const absences = await prisma.absence.findMany({
      where: {
        organizationId: req.user!.organizationId,
        // Töötaja ei tohi näha kolleegide haiguslehti.
        userId: isAdmin ? userId : req.user!.sub,
        ...(from ? { endDate: { gte: from } } : {}),
        ...(to ? { startDate: { lte: to } } : {}),
      },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { startDate: "desc" },
    });

    res.json(absences);
  })
);

const createSchema = z
  .object({
    userId: z.number().int().positive(),
    type: z.enum(["vacation", "sick", "unpaid", "other"]),
    startDate: DATE,
    endDate: DATE,
    comment: z.string().max(500).optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Lõppkuupäev ei tohi olla alguskuupäevast varasem.",
    path: ["endDate"],
  });

absencesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!user) throw new HttpError(404, req.m.users.notFound);

    // Kattuv puudumine on peaaegu alati eksitus (nt sama puhkus sisestatud
    // kaks korda) ja tekitaks normi arvutuses segadust.
    const overlapping = await prisma.absence.findFirst({
      where: {
        userId: data.userId,
        startDate: { lte: data.endDate },
        endDate: { gte: data.startDate },
      },
    });
    if (overlapping) {
      throw new HttpError(409, req.m.absences.overlapping(overlapping.startDate, overlapping.endDate));
    }

    const absence = await prisma.absence.create({
      data: { ...data, organizationId: req.user!.organizationId, createdById: req.user!.sub },
      include: { user: { select: { id: true, username: true } } },
    });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "absence",
      entityId: absence.id,
      action: "create",
      changes: {
        userId: { from: null, to: data.userId },
        type: { from: null, to: data.type },
        period: { from: null, to: `${data.startDate} – ${data.endDate}` },
      },
      reason: data.comment,
    });

    res.status(201).json(absence);
  })
);

absencesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const absence = await prisma.absence.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!absence) throw new HttpError(404, req.m.absences.notFound);

    await prisma.absence.delete({ where: { id } });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "absence",
      entityId: id,
      action: "delete",
      changes: {
        period: { from: `${absence.startDate} – ${absence.endDate}`, to: null },
        type: { from: absence.type, to: null },
      },
    });

    res.status(204).end();
  })
);
