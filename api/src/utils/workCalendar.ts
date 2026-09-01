import { prisma } from "../prisma.js";
import { estonianHolidays } from "./holidays.js";
import { monthRange, type HolidayLike } from "./timeStats.js";

/**
 * Ettevõtte tööajakalender: riigipühad + ettevõtte enda vabad päevad.
 *
 * Riiklikud pühad arvutatakse koodist (`estonianHolidays`) ja neid ei pea
 * andmebaasi eelnevalt täitma — nii ei teki olukorda, kus uus aasta algab
 * ja normid lähevad vaikselt valeks, sest keegi ei jõudnud pühi sisestada.
 * Andmebaasi `holidays` tabel katab ainult ettevõtte enda erandid.
 */
export async function holidaysForMonth(organizationId: number, reference: Date): Promise<HolidayLike[]> {
  const year = reference.getFullYear();
  const monthPrefix = `${year}-${String(reference.getMonth() + 1).padStart(2, "0")}`;

  const national = estonianHolidays(year).filter((h) => h.date.startsWith(monthPrefix));

  const custom = await prisma.holiday.findMany({
    where: { organizationId, date: { startsWith: monthPrefix } },
    select: { date: true, shortenedHours: true },
  });

  // Ettevõtte kirje samal kuupäeval võidab riikliku (nt firma teeb
  // riigipühal siiski tööd või vastupidi).
  const byDate = new Map<string, HolidayLike>();
  for (const h of national) byDate.set(h.date, { date: h.date, shortenedHours: h.shortenedHours ?? null });
  for (const h of custom) byDate.set(h.date, { date: h.date, shortenedHours: h.shortenedHours ? Number(h.shortenedHours) : null });

  return [...byDate.values()];
}

/**
 * Mitu TÖÖPÄEVA on kasutaja sellest kuust puhkusel/haiguslehel.
 *
 * Loeme ainult E-R päevi ja jätame pühad välja — nädalavahetusele langev
 * puhkusepäev ei vähenda normi, kuna seda seal niikuinii polnud.
 */
export async function absentWorkDaysInMonth(
  userId: number,
  reference: Date,
  holidays: HolidayLike[]
): Promise<number> {
  const { start, end } = monthRange(reference);
  const startStr = toDateString(start);
  const endStr = toDateString(end);

  const absences = await prisma.absence.findMany({
    where: {
      userId,
      // AINULT kinnitatud puudumine vähendab normi. Ootel taotlus ei tohi
      // seda teha — muidu näeks töötaja end kuuülevaates juba puhkusel,
      // kuigi keegi ei ole midagi kinnitanud.
      status: "approved",
      startDate: { lte: endStr },
      endDate: { gte: startStr },
    },
    select: { startDate: true, endDate: true },
  });
  if (absences.length === 0) return 0;

  const fullHolidays = new Set(holidays.filter((h) => !h.shortenedHours).map((h) => h.date));
  const counted = new Set<string>();

  for (const absence of absences) {
    for (const date of eachDate(maxDate(absence.startDate, startStr), minDate(absence.endDate, endStr))) {
      const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (fullHolidays.has(date)) continue;
      counted.add(date); // Set väldib kattuvate puhkuste topeltlugemist.
    }
  }
  return counted.size;
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

function* eachDate(from: string, to: string): Generator<string> {
  const current = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  while (current <= last) {
    yield current.toISOString().slice(0, 10);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}
