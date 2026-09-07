import { runAsync } from "../db/query";

export type AccountingAuditActor = {
  userId?: number | null;
  username?: string | null;
  role?: string | null;
};

export type AccountingAuditEventInput = {
  eventType: string;
  entityType: string;
  entityId?: number | null;
  accountType?: "partner" | "customer" | "system" | null;
  accountId?: number | null;
  actor?: AccountingAuditActor | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  source?: string | null;
};

const safeJson = (value: unknown): string | null => {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ serializationError: true });
  }
};

export const recordAccountingAuditEvent = async (
  input: AccountingAuditEventInput,
): Promise<void> => {
  await runAsync(
    `INSERT INTO accounting_audit_events
      (eventType, entityType, entityId, accountType, accountId,
       actorUserId, actorUsername, actorRole, reason, beforeJson, afterJson, source, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(input.eventType || "accounting_event"),
      String(input.entityType || "unknown"),
      input.entityId == null ? null : Number(input.entityId),
      input.accountType || null,
      input.accountId == null ? null : Number(input.accountId),
      input.actor?.userId == null ? null : Number(input.actor.userId),
      input.actor?.username || null,
      input.actor?.role || null,
      input.reason || null,
      safeJson(input.before),
      safeJson(input.after),
      input.source || "app",
      new Date().toISOString(),
    ],
  );
};
