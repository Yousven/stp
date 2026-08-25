import { prisma } from "../prisma.js";

export interface FieldChange {
  from: unknown;
  to: unknown;
}

/**
 * Kirjutab audit-jälje. Kutsutakse iga käsitsi muudatuse juures, mis
 * mõjutab tunde või ligipääsu.
 *
 * Tagastab võrdluse tulemuse: kui midagi tegelikult ei muutunud, ei
 * kirjutata kirjet (muidu täituks logi tühjade "salvestas, aga ei muutnud"
 * ridadega).
 */
export async function recordAudit(params: {
  organizationId: number;
  actorUserId: number;
  entityType: string;
  entityId: number;
  action: string;
  changes: Record<string, FieldChange>;
  reason?: string;
}): Promise<void> {
  const meaningful = Object.entries(params.changes).filter(([, change]) => !sameValue(change.from, change.to));
  if (meaningful.length === 0) return;

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changes: JSON.stringify(Object.fromEntries(meaningful)),
      reason: params.reason,
    },
  });
}

/**
 * Prisma Decimal, number ja string võivad tähistada sama väärtust ("8",
 * 8, Decimal(8)) — võrdleme normaliseeritult, et mitte logida
 * olematuid muudatusi.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return String(a) === String(b);
}
