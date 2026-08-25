import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reportLimiter } from "../middleware/rateLimit.js";
import { computeWorkedHours } from "../utils/timeStats.js";

export const billingRouter = Router();
billingRouter.use(requireAuth, requireAdmin, reportLimiter);

const querySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Kliendiarvelduse ülevaade objektide kaupa.
 *
 * Sama tunniandmestik, mida kasutatakse palgaarvestuses, aga teisest
 * otsast vaadatuna: mida objektile kulus (töötajate palgamäärade järgi) ja
 * mida saab kliendilt küsida (arveldusmäära järgi). Vahe on kate.
 *
 * Arveldusmäär valitakse järjekorras: kulukoodi määr → objekti määr →
 * puudumisel loetakse tunnid mittearveldatavaks (0), et puuduv seadistus
 * ei tekitaks vaikselt vale arvet.
 */
billingRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { objectId, dateFrom, dateTo } = querySchema.parse(req.query);

    const logs = await prisma.timeLog.findMany({
      where: {
        user: { organizationId: req.user!.organizationId },
        endTime: { not: null },
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
      include: {
        object: true,
        costCode: true,
        user: { select: { id: true, username: true, hourlyRate: true } },
      },
      orderBy: { startTime: "asc" },
    });

    // Kogu objektide kaupa; iga objekti sees kulukoodide kaupa, et arvele
    // saaks panna rea "müüritöö 40h" ja mitte ainult kogusumma.
    const byObject = new Map<
      number,
      {
        objectId: number;
        objectName: string;
        clientName: string | null;
        budgetHours: number | null;
        hours: number;
        cost: number;
        billable: number;
        unbilledHours: number;
        lines: Map<string, { costCode: string; hours: number; rate: number | null; billable: number }>;
      }
    >();

    for (const log of logs) {
      const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
      const hours = manual ?? computeWorkedHours(log).net;
      if (hours <= 0) continue;

      const rate =
        log.costCode?.billableRate != null
          ? Number(log.costCode.billableRate)
          : log.object.billableRate != null
            ? Number(log.object.billableRate)
            : null;

      const entry = byObject.get(log.objectId) ?? {
        objectId: log.objectId,
        objectName: log.object.name,
        clientName: log.object.clientName,
        budgetHours: log.object.budgetHours != null ? Number(log.object.budgetHours) : null,
        hours: 0,
        cost: 0,
        billable: 0,
        unbilledHours: 0,
        lines: new Map<string, { costCode: string; hours: number; rate: number | null; billable: number }>(),
      };

      entry.hours += hours;
      entry.cost += hours * Number(log.user.hourlyRate);
      if (rate === null) {
        entry.unbilledHours += hours;
      } else {
        entry.billable += hours * rate;
      }

      const key = log.costCode ? `${log.costCode.code}` : "(määramata)";
      const line = entry.lines.get(key) ?? {
        costCode: log.costCode ? `${log.costCode.code} — ${log.costCode.name}` : "(kulukood määramata)",
        hours: 0,
        rate,
        billable: 0,
      };
      line.hours += hours;
      line.billable += rate === null ? 0 : hours * rate;
      entry.lines.set(key, line);

      byObject.set(log.objectId, entry);
    }

    const objects = [...byObject.values()].map((entry) => ({
      objectId: entry.objectId,
      objectName: entry.objectName,
      clientName: entry.clientName,
      budgetHours: entry.budgetHours,
      hours: round2(entry.hours),
      // Üle eelarve on projektijuhi jaoks olulisim number sellel lehel.
      overBudgetHours: entry.budgetHours != null ? round2(Math.max(entry.hours - entry.budgetHours, 0)) : null,
      cost: round2(entry.cost),
      billable: round2(entry.billable),
      margin: round2(entry.billable - entry.cost),
      // Tunnid, millel puudub arveldusmäär — need EI ole arvel ja
      // vajavad seadistamist.
      unbilledHours: round2(entry.unbilledHours),
      lines: [...entry.lines.values()].map((l) => ({
        costCode: l.costCode,
        hours: round2(l.hours),
        rate: l.rate,
        billable: round2(l.billable),
      })),
    }));

    const totals = objects.reduce(
      (acc, o) => ({
        hours: round2(acc.hours + o.hours),
        cost: round2(acc.cost + o.cost),
        billable: round2(acc.billable + o.billable),
        margin: round2(acc.margin + o.margin),
        unbilledHours: round2(acc.unbilledHours + o.unbilledHours),
      }),
      { hours: 0, cost: 0, billable: 0, margin: 0, unbilledHours: 0 }
    );

    res.json({ objects, totals });
  })
);
