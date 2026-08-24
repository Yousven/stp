import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, monthRange, monthlyTargetHours } from "../utils/timeStats.js";

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

    const monthlyTarget = monthlyTargetHours();
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
