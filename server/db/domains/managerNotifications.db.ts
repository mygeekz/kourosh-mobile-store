import { getLocalTenantIdentity } from "../../connectivity/localTenantIdentity";
import {
  MANAGER_NOTIFICATION_CATALOG,
  getManagerNotificationDefinition,
  isManagerNotificationKey,
  type ManagerNotificationSeverity,
} from "../../notifications/managerNotificationCatalog";
import { hasAnyManagementPermission, isManagementPermission } from "../../security/managementAccessPolicy";
import { resolveUserTenantAuthorization } from "./accessControl.db";
import { allTypedAsync, getTypedAsync, runAsync } from "../query";

export type ManagerNotificationPreference = {
  key: string;
  label: string;
  category: string;
  severity: ManagerNotificationSeverity;
  requiredPermission: string;
  telegramEnabled: boolean;
  inAppEnabled: boolean;
  config: Record<string, unknown>;
  explicit: boolean;
};

export type ManagerNotificationRecipient = {
  membershipId: number;
  userId: number;
  chatId: string | null;
  telegramEnabled: boolean;
  inAppEnabled: boolean;
  config: Record<string, unknown>;
};

const parseConfig = (value: unknown): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeConfig = (value: unknown): string => {
  if (value == null) return "{}";
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("MANAGER_NOTIFICATION_CONFIG_INVALID");
  const serialized = JSON.stringify(value);
  if (serialized.length > 4096) throw new Error("MANAGER_NOTIFICATION_CONFIG_TOO_LARGE");
  return serialized;
};

const requireManagerAuthorization = async (userId: number) => {
  const authorization = await resolveUserTenantAuthorization(userId);
  if (!authorization || !hasAnyManagementPermission(authorization.permissions)) {
    throw new Error("MANAGER_NOTIFICATION_TARGET_FORBIDDEN");
  }
  return authorization;
};

export const listManagerNotificationPreferences = async (
  userId: number,
): Promise<{ userId: number; membershipId: number; tenantId: string; items: ManagerNotificationPreference[] }> => {
  const authorization = await requireManagerAuthorization(userId);
  const rows = await allTypedAsync<{
    notificationKey: string;
    telegramEnabled: number;
    inAppEnabled: number;
    configJson: string;
  }>(
    `SELECT notification_key AS notificationKey,telegram_enabled AS telegramEnabled,
            in_app_enabled AS inAppEnabled,config_json AS configJson
       FROM manager_notification_preferences
      WHERE tenant_membership_id=?`,
    [authorization.membershipId],
  );
  const explicit = new Map(rows.map((row) => [row.notificationKey, row]));
  return {
    userId,
    membershipId: authorization.membershipId,
    tenantId: authorization.tenantId,
    items: MANAGER_NOTIFICATION_CATALOG.map((definition) => {
      const row = explicit.get(definition.key);
      return {
        key: definition.key,
        label: definition.label,
        category: definition.category,
        severity: definition.severity,
        requiredPermission: definition.requiredPermission,
        telegramEnabled: row ? Boolean(row.telegramEnabled) : definition.defaultTelegram,
        inAppEnabled: row ? Boolean(row.inAppEnabled) : definition.defaultInApp,
        config: row ? parseConfig(row.configJson) : {},
        explicit: Boolean(row),
      };
    }),
  };
};

export const updateManagerNotificationPreferences = async (
  userId: number,
  updates: readonly Array<{
    key: string;
    telegramEnabled?: boolean;
    inAppEnabled?: boolean;
    config?: Record<string, unknown>;
  }>,
  updatedByUserId: number,
) => {
  const authorization = await requireManagerAuthorization(userId);
  if (!Array.isArray(updates) || updates.length > MANAGER_NOTIFICATION_CATALOG.length) {
    throw new Error("MANAGER_NOTIFICATION_PREFERENCES_INVALID");
  }
  await runAsync("BEGIN IMMEDIATE");
  try {
    for (const update of updates) {
      if (!isManagerNotificationKey(update?.key)) throw new Error("MANAGER_NOTIFICATION_KEY_INVALID");
      const current = await getTypedAsync<{ telegramEnabled: number; inAppEnabled: number; configJson: string }>(
        `SELECT telegram_enabled AS telegramEnabled,in_app_enabled AS inAppEnabled,config_json AS configJson
           FROM manager_notification_preferences WHERE tenant_membership_id=? AND notification_key=? LIMIT 1`,
        [authorization.membershipId, update.key],
      );
      const definition = getManagerNotificationDefinition(update.key)!;
      const telegramEnabled = typeof update.telegramEnabled === "boolean"
        ? update.telegramEnabled
        : current ? Boolean(current.telegramEnabled) : definition.defaultTelegram;
      const inAppEnabled = typeof update.inAppEnabled === "boolean"
        ? update.inAppEnabled
        : current ? Boolean(current.inAppEnabled) : definition.defaultInApp;
      const configJson = Object.prototype.hasOwnProperty.call(update, "config")
        ? normalizeConfig(update.config)
        : current?.configJson || "{}";
      await runAsync(
        `INSERT INTO manager_notification_preferences(
           tenant_membership_id,notification_key,telegram_enabled,in_app_enabled,config_json,updated_by_user_id
         ) VALUES(?,?,?,?,?,?)
         ON CONFLICT(tenant_membership_id,notification_key) DO UPDATE SET
           telegram_enabled=excluded.telegram_enabled,
           in_app_enabled=excluded.in_app_enabled,
           config_json=excluded.config_json,
           updated_by_user_id=excluded.updated_by_user_id,
           updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`,
        [authorization.membershipId, update.key, telegramEnabled ? 1 : 0, inAppEnabled ? 1 : 0, configJson, updatedByUserId],
      );
    }
    await runAsync("COMMIT");
  } catch (error) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw error;
  }
  return listManagerNotificationPreferences(userId);
};

export const listManagerNotificationRecipients = async (
  notificationKey: string,
): Promise<ManagerNotificationRecipient[]> => {
  const definition = getManagerNotificationDefinition(notificationKey);
  if (!definition) return [];
  const { tenantId } = await getLocalTenantIdentity();
  const rows = await allTypedAsync<{
    membershipId: number;
    userId: number;
    chatId: string | null;
    permissionKey: string;
    telegramEnabled: number | null;
    inAppEnabled: number | null;
    configJson: string | null;
  }>(
    `SELECT DISTINCT m.id AS membershipId,m.user_id AS userId,l.chat_id AS chatId,
            rp.permission_key AS permissionKey,p.telegram_enabled AS telegramEnabled,
            p.in_app_enabled AS inAppEnabled,p.config_json AS configJson
       FROM tenant_memberships m
       JOIN tenant_membership_roles mr ON mr.membership_id=m.id
       JOIN access_roles r ON r.id=mr.role_id AND r.tenant_id=m.tenant_id
       JOIN access_role_permissions rp ON rp.role_id=r.id
       LEFT JOIN user_telegram_links l ON l.user_id=m.user_id
       LEFT JOIN manager_notification_preferences p
         ON p.tenant_membership_id=m.id AND p.notification_key=?
      WHERE m.tenant_id=? AND m.status='active' AND rp.permission_key=?`,
    [notificationKey, tenantId, definition.requiredPermission],
  );
  const byMembership = new Map<number, ManagerNotificationRecipient>();
  for (const row of rows) {
    if (!isManagementPermission(row.permissionKey)) continue;
    if (!byMembership.has(row.membershipId)) {
      byMembership.set(row.membershipId, {
        membershipId: row.membershipId,
        userId: row.userId,
        chatId: row.chatId ? String(row.chatId) : null,
        telegramEnabled: row.telegramEnabled == null ? definition.defaultTelegram : Boolean(row.telegramEnabled),
        inAppEnabled: row.inAppEnabled == null ? definition.defaultInApp : Boolean(row.inAppEnabled),
        config: row.configJson == null ? {} : parseConfig(row.configJson),
      });
    }
  }
  return [...byMembership.values()];
};

export const insertManagerInAppNotification = async (input: {
  membershipId: number;
  notificationKey: string;
  sourceEventType: string;
  title: string;
  body: string;
  severity: ManagerNotificationSeverity;
  entityType?: string | null;
  entityId?: number | null;
  data?: Record<string, unknown>;
  dedupeMinutes?: number;
}): Promise<{ created: boolean; id: number | null }> => {
  const dedupeMinutes = Math.max(0, Math.min(1440, Number(input.dedupeMinutes ?? 5)));
  if (dedupeMinutes > 0) {
    const cutoff = new Date(Date.now() - dedupeMinutes * 60_000).toISOString();
    const existing = await getTypedAsync<{ id: number }>(
      `SELECT id FROM manager_in_app_notifications
        WHERE tenant_membership_id=? AND notification_key=?
          AND IFNULL(entity_type,'')=? AND IFNULL(entity_id,0)=? AND datetime(created_at)>=datetime(?)
        ORDER BY id DESC LIMIT 1`,
      [input.membershipId, input.notificationKey, input.entityType || "", Number(input.entityId || 0), cutoff],
    );
    if (existing?.id) return { created: false, id: existing.id };
  }
  const dataJson = JSON.stringify(input.data || {});
  const result = await runAsync(
    `INSERT INTO manager_in_app_notifications(
       tenant_membership_id,notification_key,source_event_type,title,body,severity,entity_type,entity_id,data_json
     ) VALUES(?,?,?,?,?,?,?,?,?)`,
    [input.membershipId, input.notificationKey, input.sourceEventType, input.title, input.body, input.severity, input.entityType || null, input.entityId || null, dataJson],
  );
  return { created: true, id: Number(result.lastID || 0) || null };
};

export const listManagerInAppNotifications = async (
  userId: number,
  options: { limit?: number; unreadOnly?: boolean } = {},
) => {
  const authorization = await requireManagerAuthorization(userId);
  const limit = Math.max(1, Math.min(100, Number(options.limit || 40)));
  const unreadSql = options.unreadOnly ? "AND n.read_at IS NULL" : "";
  const rows = await allTypedAsync<{
    id: number;
    notificationKey: string;
    sourceEventType: string;
    title: string;
    body: string;
    severity: ManagerNotificationSeverity;
    entityType: string | null;
    entityId: number | null;
    dataJson: string;
    readAt: string | null;
    createdAt: string;
  }>(
    `SELECT n.id,n.notification_key AS notificationKey,n.source_event_type AS sourceEventType,
            n.title,n.body,n.severity,n.entity_type AS entityType,n.entity_id AS entityId,
            n.data_json AS dataJson,n.read_at AS readAt,n.created_at AS createdAt
       FROM manager_in_app_notifications n
      WHERE n.tenant_membership_id=? ${unreadSql}
      ORDER BY n.created_at DESC,n.id DESC LIMIT ?`,
    [authorization.membershipId, limit],
  );
  const unread = await getTypedAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM manager_in_app_notifications WHERE tenant_membership_id=? AND read_at IS NULL",
    [authorization.membershipId],
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      notificationKey: row.notificationKey,
      sourceEventType: row.sourceEventType,
      title: row.title,
      body: row.body,
      severity: row.severity,
      entityType: row.entityType,
      entityId: row.entityId,
      data: parseConfig(row.dataJson),
      readAt: row.readAt,
      createdAt: row.createdAt,
    })),
    unreadCount: Number(unread?.count || 0),
  };
};

export const markManagerInAppNotificationRead = async (userId: number, notificationId: number): Promise<boolean> => {
  const authorization = await requireManagerAuthorization(userId);
  const result = await runAsync(
    `UPDATE manager_in_app_notifications
        SET read_at=COALESCE(read_at,strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
      WHERE id=? AND tenant_membership_id=?`,
    [notificationId, authorization.membershipId],
  );
  return result.changes > 0;
};

export const markAllManagerInAppNotificationsRead = async (userId: number): Promise<number> => {
  const authorization = await requireManagerAuthorization(userId);
  const result = await runAsync(
    `UPDATE manager_in_app_notifications
        SET read_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
      WHERE tenant_membership_id=? AND read_at IS NULL`,
    [authorization.membershipId],
  );
  return result.changes;
};
