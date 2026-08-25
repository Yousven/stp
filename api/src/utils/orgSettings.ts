import { prisma } from "../prisma.js";
import { DEFAULT_OVERTIME_RULES, type OvertimeRules } from "./timeStats.js";

/**
 * Ettevõtte ületunnireeglid seadetest.
 *
 * Puuduva või vigase väärtuse korral langeme vaikimisi reeglitele —
 * palgaarvestus ei tohi katki minna sellepärast, et keegi kirjutas
 * seadetesse midagi ootamatut.
 */
export async function overtimeRulesFor(organizationId: number): Promise<OvertimeRules> {
  const rows = await prisma.setting.findMany({
    where: {
      organizationId,
      key: { in: ["overtime_daily_threshold", "overtime_weekly_threshold", "overtime_multiplier"] },
    },
  });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return {
    dailyThreshold: numberOr(settings.overtime_daily_threshold, DEFAULT_OVERTIME_RULES.dailyThreshold),
    weeklyThreshold: numberOr(settings.overtime_weekly_threshold, DEFAULT_OVERTIME_RULES.weeklyThreshold),
    multiplier: numberOr(settings.overtime_multiplier, DEFAULT_OVERTIME_RULES.multiplier),
  };
}

function numberOr(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
