import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, monthRange, monthlyTargetHours } from "../utils/timeStats.js";
import { absentWorkDaysInMonth, holidaysForMonth } from "../utils/workCalendar.js";

export const dashboardRouter = Router();

// Port: public/dashboard.php
dashboardRouter.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const activeLog = await prisma.timeLog.findFirst({
      where: { userId, endTime: null },
      orderBy: { startTime: "desc" },
      include: { object: true },
    });

    const lastFinished = activeLog
      ? null
      : await prisma.timeLog.findFirst({
          where: { userId, endTime: { not: null } },
          orderBy: { endTime: "desc" },
          include: { object: true },
        });

    const { start, end } = monthRange();
    // Kuu tunnid arvutatakse nüüd kohaloleku põhjal (computeWorkedHours),
    // sama helperiga mis tööajalugu ja raportid — varem oli siin oma valem,
    // mis erines ajaloost (ei lahutanud lõunat) ja andis suurema tulemuse.
    const finishedLogsThisMonth = await prisma.timeLog.findMany({
      where: { userId, endTime: { not: null }, startTime: { gte: start, lte: end } },
      include: { presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });
    const totalHours = round2(
      finishedLogsThisMonth.reduce((sum, log) => {
        const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
        return sum + (manual ?? computeWorkedHours(log).net);
      }, 0)
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const hourlyRate = Number(user.hourlyRate);
    const advance = Number(user.advance);
    const totalEarnings = round2(totalHours * hourlyRate);
    const netSalary = round2(totalEarnings - advance);

    // Norm arvestab riigipühi ja töötaja puhkust — muidu näeks puhkusel
    // olija välja alatäitjana ja püharohke kuu norm oleks liiga kõrge.
    const holidays = await holidaysForMonth(req.user!.organizationId, new Date());
    const absentDays = await absentWorkDaysInMonth(userId, new Date(), holidays);
    const monthlyTarget = monthlyTargetHours(new Date(), holidays, absentDays);
    const progress = monthlyTarget > 0 ? Math.min(Math.round((totalHours / monthlyTarget) * 100), 100) : 0;

    // Admin näeb dashboardil, kui keegi ootab liitumise kinnitust — muidu
    // jääks taotlus märkamatult seisma, kuna keegi ei tea seda otsida.
    const pendingRequests =
      req.user!.role === "admin"
        ? await prisma.user.count({ where: { organizationId: req.user!.organizationId, status: "pending" } })
        : 0;

    res.json({
      activeLog,
      lastFinished,
      pendingRequests,
      monthSummary: {
        totalHours,
        hourlyRate,
        advance,
        totalEarnings,
        netSalary,
        monthlyTarget,
        progress,
      },
    });
  })
);

const ONBOARDING_DISMISSED_KEY = "onboarding_dismissed";

/**
 * Uue ettevõtte seadistamise seis.
 *
 * Värskelt registreerunud admin ei tea, mida esimesena teha — ilma
 * objektita ei saa keegi tööpäeva alustada ja ilma töötajateta pole
 * kellelgi midagi alustada. Sammud tuletatakse päris andmetest, mitte
 * eraldi lipust, et nimekiri ei saaks tegelikkusest lahku minna.
 */
dashboardRouter.get(
  "/onboarding",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const [organization, objectCount, employeeCount, costCodeCount, timeLogCount, dismissedRow] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, slug: true } }),
      prisma.workObject.count({ where: { organizationId, deleted: false } }),
      // Admin ise ei ole "kutsutud töötaja" — muidu näiks samm tehtuna
      // kohe registreerumise järel.
      prisma.user.count({ where: { organizationId, status: "active", id: { not: req.user!.sub } } }),
      prisma.costCode.count({ where: { organizationId, deleted: false } }),
      prisma.timeLog.count({ where: { user: { organizationId } } }),
      prisma.setting.findUnique({
        where: { organizationId_key: { organizationId, key: ONBOARDING_DISMISSED_KEY } },
      }),
    ]);

    const steps = {
      hasObject: objectCount > 0,
      hasEmployee: employeeCount > 0,
      hasCostCode: costCodeCount > 0,
      hasTimeLog: timeLogCount > 0,
    };

    res.json({
      organization,
      ...steps,
      // Kulukoodid on vajalikud ainult kliendiarvelduseks, seega need ei
      // takista alustamist ega loe "valmis" tingimusse.
      complete: steps.hasObject && steps.hasEmployee && steps.hasTimeLog,
      dismissed: dismissedRow?.value === "1",
    });
  })
);

/** Peidab seadistusjuhise, kui admin ei taha seda enam näha. */
dashboardRouter.post(
  "/onboarding/dismiss",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key: ONBOARDING_DISMISSED_KEY } },
      create: { organizationId, key: ONBOARDING_DISMISSED_KEY, value: "1" },
      update: { value: "1" },
    });
    res.status(204).end();
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
