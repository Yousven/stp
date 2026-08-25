import assert from "node:assert/strict";
import { test } from "node:test";
import { messagesFor, pickLanguage } from "./messages.js";

test("puuduv Accept-Language annab eesti keele", () => {
  assert.equal(pickLanguage(undefined), "et");
  assert.equal(pickLanguage(""), "et");
});

test("lihtne keelesilt tuvastatakse", () => {
  assert.equal(pickLanguage("ru"), "ru");
  assert.equal(pickLanguage("uk-UA"), "uk");
  assert.equal(pickLanguage("en-GB"), "en");
});

test("kvaliteedikaal otsustab, mitte järjekord päises", () => {
  // Brauser võib saata eelistuse q-väärtusega, mitte esimesena.
  assert.equal(pickLanguage("de;q=0.9,ru;q=1.0"), "ru");
  assert.equal(pickLanguage("fr,ru;q=0.8,en;q=0.9"), "en");
});

test("toetamata keel langeb eesti keelele, mitte tühjale teatele", () => {
  assert.equal(pickLanguage("de-DE,fr;q=0.9"), "et");
});

test("vigane q-väärtus ei lõhu valikut", () => {
  assert.equal(pickLanguage("ru;q=abc,en"), "en");
});

test("igas keeles on kõik teated olemas ja mittetühjad", () => {
  // Sõnastikud on typitud, aga tühi string läheks tüübist läbi ja
  // jõuaks kasutajani tühja veateatena.
  for (const lang of ["et", "en", "ru", "uk"] as const) {
    const m = messagesFor(lang);
    walk(m, [lang]);
  }
});

function walk(value: unknown, path: string[]): void {
  if (typeof value === "string") {
    assert.ok(value.trim().length > 0, `tühi teade: ${path.join(".")}`);
    return;
  }
  if (typeof value === "function") {
    // Funktsioonteated saavad näidisargumendid, et ka nende väljund
    // saaks kontrollitud.
    const produced = (value as (...args: unknown[]) => string)(1, 2);
    assert.equal(typeof produced, "string");
    assert.ok(produced.trim().length > 0, `tühi teade: ${path.join(".")}`);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    walk(child, [...path, key]);
  }
}

test("kaugusteade sisaldab mõlemat arvu igas keeles", () => {
  for (const lang of ["et", "en", "ru", "uk"] as const) {
    const text = messagesFor(lang).timeLogs.tooFar(153, 200);
    assert.ok(text.includes("153"), `${lang}: kaugus puudub`);
    assert.ok(text.includes("200"), `${lang}: lubatud raadius puudub`);
  }
});
