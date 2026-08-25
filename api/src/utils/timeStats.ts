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
