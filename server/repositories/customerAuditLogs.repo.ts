import { runAsync } from "../db/query";

export type CustomerAuditLogInput = {
  userId?: number | null;
  username?: string | null;
  roleName?: string | null;
  action: string;
  customerId: number;
  description: string;
};

const addAuditLogRecordToRepo = async (
  userId: number | null,
  username: string | null,
  role: string | null,
  action: string,
  entityType: string | null,
  entityId: number | null,
  description: string | null,
): Promise<void> => {
  try {
    await runAsync(
      `INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        username ?? null,
        role ?? null,
        action,
        entityType ?? null,
        entityId ?? null,
        description ?? null,
      ],
    );
  } catch (err) {
    console.error("Failed to insert audit log:", err);
  }
};

export const addCustomerLedgerAuditLogToRepo = async (
  input: CustomerAuditLogInput,
): Promise<void> =>
  addAuditLogRecordToRepo(
    input.userId ?? null,
    input.username ?? null,
    input.roleName ?? null,
    input.action,
    "customer_ledger",
    input.customerId,
    input.description,
  );

export const addCustomerAuditLogToRepo = async (
  input: CustomerAuditLogInput,
): Promise<void> =>
  addAuditLogRecordToRepo(
    input.userId ?? null,
    input.username ?? null,
    input.roleName ?? null,
    input.action,
    "customer",
    input.customerId,
    input.description,
  );
