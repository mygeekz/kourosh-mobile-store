import { runAsync } from "../query";

/**
 * Stage 5 manager notification persistence.
 * Preferences are tenant-scoped through tenant_memberships; delivery data stays local.
 */
export const createManagerNotificationsSchema = async (): Promise<void> => {
  await runAsync(`CREATE TABLE IF NOT EXISTS manager_notification_preferences (
    tenant_membership_id INTEGER NOT NULL,
    notification_key TEXT NOT NULL,
    telegram_enabled INTEGER NOT NULL DEFAULT 0 CHECK(telegram_enabled IN (0,1)),
    in_app_enabled INTEGER NOT NULL DEFAULT 1 CHECK(in_app_enabled IN (0,1)),
    config_json TEXT NOT NULL DEFAULT '{}',
    updated_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    PRIMARY KEY(tenant_membership_id, notification_key),
    FOREIGN KEY (tenant_membership_id) REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_manager_notification_preferences_key ON manager_notification_preferences(notification_key,telegram_enabled,in_app_enabled)",
  );

  await runAsync(`CREATE TABLE IF NOT EXISTS manager_in_app_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_membership_id INTEGER NOT NULL,
    notification_key TEXT NOT NULL,
    source_event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','success','warning','danger')),
    entity_type TEXT,
    entity_id INTEGER,
    data_json TEXT NOT NULL DEFAULT '{}',
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    FOREIGN KEY (tenant_membership_id) REFERENCES tenant_memberships(id) ON DELETE CASCADE
  )`);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_manager_in_app_notifications_membership ON manager_in_app_notifications(tenant_membership_id,read_at,created_at DESC,id DESC)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_manager_in_app_notifications_dedupe ON manager_in_app_notifications(tenant_membership_id,notification_key,entity_type,entity_id,created_at DESC)",
  );
};
