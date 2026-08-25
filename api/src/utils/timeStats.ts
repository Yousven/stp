export interface HolidayLike {
  date: string; // YYYY-MM-DD
  shortenedHours?: number | null;
}

/**
 * Kuu normtunnid.
 *
 * Port dashboard.php arvutusest (tööpäevad E-R × 8), aga riigipühade võrra
 * korrigeerituna: püha kaotab terve 8-tunnise päeva, lühendatud tööpäev
 * lahutab ainult oma tundide arvu. Ilma selleta oli norm Eestis
 * süstemaatiliselt liiga kõrge (12 riigipüha aastas).
 *
 * `absentDays` — töötaja puhkuse-/haiguspäevad selles kuus, mis samuti
 * normi vähendavad, et puhkusel olija ei näeks välja alatäitjana.
 */
export function monthlyTargetHours(
  referenceDate: Date = new Date(),
  holidays: HolidayLike[] = [],
  absentWorkDays = 0
): number {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));

  let hours = 0;
  for (let day = 1; day <= lastDay; day++) {
    const current = new Date(year, month, day);
    const dayOfWeek = current.getDay(); // 0=Sun..6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const holiday = holidayByDate.get(key);

    if (!holiday) {
      hours += 8;
    } else if (holiday.shortenedHours) {
      // Lühendatud tööpäev: normist läheb maha ainult lühenduse jagu.
      hours += Math.max(8 - Number(holiday.shortenedHours), 0);
    }
    // Täispüha: 0 tundi, ei liideta midagi.
  }

  return Math.max(hours - absentWorkDays * 8, 0);
}

export function monthRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 1000 / 3600;
}

export interface PresenceEventLike {
  type: string; // "ENTER" | "EXIT"
  occurredAt: Date;
}

export interface WorkLogLike {
  startTime: Date;
  endTime: Date | null;
  lunch: unknown; // Prisma Decimal | number | null
  presenceEvents?: PresenceEventLike[];
}

export interface WorkedHours {
  /** Kohal viibitud tunnid (lõuna maha arvatud) — see läheb palgaarvestusse. */
  net: number;
  /** Kogu tööpäeva kestus algusest lõpuni, sõltumata kohalolekust. */
  gross: number;
  /** Aeg, mil töötaja oli tööpäeva jooksul objektist väljas. */
  awayHours: number;
}

/**
 * Arvutab tööpäeva tunnid kohaloleku sündmuste põhjal: ENTER→EXIT
 * intervallide summa, kus sisseregistreerimine on kaudne ENTER ja
 * väljaregistreerimine kaudne EXIT.
 *
 * Kui logil pole ühtegi sündmust (kõik enne Faas 4 loodud kirjed, ja ka
 * uued kirjed seni kuni natiivne jälgimine pole seadmes aktiivne), langeb
 * tagasi vanale `end - start - lunch` valemile, et ajalugu ei muutuks
 * tagantjärele.
 */
export function computeWorkedHours(log: WorkLogLike, now: Date = new Date()): WorkedHours {
  const lunch = Number(log.lunch ?? 0);
  const end = log.endTime ?? now;
  const gross = hoursBetween(log.startTime, end);

  const events = (log.presenceEvents ?? [])
    .slice()
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  if (events.length === 0) {
    return { net: round2(gross - lunch), gross: round2(gross), awayHours: 0 };
  }

  let presentHours = 0;
  // Tööpäeva algus tähendab alati kohalolekut, ka siis kui esimene
  // salvestatud sündmus juhtub olema EXIT.
  let insideSince: Date | null = log.startTime;

  for (const event of events) {
    // Ignoreeri sündmusi väljaspool tööpäeva akent — kaitse segaste
    // andmete eest (nt hilinenud natiivne sündmus pärast clock-out'i).
    if (event.occurredAt < log.startTime || event.occurredAt > end) continue;

    if (event.type === "EXIT" && insideSince !== null) {
      presentHours += hoursBetween(insideSince, event.occurredAt);
      insideSince = null;
    } else if (event.type === "ENTER" && insideSince === null) {
      insideSince = event.occurredAt;
    }
  }

  if (insideSince !== null) {
    presentHours += hoursBetween(insideSince, end);
  }

  const awayHours = Math.max(gross - presentHours, 0);
  return { net: round2(presentHours - lunch), gross: round2(gross), awayHours: round2(awayHours) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Ületunnid ---

export interface OvertimeRules {
  /** Üle mitme tunni päevas läheb ületunniks (0 = reegel välja lülitatud). */
  dailyThreshold: number;
  /** Üle mitme tunni nädalas läheb ületunniks (0 = välja lülitatud). */
  weeklyThreshold: number;
  /** Kordaja, TÖS § 44 järgi 1,5. */
  multiplier: number;
}

export const DEFAULT_OVERTIME_RULES: OvertimeRules = {
  dailyThreshold: 8,
  weeklyThreshold: 40,
  multiplier: 1.5,
};

export interface DayHours {
  /** YYYY-MM-DD kohalikus ajavööndis. */
  date: string;
  hours: number;
}

export interface OvertimeBreakdown {
  regularHours: number;
  overtimeHours: number;
  /** Tasustatavad tunnid kordajaga: regular + overtime × multiplier. */
  payableHours: number;
}

/**
 * Jagab töötatud tunnid tava- ja ületundideks.
 *
 * Mõlemad reeglid (päeva- ja nädalapõhine) võivad korraga kehtida, kuna
 * ettevõtted lepivad erinevalt kokku. Sel juhul EI liideta neid kokku —
 * võetakse suurem, muidu loetaks sama tund kaks korda ületunniks
 * (nt 12 h ühel päeval ületab nii päeva- kui nädalanormi).
 *
 * Nädalad algavad esmaspäeval (ISO), nagu Eestis tavaks.
 */
export function splitOvertime(days: DayHours[], rules: OvertimeRules = DEFAULT_OVERTIME_RULES): OvertimeBreakdown {
  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

  let dailyOvertime = 0;
  if (rules.dailyThreshold > 0) {
    dailyOvertime = days.reduce((sum, d) => sum + Math.max(d.hours - rules.dailyThreshold, 0), 0);
  }

  let weeklyOvertime = 0;
  if (rules.weeklyThreshold > 0) {
    const byWeek = new Map<string, number>();
    for (const day of days) {
      const key = isoWeekKey(day.date);
      byWeek.set(key, (byWeek.get(key) ?? 0) + day.hours);
    }
    for (const weekHours of byWeek.values()) {
      weeklyOvertime += Math.max(weekHours - rules.weeklyThreshold, 0);
    }
  }

  const overtimeHours = round2(Math.min(Math.max(dailyOvertime, weeklyOvertime), totalHours));
  const regularHours = round2(totalHours - overtimeHours);

  return {
    regularHours,
    overtimeHours,
    payableHours: round2(regularHours + overtimeHours * rules.multiplier),
  };
}

/** ISO nädala võti kujul "2026-W35" — nädal algab esmaspäeval. */
export function isoWeekKey(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay() || 7; // pühapäev 0 -> 7
  date.setUTCDate(date.getUTCDate() + 4 - day); // liigu nädala neljapäevale
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
