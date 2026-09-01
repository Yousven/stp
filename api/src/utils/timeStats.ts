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
  /**
   * Lahtine tööpäev on ületanud usutava pikkuse ja tundide kasv on
   * peatatud. Admini jaoks märk, et see päev vajab käsitsi lõpetamist.
   */
  openLimitReached?: boolean;
  /**
   * Päeva pikkus ületab usutava vahetuse (`MAX_PLAUSIBLE_LOG_HOURS`).
   * Tunde EI ole muudetud — see on ainult märk, et päev vajab kontrolli.
   */
  implausibleLength?: boolean;
}

/**
 * Kui kaua tohib lahtine tööpäev tunde juurde koguda.
 *
 * Kui väljaregistreerimine ununeb ja ükski EXIT ei jõua kohale (telefon
 * välja lülitatud, taustaluba andmata, äppi ei avata), kasvasid tunnid varem
 * piiramatult: üle öö lahti jäänud päev näitas hommikul 22 tundi. Kohalolekut
 * ei tõenda pärast seda piiri enam miski, seega tunde edasi ei loeta.
 *
 * Tööpäeva EI lõpetata automaatselt — server ei hakka kirjutama lõpuaega,
 * mida keegi ei tõendanud. Päev jääb lahti, töötaja saab selle korrektselt
 * lõpetada ja admin näeb märget.
 */
export const MAX_OPEN_LOG_HOURS = 12;

/**
 * Pikkus, millest alates lõpetatud tööpäev vajab halduri pilku.
 *
 * LAHTINE päev peatub 12 tunni peal, aga LÕPETATUD päeva pikkust me ei
 * lõika: käsitsi lõpetamine on töötaja enda kinnitus ja ehituses on 14 h
 * vahetus tavaline. Samas ei ole 20 h vahetus enam usutav — tüüpiliselt
 * tähendab see, et õhtul ununes lõpetamine ja nupp vajutati hommikul.
 *
 * Seetõttu me tunde EI muuda, vaid MÄRGISTAME päeva. Parandamiseks on
 * juba olemas halduri käsitsi muudatus, mis nõuab põhjendust ja läheb
 * audit-logisse — see on õige koht otsustada, mitte automaatne lõikamine,
 * mis kaotaks ausalt tehtud pikad vahetused.
 */
export const MAX_PLAUSIBLE_LOG_HOURS = 16;

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

  // Lõpetatud päev on nii nagu ta on. Lahtine päev loeb tunde kuni praeguse
  // hetkeni, aga mitte kauem kui MAX_OPEN_LOG_HOURS alates algusest.
  const limit = new Date(log.startTime.getTime() + MAX_OPEN_LOG_HOURS * 3600 * 1000);
  const openLimitReached = log.endTime == null && now > limit;
  const end = log.endTime ?? (openLimitReached ? limit : now);
  const gross = hoursBetween(log.startTime, end);

  const events = (log.presenceEvents ?? [])
    .slice()
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Tunde see ei muuda — vt MAX_PLAUSIBLE_LOG_HOURS.
  const implausibleLength = gross > MAX_PLAUSIBLE_LOG_HOURS;

  if (events.length === 0) {
    return {
      net: round2(nonNegative(gross - lunch)),
      gross: round2(gross),
      awayHours: 0,
      openLimitReached,
      implausibleLength,
    };
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
  return {
    net: round2(nonNegative(presentHours - lunch)),
    gross: round2(gross),
    awayHours: round2(awayHours),
    openLimitReached,
    implausibleLength,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Töötatud tunde ei saa olla vähem kui null.
 *
 * Lõuna lahutatakse kohalolekust, aga miski ei taganud, et lõuna oleks
 * kohalolekust lühem: nelja minuti pikkusele tööpäevale märgitud 30 min
 * lõunat andis -0,43 h. See läks otse kuu kokkuvõttesse ja sealt palka —
 * negatiivsed teenitud eurod. Liiga pikk lõuna tähendab, et lõuna on
 * valesti sisestatud, mitte et töötaja võlgneb tööandjale aega.
 */
function nonNegative(hours: number): number {
  return Math.max(hours, 0);
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

// --- Praegune kohalolek ---

export interface PresenceState {
  /** Kas töötaja on viimase sündmuse järgi praegu objektil. */
  onSite: boolean;
  /** Millal praegune olek algas (viimane sündmus või tööpäeva algus). */
  since: Date;
  /** Millal viimane kohalolekut kinnitav signaal seadmelt tuli. */
  lastEventAt: Date | null;
  /**
   * Objektil viibitud aeg ENNE praeguse oleku algust, millisekundites.
   *
   * Telefon näitab selle põhjal kella, mis peatub koos kohalolekuga:
   * objektil olles `presentMsBefore + (praegu - since)`, eemal olles ainult
   * `presentMsBefore`. Ilma selleta loeks ekraanil olev kell tööpäeva
   * algusest edasi ka siis, kui kaart on juba punane ja tunde tegelikult
   * juurde ei tule.
   */
  presentMsBefore: number;
}

/**
 * Tööpäeva praegune kohaloleku olek.
 *
 * Tööpäeva algus on kaudne ENTER, seega sündmusteta logi tähendab "kohal" —
 * sama eeldus mis `computeWorkedHours`-is, et kaks vaadet ei läheks lahku.
 *
 * Seda kasutab nii admini ülevaade ("kes on praegu objektil") kui telefon,
 * mis seab siit oma lähteoleku. Ilma serveri-poolse lähteolekuta ei tea
 * telefon esimesel kontrollil, kas olek muutus, ja jätab EXIT-i saatmata.
 */
export function presenceState(log: WorkLogLike): PresenceState {
  const events = (log.presenceEvents ?? [])
    .slice()
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Sama käik nagu computeWorkedHours-is: tööpäeva algus on kaudne ENTER.
  let insideSince: Date | null = log.startTime;
  let lastExit: Date | null = null;
  let lastEventAt: Date | null = null;
  let presentMsBefore = 0;

  for (const event of events) {
    if (event.occurredAt < log.startTime) continue;
    lastEventAt = event.occurredAt;

    if (event.type === "EXIT" && insideSince !== null) {
      presentMsBefore += event.occurredAt.getTime() - insideSince.getTime();
      insideSince = null;
      lastExit = event.occurredAt;
    } else if (event.type === "ENTER" && insideSince === null) {
      insideSince = event.occurredAt;
    }
  }

  if (insideSince !== null) {
    return { onSite: true, since: insideSince, lastEventAt, presentMsBefore };
  }
  return { onSite: false, since: lastExit ?? log.startTime, lastEventAt, presentMsBefore };
}
