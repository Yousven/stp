/**
 * Arvelduse andmete laadimine.
 *
 * Eelvaade (`GET /billing`) ja arve koostamine (`POST /invoices`) peavad
 * vaatama täpselt sama hulka tunde, muidu näeks admin ühte ja klient
 * teist. Seetõttu on päring siin ühes kohas, mitte kummaski marsruudis
 * eraldi.
 */
import { prisma } from "../prisma.js";
import type { BillableLog, RateSources } from "./billing.js";

export interface BillingFilter {
  organizationId: number;
  clientId?: number;
  objectId?: number;
  dateFrom?: string;
  dateTo?: string;
  /** Vaikimisi jäetakse juba arveldatud tunnid välja. */
  includeInvoiced?: boolean;
}

export async function loadBillingData(
  filter: BillingFilter
): Promise<{ logs: BillableLog[]; sources: RateSources }> {
  const { organizationId, clientId, objectId, dateFrom, dateTo, includeInvoiced } = filter;

  const logs = await prisma.timeLog.findMany({
    where: {
      user: { organizationId },
      // Pooleliolev tööpäev ei ole veel arveldatav — lõpetamata tundide
      // arvele panemine tähendaks kliendile töö eest arve esitamist, mis
      // alles käib.
      endTime: { not: null },
      ...(includeInvoiced ? {} : { invoiceId: null }),
      ...(objectId ? { objectId } : {}),
      ...(clientId ? { object: { clientId } } : {}),
      ...(dateFrom || dateTo
        ? {
            startTime: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: {
      object: { include: { client: true } },
      workType: true,
      presenceEvents: true,
      user: { select: { id: true, username: true, hourlyRate: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const objectIds = [...new Set(logs.map((l) => l.objectId))];
  const objectWorkTypes = objectIds.length
    ? await prisma.objectWorkType.findMany({ where: { objectId: { in: objectIds } } })
    : [];
  const workTypes = await prisma.workType.findMany({ where: { organizationId } });

  const sources: RateSources = {
    objectWorkTypeRates: new Map(
      objectWorkTypes.map((row) => [
        `${row.objectId}:${row.workTypeId}`,
        row.rate === null ? null : Number(row.rate),
      ])
    ),
    workTypeDefaults: new Map(
      workTypes.map((t) => [t.id, t.defaultRate === null ? null : Number(t.defaultRate)])
    ),
    objectDefaults: new Map(
      logs.map((l) => [
        l.objectId,
        l.object.billableRate === null ? null : Number(l.object.billableRate),
      ])
    ),
  };

  const billable: BillableLog[] = logs.map((log) => ({
    id: log.id,
    objectId: log.objectId,
    workTypeId: log.workTypeId,
    startTime: log.startTime,
    endTime: log.endTime,
    lunch: log.lunch,
    manualWorkDuration: log.manualWorkDuration,
    presenceEvents: log.presenceEvents,
    object: {
      id: log.object.id,
      name: log.object.name,
      clientId: log.object.clientId,
      budgetHours: log.object.budgetHours,
    },
    workType: log.workType ? { id: log.workType.id, name: log.workType.name } : null,
    user: { hourlyRate: log.user.hourlyRate },
    client: log.object.client ? { id: log.object.client.id, name: log.object.client.name } : null,
  }));

  return { logs: billable, sources };
}
