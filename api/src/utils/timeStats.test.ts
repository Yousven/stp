import assert from "node:assert/strict";
import { test } from "node:test";
import { computeWorkedHours, monthlyTargetHours, splitOvertime, isoWeekKey } from "./timeStats.js";

const H = (hour: number, minute = 0) => new Date(2026, 7, 24, hour, minute, 0);

test("sündmusteta logi kasutab vana valemit (end - start - lunch)", () => {
  const result = computeWorkedHours({ startTime: H(8), endTime: H(17), lunch: 1 });
  assert.equal(result.net, 8);
  assert.equal(result.gross, 9);
  assert.equal(result.awayHours, 0);
});

test("ühe äraolekuga tööpäev arvestab ainult kohaloleku aja", () => {
  // 8:00-17:00 tööpäev, 12:00-13:00 objektilt eemal, 0.5 h lõuna
  const result = computeWorkedHours({
    startTime: H(8),
    endTime: H(17),
    lunch: 0.5,
    presenceEvents: [
      { type: "ENTER", occurredAt: H(8) },
      { type: "EXIT", occurredAt: H(12) },
      { type: "ENTER", occurredAt: H(13) },
      { type: "EXIT", occurredAt: H(17) },
    ],
  });
  assert.equal(result.gross, 9);
  assert.equal(result.awayHours, 1);
  assert.equal(result.net, 7.5); // 8 h kohal - 0.5 h lõuna
});

test("mitu äraolekut liidetakse kokku", () => {
  const result = computeWorkedHours({
    startTime: H(8),
    endTime: H(16),
    lunch: 0,
    presenceEvents: [
      { type: "EXIT", occurredAt: H(10) },
      { type: "ENTER", occurredAt: H(10, 30) },
      { type: "EXIT", occurredAt: H(14) },
      { type: "ENTER", occurredAt: H(15) },
    ],
  });
  assert.equal(result.awayHours, 1.5);
  assert.equal(result.net, 6.5);
});

test("lõpetamata äraolek loeb kuni tööpäeva lõpuni", () => {
  // Lahkus 15:00 ja ei naasnud enne clock-out'i 17:00
  const result = computeWorkedHours({
    startTime: H(8),
    endTime: H(17),
    lunch: 0,
    presenceEvents: [{ type: "EXIT", occurredAt: H(15) }],
  });
  assert.equal(result.net, 7);
  assert.equal(result.awayHours, 2);
});

test("tööpäeva aknast väljas olevaid sündmusi ignoreeritakse", () => {
  // Hilinenud natiivne sündmus pärast clock-out'i ei tohi tunde muuta
  const result = computeWorkedHours({
    startTime: H(8),
    endTime: H(16),
    lunch: 0,
    presenceEvents: [
      { type: "EXIT", occurredAt: H(18) },
      { type: "ENTER", occurredAt: H(7) },
    ],
  });
  assert.equal(result.net, 8);
  assert.equal(result.awayHours, 0);
});

test("korduvad sama tüüpi sündmused ei topeltarvesta", () => {
  // Kaks järjestikust EXIT-i (nt GPS võbeles piiril) loevad ühe lahkumisena
  const result = computeWorkedHours({
    startTime: H(8),
    endTime: H(12),
    lunch: 0,
    presenceEvents: [
      { type: "EXIT", occurredAt: H(9) },
      { type: "EXIT", occurredAt: H(10) },
      { type: "ENTER", occurredAt: H(11) },
    ],
  });
  assert.equal(result.net, 2); // 8-9 kohal + 11-12 kohal
  assert.equal(result.awayHours, 2);
});

test("aktiivne (lõpetamata) tööpäev arvestab kuni praeguse hetkeni", () => {
  const now = H(12);
  const result = computeWorkedHours(
    { startTime: H(8), endTime: null, lunch: 0, presenceEvents: [{ type: "ENTER", occurredAt: H(8) }] },
    now
  );
  assert.equal(result.net, 4);
});

// --- Kuu normtunnid ---

test("kuu norm ilma pühadeta = tööpäevad × 8", () => {
  // August 2026: 21 tööpäeva (E-R).
  const target = monthlyTargetHours(new Date(2026, 7, 15), []);
  assert.equal(target, 21 * 8);
});

test("riigipüha vähendab normi terve päeva võrra", () => {
  // 20. august 2026 on neljapäev (taasiseseisvumispäev).
  const target = monthlyTargetHours(new Date(2026, 7, 15), [{ date: "2026-08-20" }]);
  assert.equal(target, 20 * 8);
});

test("nädalavahetusele langev püha ei muuda normi", () => {
  // 23. august 2026 on pühapäev — ei olnud niikuinii tööpäev.
  const target = monthlyTargetHours(new Date(2026, 7, 15), [{ date: "2026-08-23" }]);
  assert.equal(target, 21 * 8);
});

test("lühendatud tööpäev lahutab ainult lühenduse jagu", () => {
  const target = monthlyTargetHours(new Date(2026, 7, 15), [{ date: "2026-08-20", shortenedHours: 3 }]);
  assert.equal(target, 21 * 8 - 3);
});

test("puhkusepäevad vähendavad normi", () => {
  const target = monthlyTargetHours(new Date(2026, 7, 15), [], 5);
  assert.equal(target, 21 * 8 - 5 * 8);
});

test("norm ei lähe kunagi negatiivseks", () => {
  const target = monthlyTargetHours(new Date(2026, 7, 15), [], 100);
  assert.equal(target, 0);
});

// --- Ületunnid ---

const RULES_DAILY = { dailyThreshold: 8, weeklyThreshold: 0, multiplier: 1.5 };
const RULES_WEEKLY = { dailyThreshold: 0, weeklyThreshold: 40, multiplier: 1.5 };
const RULES_BOTH = { dailyThreshold: 8, weeklyThreshold: 40, multiplier: 1.5 };

test("päevareegel: üle 8h läheb ületunniks", () => {
  const r = splitOvertime([{ date: "2026-08-24", hours: 10 }], RULES_DAILY);
  assert.equal(r.regularHours, 8);
  assert.equal(r.overtimeHours, 2);
  assert.equal(r.payableHours, 8 + 2 * 1.5);
});

test("päevareegel: alla 8h ei tekita ületundi", () => {
  const r = splitOvertime([{ date: "2026-08-24", hours: 6 }], RULES_DAILY);
  assert.equal(r.overtimeHours, 0);
  assert.equal(r.payableHours, 6);
});

test("nädalareegel: 5 × 9h = 45h, ületund 5h", () => {
  // 24.-28. august 2026 on E-R samas ISO nädalas.
  const days = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"].map((date) => ({
    date,
    hours: 9,
  }));
  const r = splitOvertime(days, RULES_WEEKLY);
  assert.equal(r.overtimeHours, 5);
  assert.equal(r.regularHours, 40);
});

test("mõlemad reeglid koos EI topeltarvesta sama tundi", () => {
  // Üks 12h päev: päevareegel annab 4h, nädalareegel 0h (kokku 12 < 40).
  // Tulemus peab olema 4, mitte 4+0 kahekordselt ega summa.
  const r = splitOvertime([{ date: "2026-08-24", hours: 12 }], RULES_BOTH);
  assert.equal(r.overtimeHours, 4);
  assert.equal(r.regularHours, 8);
});

test("mõlemad reeglid: võetakse suurem, mitte summa", () => {
  // 6 × 9h = 54h nädalas. Päevareegel: 6×1 = 6h. Nädalareegel: 54-40 = 14h.
  // Õige vastus on 14 (suurem), mitte 20 (summa).
  const days = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29"].map((date) => ({
    date,
    hours: 9,
  }));
  const r = splitOvertime(days, RULES_BOTH);
  assert.equal(r.overtimeHours, 14);
});

test("ületund ei saa ületada töötatud tunde", () => {
  const r = splitOvertime([{ date: "2026-08-24", hours: 3 }], RULES_BOTH);
  assert.ok(r.overtimeHours <= 3);
  assert.equal(r.regularHours + r.overtimeHours, 3);
});

test("eri nädalad arvestatakse eraldi", () => {
  // 5 × 8h ühel nädalal + 5 × 8h järgmisel = kumbki täpselt 40h, ületundi pole.
  const week1 = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"];
  const week2 = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];
  const days = [...week1, ...week2].map((date) => ({ date, hours: 8 }));
  const r = splitOvertime(days, RULES_WEEKLY);
  assert.equal(r.overtimeHours, 0, "80h üle kahe nädala ei tohi ületundi anda");
});

test("ISO nädal: pühapäev kuulub eelmisse nädalasse", () => {
  // 30. august 2026 on pühapäev, 31. esmaspäev — eri nädalad.
  assert.equal(isoWeekKey("2026-08-24"), isoWeekKey("2026-08-30"), "E ja P on samas ISO nädalas");
  assert.notEqual(isoWeekKey("2026-08-30"), isoWeekKey("2026-08-31"), "P ja järgmine E on eri nädalates");
});
