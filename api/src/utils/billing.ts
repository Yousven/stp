/**
 * Kliendiarvelduse arvutus.
 *
 * Sama tunniandmestik, mis toidab palgaarvestust, aga teisest otsast
 * vaadatuna: mida objektile kulus (töötajate palgamäärade järgi) ja mida
 * saab tellijalt küsida (kliendihinna järgi). Vahe on kate.
 *
 * Siin ei ole päringuid — funktsioonid on puhtad, et arvelduse eelvaade ja
 * arve koostamine kasutaksid täpselt sama loogikat. Kui need kaks lahku
 * läheksid, näeks admin eelvaates ühte summat ja klient arvel teist.
 */
import { computeWorkedHours, type WorkLogLike } from "./timeStats.js";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Hinnaallikad, mille põhjal tunnihind valitakse. */
export interface RateSources {
  /** Objektipõhine tööliigi hind, võti `${objectId}:${workTypeId}`. */
  objectWorkTypeRates: Map<string, number | null>;
  /** Tööliigi vaikehind. */
  workTypeDefaults: Map<number, number | null>;
  /** Objekti üldine hind, kui tööliigil oma hinda pole. */
  objectDefaults: Map<number, number | null>;
}

/**
 * Tunnihinna valik, tugevamast nõrgemani:
 *
 * 1. selle objekti selle tööliigi hind — "Kase 12 lammutus 45 €/h"
 * 2. tööliigi vaikehind — "lammutus üldiselt 40 €/h"
 * 3. objekti üldhind — "kõik tööd sellel objektil 35 €/h"
 * 4. `null` = arveldusmäär puudub
 *
 * Neljas juhtum EI ole null eurot. Tunnid jäetakse arvelt välja ja
 * loetakse eraldi `unbilledHours` alla, sest puuduv seadistus ei tohi
 * vaikselt muutuda tasuta tehtud tööks.
 */
export function resolveBillableRate(
  objectId: number,
  workTypeId: number | null,
  sources: RateSources
): number | null {
  if (workTypeId !== null) {
    const own = sources.objectWorkTypeRates.get(`${objectId}:${workTypeId}`);
    if (own !== undefined && own !== null) return own;

    const fallback = sources.workTypeDefaults.get(workTypeId);
    if (fallback !== undefined && fallback !== null) return fallback;
  }

  const objectRate = sources.objectDefaults.get(objectId);
  return objectRate === undefined ? null : objectRate;
}

/** Töölogi tunnid: käsitsi määratud väärtus võidab arvutatu. */
export function hoursForLog(log: WorkLogLike & { manualWorkDuration?: unknown }): number {
  const manual = log.manualWorkDuration;
  if (manual !== null && manual !== undefined) return Number(manual);
  return computeWorkedHours(log).net;
}

export interface BillableLog extends WorkLogLike {
  id: number;
  objectId: number;
  workTypeId: number | null;
  manualWorkDuration?: unknown;
  object: { id: number; name: string; clientId: number | null; budgetHours: unknown };
  workType: { id: number; name: string } | null;
  user: { hourlyRate: unknown };
  client: { id: number; name: string } | null;
}

export interface AggregatedLine {
  objectId: number;
  objectName: string;
  workTypeId: number | null;
  workTypeName: string | null;
  hours: number;
  rate: number | null;
  billable: number;
  cost: number;
  /** Millistest töölogidest rida koosneb — arve märgib täpselt need ära. */
  logIds: number[];
}

export interface AggregatedObject {
  objectId: number;
  objectName: string;
  budgetHours: number | null;
  overBudgetHours: number | null;
  hours: number;
  cost: number;
  billable: number;
  unbilledHours: number;
  lines: AggregatedLine[];
}

export interface AggregatedClient {
  clientId: number | null;
  clientName: string | null;
  hours: number;
  cost: number;
  billable: number;
  margin: number;
  unbilledHours: number;
  objects: AggregatedObject[];
}

export interface AggregatedTotals {
  hours: number;
  cost: number;
  billable: number;
  margin: number;
  unbilledHours: number;
}

/**
 * Grupeerib töölogid tellija → objekti → tööliigi kaupa.
 *
 * Tellija tasand on kõige pealmine, sest arve esitatakse ettevõttele, mitte
 * objektile: sama tellija mitme objekti tunnid peavad saama ühele arvele.
 * Tellijata objektid kogunevad ühte `clientId: null` rühma, et need ei
 * kaoks vaikselt ära — need on tavaliselt just need, mis on seadistamata.
 */
export function aggregateBilling(
  logs: BillableLog[],
  sources: RateSources
): { clients: AggregatedClient[]; totals: AggregatedTotals } {
  const clients = new Map<number | null, AggregatedClient>();
  const objects = new Map<string, AggregatedObject>();
  const lines = new Map<string, AggregatedLine>();

  for (const log of logs) {
    const hours = hoursForLog(log);
    if (hours <= 0) continue;

    const clientId = log.client?.id ?? null;
    const clientKey = clientId;
    const objectKey = `${clientKey}:${log.objectId}`;
    const lineKey = `${objectKey}:${log.workTypeId ?? "none"}`;

    const rate = resolveBillableRate(log.objectId, log.workTypeId, sources);
    const billable = rate === null ? 0 : hours * rate;
    const cost = hours * Number(log.user.hourlyRate);

    let client = clients.get(clientKey);
    if (!client) {
      client = {
        clientId,
        clientName: log.client?.name ?? null,
        hours: 0,
        cost: 0,
        billable: 0,
        margin: 0,
        unbilledHours: 0,
        objects: [],
      };
      clients.set(clientKey, client);
    }

    let object = objects.get(objectKey);
    if (!object) {
      const budget = log.object.budgetHours;
      object = {
        objectId: log.objectId,
        objectName: log.object.name,
        budgetHours: budget === null || budget === undefined ? null : Number(budget),
        overBudgetHours: null,
        hours: 0,
        cost: 0,
        billable: 0,
        unbilledHours: 0,
        lines: [],
      };
      objects.set(objectKey, object);
      client.objects.push(object);
    }

    let line = lines.get(lineKey);
    if (!line) {
      line = {
        objectId: log.objectId,
        objectName: log.object.name,
        workTypeId: log.workTypeId,
        workTypeName: log.workType?.name ?? null,
        hours: 0,
        rate,
        billable: 0,
        cost: 0,
        logIds: [],
      };
      lines.set(lineKey, line);
      object.lines.push(line);
    }

    line.hours += hours;
    line.billable += billable;
    line.cost += cost;
    line.logIds.push(log.id);

    object.hours += hours;
    object.cost += cost;
    object.billable += billable;
    if (rate === null) object.unbilledHours += hours;

    client.hours += hours;
    client.cost += cost;
    client.billable += billable;
    if (rate === null) client.unbilledHours += hours;
  }

  const result = [...clients.values()].map((client) => ({
    ...client,
    hours: round2(client.hours),
    cost: round2(client.cost),
    billable: round2(client.billable),
    margin: round2(client.billable - client.cost),
    unbilledHours: round2(client.unbilledHours),
    objects: client.objects.map((object) => ({
      ...object,
      hours: round2(object.hours),
      cost: round2(object.cost),
      billable: round2(object.billable),
      unbilledHours: round2(object.unbilledHours),
      overBudgetHours:
        object.budgetHours === null ? null : round2(Math.max(object.hours - object.budgetHours, 0)),
      lines: object.lines.map((line) => ({
        ...line,
        hours: round2(line.hours),
        billable: round2(line.billable),
        cost: round2(line.cost),
      })),
    })),
  }));

  const totals = result.reduce<AggregatedTotals>(
    (acc, c) => ({
      hours: round2(acc.hours + c.hours),
      cost: round2(acc.cost + c.cost),
      billable: round2(acc.billable + c.billable),
      margin: round2(acc.margin + c.margin),
      unbilledHours: round2(acc.unbilledHours + c.unbilledHours),
    }),
    { hours: 0, cost: 0, billable: 0, margin: 0, unbilledHours: 0 }
  );

  return { clients: result, totals };
}

/**
 * Arve summad. Käibemaks arvutatakse ridade summast, mitte rea kaupa —
 * rea kaupa ümardamine annaks sendi jagu erineva tulemuse kui klient ise
 * kokku liidab.
 */
export function invoiceTotals(
  lines: { hours: number; rate: number }[],
  vatRatePercent: number
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.hours * l.rate, 0));
  const vatAmount = round2((subtotal * vatRatePercent) / 100);
  return { subtotal, vatAmount, total: round2(subtotal + vatAmount) };
}

/**
 * Järgmine arve number kujul "AASTA-JRK", nt "2026-0007".
 *
 * Number peab olema katkematu ja korduvkasutuseta, seega tuletatakse see
 * sama aasta seniste numbrite maksimumist, mitte arvete arvust —
 * tühistatud arve number jääb kasutusele ja ei tule kunagi teist korda.
 */
export function nextInvoiceNumber(existingNumbers: string[], year: number): string {
  const prefix = `${year}-`;
  const highest = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/** Maksetähtaeg: arve kuupäev + kokkulepitud päevade arv. */
export function dueDateFrom(issueDate: string, paymentTermDays: number): string {
  const date = new Date(`${issueDate}T00:00:00`);
  date.setDate(date.getDate() + paymentTermDays);
  return date.toLocaleDateString("sv-SE");
}
