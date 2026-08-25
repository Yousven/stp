import assert from "node:assert/strict";
import { test } from "node:test";
import { __testing } from "./reminders.js";

const { deadlineMinutes, dayBounds } = __testing;

test("tähtaja string teisendatakse minutiteks", () => {
  assert.equal(deadlineMinutes("09:00:00"), 540);
  assert.equal(deadlineMinutes("18:30:00"), 1110);
  assert.equal(deadlineMinutes("00:00"), 0);
  assert.equal(deadlineMinutes("23:59"), 1439);
});

test("päeva piirid katavad kohaliku ööpäeva (suveaeg, UTC+3)", () => {
  // Europe/Tallinn on augustis UTC+3, seega kohalik 00:00 on 21:00 UTC eelmisel päeval.
  const { start, end } = dayBounds("2026-08-25");
  assert.equal(start.toISOString(), "2026-08-24T21:00:00.000Z");
  assert.equal(end.toISOString(), "2026-08-25T20:59:59.999Z");
});

test("päeva piirid arvestavad talveaega (UTC+2)", () => {
  // Jaanuaris on Tallinn UTC+2, seega kohalik 00:00 on 22:00 UTC eelmisel päeval.
  // Kui see test katki läheb, on ajavööndi käsitlus fikseeritud nihkeks muutunud.
  const { start } = dayBounds("2026-01-15");
  assert.equal(start.toISOString(), "2026-01-14T22:00:00.000Z");
});

test("päeva piirid on täpselt ühe ööpäeva pikkused", () => {
  const { start, end } = dayBounds("2026-08-25");
  const hours = (end.getTime() - start.getTime()) / 3600000;
  assert.ok(Math.abs(hours - 24) < 0.001, `oodati ~24h, saadi ${hours}`);
});
