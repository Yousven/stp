import assert from "node:assert/strict";
import { test } from "node:test";
import { estonianHolidays } from "./holidays.js";

test("2026 lihavõtted ja neist tuletatud pühad on õigel kuupäeval", () => {
  const holidays = estonianHolidays(2026);
  const byName = new Map(holidays.map((h) => [h.name, h.date]));

  // 2026: lihavõtted on 5. aprillil.
  assert.equal(byName.get("Ülestõusmispühade 1. püha"), "2026-04-05");
  assert.equal(byName.get("Suur reede"), "2026-04-03");
  assert.equal(byName.get("Nelipühade 1. püha"), "2026-05-24");
});

test("2027 lihavõtted (kontrollväärtus teisest aastast)", () => {
  const byName = new Map(estonianHolidays(2027).map((h) => [h.name, h.date]));
  assert.equal(byName.get("Ülestõusmispühade 1. püha"), "2027-03-28");
  assert.equal(byName.get("Suur reede"), "2027-03-26");
});

test("kõik fikseeritud riigipühad on olemas", () => {
  const dates = new Set(estonianHolidays(2026).map((h) => h.date));
  for (const date of [
    "2026-01-01",
    "2026-02-24",
    "2026-05-01",
    "2026-06-23",
    "2026-06-24",
    "2026-08-20",
    "2026-12-24",
    "2026-12-25",
    "2026-12-26",
  ]) {
    assert.ok(dates.has(date), `puudub ${date}`);
  }
});

test("lühendatud tööpäev on püha eelsel päeval", () => {
  const holidays = estonianHolidays(2026);
  const shortened = holidays.filter((h) => h.shortenedHours);
  const dates = shortened.map((h) => h.date);

  assert.ok(dates.includes("2025-12-31"), "uusaasta eelne päev puudub");
  assert.ok(dates.includes("2026-02-23"), "iseseisvuspäeva eelne päev puudub");
  assert.ok(dates.includes("2026-12-23"), "jõululaupäeva eelne päev puudub");
  shortened.forEach((h) => assert.equal(h.shortenedHours, 3));
});

test("lühendatud päeva ei teki, kui see langeb kokku pühaga", () => {
  // 22. juuni on võidupüha eelne päev; 23. juuni on püha ise. Kontrollime,
  // et ükski lühendatud päev ei kattu täispühaga.
  const holidays = estonianHolidays(2026);
  const fullDates = new Set(holidays.filter((h) => !h.shortenedHours).map((h) => h.date));
  const overlapping = holidays.filter((h) => h.shortenedHours && fullDates.has(h.date));
  assert.equal(overlapping.length, 0, `kattuvad: ${overlapping.map((h) => h.date).join(", ")}`);
});
