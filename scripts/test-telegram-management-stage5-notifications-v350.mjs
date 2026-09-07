import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  mapSourceEventToManagerNotificationKey,
  MANAGER_NOTIFICATION_CATALOG,
} from '../server/notifications/managerNotificationCatalog.ts';
import {
  classifyMiniAppGatewayRequest,
  isAllowedMiniAppManagerMutationPath,
} from '../server/miniapp/miniAppGatewayPolicy.mjs';

// Event classification: scheduled reports stay outside Stage 5, legacy partner copies are ignored,
// and existing operational events resolve to canonical per-manager preference keys.
assert.equal(mapSourceEventToManagerNotificationKey('reports', 'NIGHTLY_REPORT'), null);
assert.equal(mapSourceEventToManagerNotificationKey('sales', 'SALES_ORDER_CREATED'), 'event.sale.created');
assert.equal(mapSourceEventToManagerNotificationKey('notifications', 'INVOICE_CREATED_MANAGER'), 'event.sale.created');
assert.equal(mapSourceEventToManagerNotificationKey('notifications', 'INVOICE_CREATED_PARTNER'), null);
assert.equal(mapSourceEventToManagerNotificationKey('installments', 'CHECK_FAILED'), 'event.check.failed');
assert.ok(MANAGER_NOTIFICATION_CATALOG.every((item) => item.defaultTelegram === false && item.defaultInApp === true));

// Edge mutation surface is intentionally narrow and live-only.
assert.equal(isAllowedMiniAppManagerMutationPath('/api/miniapp/manager/notifications/12/read'), true);
assert.equal(isAllowedMiniAppManagerMutationPath('/api/miniapp/manager/notifications/read-all'), true);
assert.equal(isAllowedMiniAppManagerMutationPath('/api/miniapp/manager/dashboard'), false);
assert.equal(classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/manager/notifications/12/read' }).allowed, true);
assert.equal(classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/manager/notifications/read-all' }).allowed, true);
assert.equal(classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/manager/notifications/12/read', hasBody: true }).allowed, false);
assert.equal(classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/manager/dashboard' }).allowed, false);

// Real SQLite contract for tenant-scoped per-manager preferences and persistent In-App inbox.
const source = fs.readFileSync('server/db/schema/managerNotifications.schema.ts', 'utf8');
const preferenceSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS manager_notification_preferences[\s\S]*?)`\);/)?.[1];
const inboxSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS manager_in_app_notifications[\s\S]*?)`\);/)?.[1];
assert.ok(preferenceSql, 'manager_notification_preferences schema not found');
assert.ok(inboxSql, 'manager_in_app_notifications schema not found');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE)');
db.exec(`CREATE TABLE tenant_memberships(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tenant_id,user_id)
)`);
db.exec(preferenceSql);
db.exec(inboxSql);

db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(1, 'manager_a');
db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(2, 'manager_b');
db.prepare("INSERT INTO tenant_memberships(id,tenant_id,user_id,status) VALUES(1,'tenant-a',1,'active')").run();
db.prepare("INSERT INTO tenant_memberships(id,tenant_id,user_id,status) VALUES(2,'tenant-a',2,'active')").run();

// Explicit prefs stay independent per manager. Defaults are validated at schema/catalog level above.
db.prepare(`INSERT INTO manager_notification_preferences(
  tenant_membership_id,notification_key,telegram_enabled,in_app_enabled,updated_by_user_id
) VALUES(?,?,?,?,?)`).run(1, 'event.sale.created', 1, 0, 1);
db.prepare(`INSERT INTO manager_notification_preferences(
  tenant_membership_id,notification_key,telegram_enabled,in_app_enabled,updated_by_user_id
) VALUES(?,?,?,?,?)`).run(2, 'event.sale.created', 0, 1, 1);
const prefA = db.prepare("SELECT telegram_enabled AS telegramEnabled,in_app_enabled AS inAppEnabled FROM manager_notification_preferences WHERE tenant_membership_id=1 AND notification_key='event.sale.created'").get();
const prefB = db.prepare("SELECT telegram_enabled AS telegramEnabled,in_app_enabled AS inAppEnabled FROM manager_notification_preferences WHERE tenant_membership_id=2 AND notification_key='event.sale.created'").get();
assert.equal(prefA.telegramEnabled, 1);
assert.equal(prefA.inAppEnabled, 0);
assert.equal(prefB.telegramEnabled, 0);
assert.equal(prefB.inAppEnabled, 1);

// One manager cannot accidentally collide with another manager's inbox rows.
db.prepare(`INSERT INTO manager_in_app_notifications(
  tenant_membership_id,notification_key,source_event_type,title,body,severity,entity_type,entity_id
) VALUES(?,?,?,?,?,?,?,?)`).run(1, 'event.sale.created', 'SALES_ORDER_CREATED', 'فروش جدید', 'مدیر الف', 'success', 'sale', 55);
db.prepare(`INSERT INTO manager_in_app_notifications(
  tenant_membership_id,notification_key,source_event_type,title,body,severity,entity_type,entity_id
) VALUES(?,?,?,?,?,?,?,?)`).run(2, 'event.sale.created', 'SALES_ORDER_CREATED', 'فروش جدید', 'مدیر ب', 'success', 'sale', 55);
const inboxAId = Number(db.prepare('SELECT id FROM manager_in_app_notifications WHERE tenant_membership_id=1').get().id);
db.prepare("UPDATE manager_in_app_notifications SET read_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=? AND tenant_membership_id=1").run(inboxAId);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM manager_in_app_notifications WHERE tenant_membership_id=1 AND read_at IS NULL').get().count), 0);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM manager_in_app_notifications WHERE tenant_membership_id=2 AND read_at IS NULL').get().count), 1);

// Composite preference key prevents duplicate rows for one manager/event pair.
assert.throws(
  () => db.prepare('INSERT INTO manager_notification_preferences(tenant_membership_id,notification_key) VALUES(?,?)').run(1, 'event.sale.created'),
  /UNIQUE constraint failed/,
);

// Removing a tenant membership cleans up both prefs and inbox while preserving the user.
db.prepare('DELETE FROM tenant_memberships WHERE id=1').run();
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM manager_notification_preferences WHERE tenant_membership_id=1').get().count), 0);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM manager_in_app_notifications WHERE tenant_membership_id=1').get().count), 0);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM users WHERE id=1').get().count), 1);

db.close();
console.log('Telegram Management Center Stage 5 v350 notification contract passed');
