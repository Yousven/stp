import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, monthRange, monthlyTargetHours } from "../utils/timeStats.js";
import { absentWorkDaysInMonth, holidaysForMonth } from "../utils/workCalendar.js";

export const teamPerformanceRouter = Router();
teamPerformanceRouter.use(requireAuth, requireAdmin);

// Port: public/team_performance.php
// Tunnid arvutatakse kohaloleku põhjal (computeWorkedHours), sama helperiga
// mis dashboard/ajalugu/raportid.
teamPerformanceRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end } = monthRange();
    const holidays = await holidaysForMonth(req.user!.organizationId, new Date());
    // Baasnorm ilma puhkuseta; iga töötaja oma norm arvutatakse allpool,
    // kuna puhkusepäevad on inimeseti erinevad.
    const baseTarget = monthlyTargetHours(new Date(), holidays, 0);

    const users = await prisma.user.findMany({
      // Ainult aktiivsed: ootel/tagasi lükatud taotlused ei ole veel
      // töötajad ja rikuksid meeskonna statistikat nullidega.
      where: { organizationId: req.user!.organizationId, status: "active" },
      select: {
        id: true,
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
    const performance = await Promise.all(
      users.map(async (user) => {
        const actualHours = round2(
          user.timeLogs.reduce((sum, log) => {
            const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
            return sum + (manual ?? computeWorkedHours(log).net);
          }, 0)
        );
        totalTeamHours += actualHours;

        // Igal töötajal oma norm: puhkusel olija norm on väiksem, muidu
        // näeks ta välja alatäitjana, kuigi tegi kõik ettenähtud päevad.
        const absentDays = await absentWorkDaysInMonth(user.id, new Date(), holidays);
        const norm = monthlyTargetHours(new Date(), holidays, absentDays);

        return {
          username: user.username,
          norm,
          absentDays,
          actual: actualHours,
          percent: norm > 0 ? round2((actualHours / norm) * 100) : 0,
        };
      })
    );

    res.json({ performance, totalTeamHours: round2(totalTeamHours), baseTarget });
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
