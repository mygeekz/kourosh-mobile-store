import { getDbInstance } from "../core/runtimeBindings";
import { allAsync, getAsync, runAsync } from "../query";
import {
  dismissNotificationForUser as dismissNotificationForUserInRepo,
  dismissNotificationsForUser as dismissNotificationsForUserInRepo,
  restoreNotificationForUser as restoreNotificationForUserInRepo,
  restoreNotificationsForUser as restoreNotificationsForUserInRepo,
  listDismissedNotificationIdsForUser as listDismissedNotificationIdsForUserFromRepo,
} from "../../repositories/dismissedNotifications.repo";
import { safeJsonStringify, safeJsonParse, normalizeMoney } from "../core/json";

import type {
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
  PhoneInventoryEventPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  OldMobilePhonePayload,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
  UserUpdatePayload,
  UserForDb,
  RfmItem,
  CohortRow,
  LedgerChangeHistoryEntry,
  RepairFinancialSummary,
  DashboardLayoutsPayload,
  OverallStatus,
  SavedFilterRow,
  InventoryTurnoverReport,
  DeadStockItem,
  AbcItem,
  AgingBucket,
  AgingReceivableRow,
  CashflowDay,
  CashflowReport,
  ShareInput,
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "../core/types";

export const addAuditLog = async (
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

export const getAuditLogs = async (limit: number = 100, offset: number = 0) => {
  return allAsync(
    `SELECT id, userId, username, role, action, entityType, entityId, description, createdAt
     FROM audit_logs
     ORDER BY datetime(createdAt) DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
};

export type AuditLogReportFilters = {
  limit?: number;
  offset?: number;
  query?: string;
  action?: string;
  entityType?: string;
  role?: string;
  from?: string;
  to?: string;
};

export const getAuditLogReport = async (filters: AuditLogReportFilters = {}) => {
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const where: string[] = [];
  const params: any[] = [];

  const query = String(filters.query || '').trim();
  if (query) {
    const like = `%${query}%`;
    where.push(`(
      COALESCE(username, '') LIKE ? COLLATE NOCASE OR
      COALESCE(role, '') LIKE ? COLLATE NOCASE OR
      COALESCE(action, '') LIKE ? COLLATE NOCASE OR
      COALESCE(entityType, '') LIKE ? COLLATE NOCASE OR
      CAST(COALESCE(entityId, '') AS TEXT) LIKE ? OR
      COALESCE(description, '') LIKE ? COLLATE NOCASE
    )`);
    params.push(like, like, like, like, like, like);
  }

  const action = String(filters.action || '').trim();
  if (action && action !== 'ALL') {
    where.push('action = ?');
    params.push(action);
  }

  const entityType = String(filters.entityType || '').trim();
  if (entityType && entityType !== 'ALL') {
    where.push('entityType = ?');
    params.push(entityType);
  }

  const role = String(filters.role || '').trim();
  if (role && role !== 'ALL') {
    where.push('role = ?');
    params.push(role);
  }

  const from = String(filters.from || '').trim();
  if (from) {
    where.push('datetime(createdAt) >= datetime(?)');
    params.push(from);
  }

  const to = String(filters.to || '').trim();
  if (to) {
    where.push('datetime(createdAt) <= datetime(?)');
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await allAsync(
    `SELECT id, userId, username, role, action, entityType, entityId, description, createdAt
     FROM audit_logs
     ${whereSql}
     ORDER BY datetime(createdAt) DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const stats = await getAsync(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN action = 'create' THEN 1 ELSE 0 END) AS created,
       SUM(CASE WHEN action = 'update' THEN 1 ELSE 0 END) AS updated,
       SUM(CASE WHEN action = 'delete' THEN 1 ELSE 0 END) AS deleted,
       COUNT(DISTINCT COALESCE(username, 'system')) AS actors,
       MAX(createdAt) AS latestAt
     FROM audit_logs
     ${whereSql}`,
    params,
  );

  const [actions, entities, roles] = await Promise.all([
    allAsync(`SELECT action AS value, COUNT(*) AS count FROM audit_logs WHERE action IS NOT NULL AND TRIM(action) <> '' GROUP BY action ORDER BY count DESC, action ASC`),
    allAsync(`SELECT entityType AS value, COUNT(*) AS count FROM audit_logs WHERE entityType IS NOT NULL AND TRIM(entityType) <> '' GROUP BY entityType ORDER BY count DESC, entityType ASC`),
    allAsync(`SELECT role AS value, COUNT(*) AS count FROM audit_logs WHERE role IS NOT NULL AND TRIM(role) <> '' GROUP BY role ORDER BY count DESC, role ASC`),
  ]);

  return {
    rows,
    pagination: { limit, offset, total: Number(stats?.total || 0) },
    stats: {
      total: Number(stats?.total || 0),
      created: Number(stats?.created || 0),
      updated: Number(stats?.updated || 0),
      deleted: Number(stats?.deleted || 0),
      actors: Number(stats?.actors || 0),
      latestAt: stats?.latestAt || null,
    },
    options: { actions, entities, roles },
  };
};

export const addAuditLogEntry = async (
  userId: number | null,
  entity: string,
  entityId: number,
  action: string,
  meta: any = null,
) => {
  await getDbInstance();
  await runAsync(
    `INSERT INTO audit_logs (userId, entity, entityId, action, meta, createdAt)
     VALUES (?,?,?,?,?,?)`,
    [
      userId,
      entity,
      entityId,
      action,
      meta ? JSON.stringify(meta) : null,
      new Date().toISOString(),
    ],
  );
};

export const dismissNotificationForUserInDb = async (
  userId: number,
  notificationId: string,
): Promise<void> => {
  await getDbInstance();
  await dismissNotificationForUserInRepo(userId, notificationId);
};

export const listDismissedNotificationIdsForUserFromDb = async (
  userId: number,
): Promise<string[]> => {
  await getDbInstance();
  return listDismissedNotificationIdsForUserFromRepo(userId);
};

export const restoreNotificationForUserInDb = async (
  userId: number,
  notificationId: string,
): Promise<void> => {
  await getDbInstance();
  await restoreNotificationForUserInRepo(userId, notificationId);
};

export const dismissNotificationsForUserInDb = async (
  userId: number,
  notificationIds: string[],
): Promise<number> => {
  await getDbInstance();
  return dismissNotificationsForUserInRepo(userId, notificationIds);
};

export const restoreNotificationsForUserInDb = async (
  userId: number,
  notificationIds: string[],
): Promise<number> => {
  await getDbInstance();
  return restoreNotificationsForUserInRepo(userId, notificationIds);
};
