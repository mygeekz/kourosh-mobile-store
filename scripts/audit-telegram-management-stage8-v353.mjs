import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const has = (text, pattern, message) => assert(pattern.test(text), message);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const schema = read('server/db/schema/managementAuditHardening.schema.ts');
const schemaIndex = read('server/db/schema/index.ts');
const init = read('server/db/core/initRuntime.ts');
const auditService = read('server/security/managementAudit.ts');
const auditDb = read('server/db/domains/audit.db.ts');
const limiter = read('server/middleware/managementRateLimiter.ts');
const telegramRoutes = read('server/routes/telegramLinking.routes.ts');
const telegramService = read('server/services/telegramIdentitySecurity.service.ts');
const notificationRoutes = read('server/routes/managerNotifications.routes.ts');
const reportRoutes = read('server/routes/reportAutomation.routes.ts');
const miniappRoutes = read('server/routes/miniapp.routes.ts');
const accessDb = read('server/db/domains/accessControl.db.ts');
const notificationsDb = read('server/db/domains/managerNotifications.db.ts');
const reportService = read('server/services/managerScheduledReports.service.ts');
const packageJson = JSON.parse(read('package.json'));

const versionNumber = Number(version.match(/^v(\d+)$/)?.[1] || 0);
assert(versionNumber >= 353, `expected v353 or successor, got ${version}`);

for (const column of ['tenantId', 'source', 'requestId', 'beforeJson', 'afterJson', 'metadataJson']) {
  has(schema, new RegExp(`ALTER TABLE audit_logs ADD COLUMN ${column} TEXT`), `structured audit column missing: ${column}`);
}
has(schema, /trg_management_audit_no_update/, 'management audit update immutability trigger missing');
has(schema, /trg_management_audit_no_delete/, 'management audit delete immutability trigger missing');
has(schema, /OLD\.tenantId IS NOT NULL AND OLD\.source IS NOT NULL/, 'immutability must be scoped to structured management rows');
has(schemaIndex, /createManagementAuditHardeningSchema/, 'management audit hardening schema export missing');
has(init, /await createAuditSchema\(\);\s*await createManagementAuditHardeningSchema\(\);/, 'audit hardening must run after legacy audit schema');

has(auditService, /getLocalTenantIdentity/, 'structured audit must bind to current local tenant');
has(auditService, /SECRET_KEY/, 'structured audit secret redaction missing');
has(auditService, /\[REDACTED\]/, 'structured audit redaction marker missing');
has(auditService, /beforeJson,afterJson,metadataJson/, 'structured audit insert fields missing');
has(auditDb, /tenantId, source, requestId, beforeJson, afterJson, metadataJson/, 'audit report reads must expose structured audit fields');

has(limiter, /createManagementRateLimiter/, 'management-specific rate limiter missing');
has(limiter, /Retry-After/, 'rate limiter Retry-After header missing');
has(limiter, /MANAGEMENT_RATE_LIMITED/, 'management rate-limit error contract missing');
has(telegramRoutes, /telegram-manager-write/, 'Telegram manager write limiter missing');
has(notificationRoutes, /manager-notification-write/, 'manager notification write limiter missing');
has(reportRoutes, /manager-report-write/, 'manager report write limiter missing');
has(miniappRoutes, /MINIAPP_MANAGER_RATE_LIMITED/, 'MiniApp manager limiter missing');

has(telegramService, /export const revokeManagerTelegramBinding/, 'strict manager binding revoke missing');
has(telegramService, /resolveUserTenantAuthorization\(userId\)/, 'strict manager binding revoke must resolve current tenant authorization');
has(telegramRoutes, /revokeManagerTelegramBinding\(userId, req\.user!\)/, 'manager relink/revoke routes must use strict tenant-aware revoke');
has(telegramService, /before: \{ state: before\.state/, 'Telegram revoke before-state audit missing');
has(telegramService, /after: \{ state: "not_linked"/, 'Telegram revoke after-state audit missing');

has(notificationRoutes, /const before = await listManagerNotificationPreferences\(userId\)/, 'notification preference before-state capture missing');
has(notificationRoutes, /MANAGER_NOTIFICATION_PREFERENCES_UPDATED/, 'notification structured audit event missing');
has(notificationRoutes, /before: \{ items:/, 'notification before audit payload missing');
has(notificationRoutes, /after: \{ items:/, 'notification after audit payload missing');
has(reportRoutes, /const before = \(await listManagerReportSchedules\(userId\)\)/, 'report schedule before-state capture missing');
has(reportRoutes, /MANAGER_REPORT_SCHEDULE_UPDATED/, 'report schedule structured audit event missing');
has(reportRoutes, /before,\s*after: data/, 'report schedule before/after audit missing');
has(miniappRoutes, /addManagementAuditLog\(\{/, 'sensitive manager MiniApp reads must use structured audit');

const revokeCount = (accessDb.match(/revokeMiniAppStaffSessions/g) || []).length;
assert(revokeCount >= 5, `management access mutations must invalidate MiniApp sessions; found ${revokeCount}`);
has(accessDb, /replaceCustomAccessRolePermissions[\s\S]*affectedUsers[\s\S]*revokeMiniAppStaffSessions/, 'role permission changes must invalidate assigned manager sessions');
has(accessDb, /revokeManualAccessRoleFromUser[\s\S]*revokeMiniAppStaffSessions\(userId\)/, 'manual role revoke must invalidate target sessions');
has(accessDb, /setTenantMembershipStatus[\s\S]*revokeMiniAppStaffSessions\(userId\)/, 'membership status changes must invalidate target sessions');

has(notificationsDb, /WHERE m\.tenant_id=\? AND m\.status='active'/, 'manager notification recipients must be tenant scoped');
has(reportService, /WHERE m\.tenant_id=\? AND m\.status='active'/, 'manager report schedules must be tenant scoped');
has(notificationsDb, /WHERE id=\? AND tenant_membership_id=\?/, 'in-app read mutation must be membership scoped');

assert(packageJson.scripts?.['audit:telegram-management-stage8-v353'], 'Stage 8 audit script missing from package.json');
assert(packageJson.scripts?.['test:telegram-management-stage8-security-v353'], 'Stage 8 security test missing from package.json');
has(String(packageJson.scripts?.['audit:release'] || ''), /audit:telegram-management-stage8-v353/, 'release audit must include Stage 8 audit');
has(String(packageJson.scripts?.['audit:release'] || ''), /test:telegram-management-stage8-security-v353/, 'release audit must include Stage 8 security test');

console.log('PASS audit-telegram-management-stage8-v353');
