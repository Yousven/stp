import assert from "node:assert/strict";
import { test } from "node:test";
import { computeWorkedHours } from "./timeStats.js";

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
