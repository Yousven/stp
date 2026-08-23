import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hoursBetween, monthRange, monthlyTargetHours } from "../utils/timeStats.js";

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
    // HUOM: originaal (dashboard.php) EI lahuta siin lõunat, erinevalt
    // work_history.php koguarvestusest, mis lahutab. Käitumine on siia
    // teadlikult üle kantud muutmata kujul — kontrolli äriga, kas see
    // lahknevus on tahtlik enne kui sellele toetuda.
    const finishedLogsThisMonth = await prisma.timeLog.findMany({
      where: { userId, endTime: { not: null }, startTime: { gte: start, lte: end } },
    });
    const totalHours = round2(
      finishedLogsThisMonth.reduce((sum, log) => sum + hoursBetween(log.startTime, log.endTime!), 0)
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const hourlyRate = Number(user.hourlyRate);
    const advance = Number(user.advance);
    const totalEarnings = round2(totalHours * hourlyRate);
    const netSalary = round2(totalEarnings - advance);

    const monthlyTarget = monthlyTargetHours();
    const progress = monthlyTarget > 0 ? Math.min(Math.round((totalHours / monthlyTarget) * 100), 100) : 0;

    res.json({
      activeLog,
      lastFinished,
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
