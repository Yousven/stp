import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, monthRange, monthlyTargetHours } from "../utils/timeStats.js";

export const teamPerformanceRouter = Router();
teamPerformanceRouter.use(requireAuth, requireAdmin);

// Port: public/team_performance.php
// Tunnid arvutatakse kohaloleku põhjal (computeWorkedHours), sama helperiga
// mis dashboard/ajalugu/raportid.
teamPerformanceRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end } = monthRange();
    const monthlyTarget = monthlyTargetHours();

    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      select: {
        username: true,
        timeLogs: {
          where: { endTime: { not: null }, startTime: { gte: start, lte: end } },
          select: {
            startTime: true,
            endTime: true,
            lunch: true,
            manualWorkDuration: true,
            presenceEvents: { select: { type: true, occurredAt: true }, orderBy: { occurredAt: "asc" } },
          },
        },
      },
      orderBy: { username: "asc" },
    });

    let totalTeamHours = 0;
    const performance = users.map((user) => {
      const actualHours = round2(
        user.timeLogs.reduce((sum, log) => {
          const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
          return sum + (manual ?? computeWorkedHours(log).net);
        }, 0)
      );
      totalTeamHours += actualHours;
      return {
        username: user.username,
        norm: monthlyTarget,
        actual: actualHours,
        percent: monthlyTarget > 0 ? round2((actualHours / monthlyTarget) * 100) : 0,
      };
    });

    res.json({ performance, totalTeamHours: round2(totalTeamHours) });
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
