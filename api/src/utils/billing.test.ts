import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateBilling,
  dueDateFrom,
  invoiceTotals,
  nextInvoiceNumber,
  resolveBillableRate,
  type BillableLog,
  type RateSources,
} from "./billing.js";

const H = (hour: number) => new Date(2026, 7, 24, hour, 0, 0);

function sources(partial: Partial<RateSources> = {}): RateSources {
  return {
    objectWorkTypeRates: partial.objectWorkTypeRates ?? new Map(),
    workTypeDefaults: partial.workTypeDefaults ?? new Map(),
    objectDefaults: partial.objectDefaults ?? new Map(),
  };
}

function log(over: Partial<BillableLog> & Pick<BillableLog, "id">): BillableLog {
  return {
    startTime: H(8),
    endTime: H(16),
    lunch: 0,
    objectId: 1,
    workTypeId: null,
    object: { id: 1, name: "Kase 12", clientId: 1, budgetHours: null },
    workType: null,
    user: { hourlyRate: 10 },
    client: { id: 1, name: "Tellija OÜ" },
    ...over,
  };
}

test("objektipõhine tööliigi hind võidab tööliigi vaikehinna", () => {
  const s = sources({
    objectWorkTypeRates: new Map([["1:5", 45]]),
    workTypeDefaults: new Map([[5, 40]]),
    objectDefaults: new Map([[1, 35]]),
  });
  assert.equal(resolveBillableRate(1, 5, s), 45);
});

test("ilma objektipõhise hinnata kehtib tööliigi vaikehind", () => {
  const s = sources({ workTypeDefaults: new Map([[5, 40]]), objectDefaults: new Map([[1, 35]]) });
  assert.equal(resolveBillableRate(1, 5, s), 40);
});

test("ilma tööliigi hinnata kehtib objekti üldhind", () => {
  const s = sources({ objectDefaults: new Map([[1, 35]]) });
  assert.equal(resolveBillableRate(1, 5, s), 35);
});

test("hinna puudumine annab null, mitte nulli", () => {
  // Vahe on oluline: null = seadistamata ja jääb arvelt välja,
  // 0 tähendaks, et töö tehti tasuta.
  assert.equal(resolveBillableRate(1, 5, sources()), null);
  assert.equal(resolveBillableRate(1, null, sources({ objectDefaults: new Map([[1, 0]]) })), 0);
});

test("sama objekti eri tööliigid annavad eraldi read oma hinnaga", () => {
  // Kolm venda lammutavad, üks maalib, üks koristab — kõik ühel objektil.
  const s = sources({
    objectWorkTypeRates: new Map([
      ["1:1", 45],
      ["1:2", 38],
      ["1:3", 25],
    ]),
  });
  const logs = [
    log({ id: 1, workTypeId: 1, workType: { id: 1, name: "Lammutus" }, user: { hourlyRate: 12 } }),
    log({ id: 2, workTypeId: 1, workType: { id: 1, name: "Lammutus" }, user: { hourlyRate: 12 } }),
    log({ id: 3, workTypeId: 1, workType: { id: 1, name: "Lammutus" }, user: { hourlyRate: 12 } }),
    log({ id: 4, workTypeId: 2, workType: { id: 2, name: "Maalritöö" }, user: { hourlyRate: 15 } }),
    log({ id: 5, workTypeId: 3, workType: { id: 3, name: "Koristus" }, user: { hourlyRate: 8 } }),
  ];

  const { clients, totals } = aggregateBilling(logs, s);

  assert.equal(clients.length, 1);
  const object = clients[0].objects[0];
  assert.equal(object.lines.length, 3);

  const demolition = object.lines.find((l) => l.workTypeName === "Lammutus")!;
  assert.equal(demolition.hours, 24); // 3 × 8 h
  assert.equal(demolition.rate, 45);
  assert.equal(demolition.billable, 1080);
  assert.deepEqual(demolition.logIds, [1, 2, 3]);

  // 24×45 + 8×38 + 8×25 = 1080 + 304 + 200
  assert.equal(totals.billable, 1584);
  // kulu: 24×12 + 8×15 + 8×8 = 288 + 120 + 64
  assert.equal(totals.cost, 472);
  assert.equal(totals.margin, 1112);
});

test("sama tellija mitu objekti kogunevad ühe tellija alla", () => {
  const s = sources({ objectDefaults: new Map([[1, 30], [2, 30]]) });
  const logs = [
    log({ id: 1 }),
    log({
      id: 2,
      objectId: 2,
      object: { id: 2, name: "Tamme 5", clientId: 1, budgetHours: null },
    }),
  ];

  const { clients } = aggregateBilling(logs, s);
  assert.equal(clients.length, 1);
  assert.equal(clients[0].objects.length, 2);
  assert.equal(clients[0].hours, 16);
});

test("tellijata objekt jääb eraldi rühma, mitte ei kao ära", () => {
  const logs = [
    log({ id: 1, client: null, object: { id: 9, name: "Ladu", clientId: null, budgetHours: null }, objectId: 9 }),
  ];
  const { clients } = aggregateBilling(logs, sources());
  assert.equal(clients.length, 1);
  assert.equal(clients[0].clientId, null);
  assert.equal(clients[0].unbilledHours, 8);
  assert.equal(clients[0].billable, 0);
});

test("hinnata tunnid loetakse arveldamata tundideks, mitte nullsummaks", () => {
  const s = sources({ objectWorkTypeRates: new Map([["1:1", 45]]) });
  const logs = [
    log({ id: 1, workTypeId: 1, workType: { id: 1, name: "Lammutus" } }),
    log({ id: 2, workTypeId: 2, workType: { id: 2, name: "Koristus" } }),
  ];
  const { clients } = aggregateBilling(logs, s);
  assert.equal(clients[0].unbilledHours, 8);
  assert.equal(clients[0].billable, 360);
});

test("eelarve ületus arvutatakse objekti kohta", () => {
  const logs = [
    log({ id: 1, object: { id: 1, name: "Kase 12", clientId: 1, budgetHours: 5 } }),
  ];
  const { clients } = aggregateBilling(logs, sources());
  assert.equal(clients[0].objects[0].overBudgetHours, 3);
});

test("käibemaks arvutatakse ridade summast", () => {
  const totals = invoiceTotals([{ hours: 24, rate: 45 }, { hours: 8, rate: 38 }], 24);
  assert.equal(totals.subtotal, 1384);
  assert.equal(totals.vatAmount, 332.16);
  assert.equal(totals.total, 1716.16);
});

test("arve number jätkab sama aasta suurimast, tühistatud number ei tule tagasi", () => {
  assert.equal(nextInvoiceNumber([], 2026), "2026-0001");
  assert.equal(nextInvoiceNumber(["2026-0001", "2026-0007", "2025-0099"], 2026), "2026-0008");
  // Aasta vahetudes algab nummerdus otsast.
  assert.equal(nextInvoiceNumber(["2025-0099"], 2026), "2026-0001");
});

test("maksetähtaeg liidab kokkulepitud päevad", () => {
  assert.equal(dueDateFrom("2026-08-26", 14), "2026-09-09");
});
