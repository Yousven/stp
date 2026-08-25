/**
 * Eesti riigipühad.
 *
 * Enamik on fikseeritud kuupäevaga; ülestõusmispühad ja nelipühad sõltuvad
 * lihavõtetest, mis arvutatakse Gaussi algoritmiga. Suur reede ja
 * ülestõusmispühade 1. püha on riigipühad, nelipühade 1. püha samuti.
 *
 * Lühendatud tööpäevad (TÖS § 53): uusaastale, Eesti Vabariigi aastapäevale,
 * võidupühale ja jõululaupäevale eelnev tööpäev on 3 tundi lühem.
 */

export interface HolidayDefinition {
  date: string; // YYYY-MM-DD
  name: string;
  shortenedHours?: number;
}

/** Lihavõttepüha (gregoriaani kalender) — Anonymous Gregorian algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Eelnev päev — lühendatud tööpäeva märkimiseks. */
function dayBefore(dateStr: string): string {
  return iso(addDays(new Date(`${dateStr}T00:00:00Z`), -1));
}

export function estonianHolidays(year: number): HolidayDefinition[] {
  const easter = easterSunday(year);

  const fixed: HolidayDefinition[] = [
    { date: `${year}-01-01`, name: "Uusaasta" },
    { date: `${year}-02-24`, name: "Iseseisvuspäev" },
    { date: `${year}-05-01`, name: "Kevadpüha" },
    { date: `${year}-06-23`, name: "Võidupüha" },
    { date: `${year}-06-24`, name: "Jaanipäev" },
    { date: `${year}-08-20`, name: "Taasiseseisvumispäev" },
    { date: `${year}-12-24`, name: "Jõululaupäev" },
    { date: `${year}-12-25`, name: "Esimene jõulupüha" },
    { date: `${year}-12-26`, name: "Teine jõulupüha" },
  ];

  const movable: HolidayDefinition[] = [
    { date: iso(addDays(easter, -2)), name: "Suur reede" },
    { date: iso(easter), name: "Ülestõusmispühade 1. püha" },
    { date: iso(addDays(easter, 49)), name: "Nelipühade 1. püha" },
  ];

  // Lühendatud tööpäevad: 3 tundi lühem tööpäev enne neid pühi.
  const shortened: HolidayDefinition[] = [
    { date: dayBefore(`${year}-01-01`), name: "Lühendatud tööpäev (uusaasta eel)", shortenedHours: 3 },
    { date: dayBefore(`${year}-02-24`), name: "Lühendatud tööpäev (iseseisvuspäeva eel)", shortenedHours: 3 },
    { date: dayBefore(`${year}-06-23`), name: "Lühendatud tööpäev (võidupüha eel)", shortenedHours: 3 },
    { date: dayBefore(`${year}-12-24`), name: "Lühendatud tööpäev (jõululaupäeva eel)", shortenedHours: 3 },
  ];

  const all = [...fixed, ...movable, ...shortened];

  // Kui lühendatud päev satub pühale endale, kaotab lühendus mõtte.
  const fullHolidays = new Set([...fixed, ...movable].map((h) => h.date));
  return all.filter((h) => !(h.shortenedHours && fullHolidays.has(h.date)));
}
