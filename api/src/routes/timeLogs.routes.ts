import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { hoursBetween } from "../utils/timeStats.js";

export const timeLogsRouter = Router();
timeLogsRouter.use(requireAuth);

const startSchema = z.object({ objectId: z.number().int().positive() });

// Port: public/start_work_action.php
timeLogsRouter.post(
  "/start",
  asyncHandler(async (req, res) => {
    const { objectId } = startSchema.parse(req.body);
    const userId = req.user!.sub;

    // Erinevalt originaalist kontrollime ka, et objekt poleks deaktiveeritud
    // (objects.deleted) ega kuuluks mõnele teisele ettevõttele — mõlemad on
    // täiendused, mida originaal (üksiku ettevõtte rakendus) ei vajanud.
    const object = await prisma.workObject.findFirst({
      where: { id: objectId, organizationId: req.user!.organizationId, deleted: false },
    });
    if (!object) {
      throw new HttpError(404, "Valitud objekti ei leitud.");
    }

    const activeLog = await prisma.timeLog.findFirst({ where: { userId, endTime: null } });
    if (activeLog) {
      throw new HttpError(409, "Tööpäev on juba alustatud. Palun lõpetage olemasolev tööpäev enne uue alustamist.");
    }

    const log = await prisma.timeLog.create({
      data: { userId, objectId, startTime: new Date() },
      include: { object: true },
    });
    res.status(201).json(log);
  })
);

const endSchema = z.object({
  comment: z.string().optional().default(""),
  travelDuration: z.number().nonnegative().optional().default(0),
  lunch: z.number().nonnegative().optional().default(0),
});

// Port: public/end_work_action.php (katab nii käsitsi kui geofence-põhise auto-lõpetamise,
// mis originaalis eristati ainult kommentaari teksti kaudu).
timeLogsRouter.post(
  "/:id/end",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { comment, travelDuration, lunch } = endSchema.parse(req.body);
    const userId = req.user!.sub;

    // Turvatäiendus originaali suhtes: kontrollime, et töölogi kuulub
    // sisselogitud kasutajale (originaal kontrollis ainult, et log on aktiivne).
    const log = await prisma.timeLog.findFirst({ where: { id, userId } });
    if (!log || log.endTime) {
      throw new HttpError(409, "Aktiivset töölogi ei leitud. Tööpäev pole alustatud või on juba lõpetatud.");
    }

    const updated = await prisma.timeLog.update({
      where: { id },
      data: { endTime: new Date(), comment, travelDuration, lunch },
      include: { object: true },
    });
    res.json(updated);
  })
);

const historyQuerySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Port: public/work_history.php
timeLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { objectId, dateFrom, dateTo } = historyQuerySchema.parse(req.query);
    const userId = req.user!.sub;

    const logs = await prisma.timeLog.findMany({
      where: {
        userId,
        ...(objectId ? { objectId } : {}),
        ...(dateFrom || dateTo
          ? {
              startTime: {
                ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
                ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startTime: "desc" },
      include: { object: true },
    });

    let totalHours = 0;
    const result = logs.map((log) => {
      let durationHours: number | null = null;
      if (log.endTime) {
        durationHours = hoursBetween(log.startTime, log.endTime) - Number(log.lunch ?? 0);
        totalHours += durationHours;
      }
      return { ...log, durationHours: durationHours !== null ? round2(durationHours) : null };
    });

    res.json({ logs: result, totalHours: round2(totalHours) });
  })
);

const adminUpdateSchema = z.object({
  workDuration: z.number().optional(),
  lunch: z.number().optional(),
  travelDuration: z.number().optional(),
});

// Port: public/update_work_log.php (admin muudab käsitsi päeva tunde/lõunat/sõiduaega)
timeLogsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { workDuration, lunch, travelDuration } = adminUpdateSchema.parse(req.body);

    const log = await prisma.timeLog.findFirst({
      where: { id, user: { organizationId: req.user!.organizationId } },
    });
    if (!log) throw new HttpError(404, "Töölogi ei leitud.");

    const updated = await prisma.timeLog.update({
      where: { id },
      data: { manualWorkDuration: workDuration, lunch, travelDuration },
      include: { object: true },
    });
    res.json(updated);
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
