import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 350, `KOUROSH_SOURCE_VERSION must be v350 or successor; found ${version}`);

const schema = read('server/db/schema/managerNotifications.schema.ts');
assert.match(schema, /CREATE TABLE IF NOT EXISTS manager_notification_preferences/);
assert.match(schema, /telegram_enabled INTEGER NOT NULL DEFAULT 0/);
assert.match(schema, /in_app_enabled INTEGER NOT NULL DEFAULT 1/);
assert.match(schema, /PRIMARY KEY\(tenant_membership_id, notification_key\)/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS manager_in_app_notifications/);
assert.match(schema, /FOREIGN KEY \(tenant_membership_id\) REFERENCES tenant_memberships\(id\) ON DELETE CASCADE/);

const schemaIndex = read('server/db/schema/index.ts');
const initRuntime = read('server/db/core/initRuntime.ts');
assert.match(schemaIndex, /createManagerNotificationsSchema/);
assert.match(initRuntime, /await createManagerNotificationsSchema\(\)/);

const catalog = read('server/notifications/managerNotificationCatalog.ts');
for (const key of [
  'event.sale.created', 'event.sale.high_value', 'event.installment.overdue', 'event.check.failed',
  'event.repair.ready', 'event.repair.stale', 'event.inventory.critical', 'event.transaction.unusual',
  'event.accounting.health_error',
]) assert.ok(catalog.includes(key), `Manager notification catalog key missing: ${key}`);
assert.match(catalog, /if \(topic === "reports"\)/);
assert.match(catalog, /defaultTelegram: false/);
assert.match(catalog, /defaultInApp: true/);

const domain = read('server/db/domains/managerNotifications.db.ts');
assert.match(domain, /resolveUserTenantAuthorization/);
assert.match(domain, /getLocalTenantIdentity/);
assert.match(domain, /definition\.requiredPermission/);
assert.match(domain, /manager_notification_preferences/);
assert.match(domain, /manager_in_app_notifications/);
assert.match(domain, /datetime\(created_at\)>=datetime\(\?\)/);
assert.doesNotMatch(domain, /notification_key=\? AND source_event_type=\?/, 'Canonical manager-event dedupe must collapse duplicate source aliases for the same entity');
assert.match(domain, /markManagerInAppNotificationRead/);
assert.match(domain, /markAllManagerInAppNotificationsRead/);

const engine = read('server/services/managerNotificationEngine.service.ts');
assert.match(engine, /channel: "in_app"/);
assert.match(engine, /channel: "telegram"/);
assert.match(engine, /insertManagerInAppNotification/);
assert.match(engine, /deps\.enqueueOutbox/);
assert.match(engine, /skipCustomerRateLimit: true/);
assert.match(engine, /skipInvalidChatCheck: true/);
assert.match(engine, /recipient\.inAppEnabled/);
assert.match(engine, /recipient\.telegramEnabled/);

const eventRuntime = read('server/utils/telegramEventNotificationRuntime.ts');
const managerIndex = eventRuntime.indexOf('await publishManagerEvent({ topic, sourceEventType: typeKey, text, meta });');
const legacyFilterIndex = eventRuntime.indexOf('const ok = await isTopicTypeEnabled(topic, typeKey);', managerIndex);
assert.ok(managerIndex >= 0 && legacyFilterIndex > managerIndex, 'Per-manager delivery must be evaluated independently before the legacy global topic filter');
assert.match(eventRuntime, /Per-manager notifications must never break the originating business flow/);

const messaging = read('server/bootstrap/messagingRuntime.ts');
assert.match(messaging, /createManagerNotificationEngine/);
assert.match(messaging, /publishManagerNotificationEvent/);

const routes = read('server/routes/managerNotifications.routes.ts');
assert.match(routes, /requireManagementPermission\("notifications\.manage"\)/);
assert.match(routes, /\/api\/notifications\/managers\/catalog/);
assert.match(routes, /\/api\/notifications\/managers\/:userId\/preferences/);
assert.match(routes, /add(?:Management)?AuditLog/);

const miniappRoutes = read('server/routes/miniapp.routes.ts');
assert.match(miniappRoutes, /GET|app\.get\("\/api\/miniapp\/manager\/notifications"/);
assert.match(miniappRoutes, /app\.post\("\/api\/miniapp\/manager\/notifications\/:id\/read"/);
assert.match(miniappRoutes, /app\.post\("\/api\/miniapp\/manager\/notifications\/read-all"/);

const gateway = read('server/miniapp/miniAppGatewayPolicy.mjs');
assert.match(gateway, /isAllowedMiniAppManagerMutationPath/);
assert.match(gateway, /MUTATION_BODY_NOT_ALLOWED/);

const worker = read('deployment/cloudflare-pages/_worker.js');
assert.match(worker, /authenticatedManagerMutation/);
assert.match(worker, /isManagerNotificationMutationPath/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
const mutationStart = worker.indexOf('const authenticatedManagerMutation');
const mutationEnd = worker.indexOf('\nconst canonicalize', mutationStart);
const mutationBlock = worker.slice(mutationStart, mutationEnd);
assert.doesNotMatch(mutationBlock, /getSnapshot|putSnapshot|subject_snapshots|serveSnapshotRead/, 'Manager notification mutations must never fall back to cloud snapshots');

const client = read('miniapp/apiClient.ts');
assert.match(client, /export const postMiniAppAction/);
assert.match(client, /method: "POST"/);
const app = read('miniapp/App.tsx');
assert.match(app, /ManagerNotifications/);
assert.match(app, /path="notifications"/);
const inbox = read('miniapp/pages/ManagerNotifications.tsx');
assert.match(inbox, /data-manager-notification-inbox="v350"/);
assert.match(inbox, /\/api\/miniapp\/manager\/notifications\?limit=60/);
assert.match(inbox, /\/api\/miniapp\/manager\/notifications\/read-all/);
const home = read('miniapp/pages/ManagerHome.tsx');
assert.equal((home.match(/to="\/notifications"/g) || []).length, 1, 'Manager notifications quick action must appear exactly once');

const cssFiles = fs.readdirSync('miniapp', { recursive: true }).filter((name) => String(name).endsWith('.css'));
assert.ok(cssFiles.length <= 1, `Stage 5 must not introduce scattered MiniApp CSS; found ${cssFiles.length} CSS files`);

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.scripts?.['audit:telegram-management-stage5-v350'], 'node scripts/audit-telegram-management-stage5-v350.mjs');
assert.equal(pkg.scripts?.['test:telegram-management-stage5-notifications-v350'], 'node --experimental-strip-types scripts/test-telegram-management-stage5-notifications-v350.mjs');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:telegram-management-stage5-v350/);
assert.match(String(pkg.scripts?.['audit:release'] || ''), /test:telegram-management-stage5-notifications-v350/);

console.log('Telegram Management Center Stage 5 v350 source audit passed');
