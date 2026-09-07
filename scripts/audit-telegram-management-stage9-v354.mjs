import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const expect = (source, needle, label) => assert.ok(source.includes(needle), label);
const expectRe = (source, re, label) => assert.match(source, re, label);

const releaseVersion = read('KOUROSH_SOURCE_VERSION').trim();
const releaseNumber = Number(/^v(\d+)$/.exec(releaseVersion)?.[1] || 0);
assert.ok(releaseNumber >= 354, `release version must be v354 or a successor; got ${releaseVersion}`);

const policy = read('server/security/managementAccessPolicy.ts');
for (const permission of [
  'dashboard.read','customers.read','customers.ledger.read','partners.read','partners.ledger.read',
  'sales.read','profits.read','installments.read','repairs.read','inventory.read','reports.read',
  'notifications.manage','managers.manage',
]) expect(policy, `"${permission}"`, `missing management permission ${permission}`);
expect(policy, 'key: "full_manager"', 'full_manager preset missing');
expect(policy, 'key: "finance_manager"', 'finance_manager preset missing');
expect(policy, 'key: "sales_manager"', 'sales_manager preset missing');
expect(policy, 'key: "viewer"', 'viewer preset missing');

const resolver = read('server/miniapp/miniAppIdentityResolver.ts');
expect(resolver, 'if (manager) workspaces.push(manager);', 'manager workspace missing');
expect(resolver, 'if (customers[0]) workspaces.push(customerWorkspace(customers[0]));', 'customer workspace missing');
expect(resolver, 'if (partners[0]) workspaces.push(partnerWorkspace(partners[0]));', 'partner workspace missing');
expect(resolver, 'const selected = workspaces[0];', 'stable workspace default missing');
expect(resolver, 'requestedKind', 'workspace switching contract missing');
expect(resolver, 'workspace.kind === "manager"', 'manager workspace selection missing');

const session = read('server/miniapp/miniAppSession.ts');
expect(session, 'STAFF_MINIAPP_SESSION_DURATION_MS = 30 * 60 * 1000', 'short manager session TTL missing');
expect(session, 'revokeStaff', 'manager session revocation support missing');

const routes = read('server/routes/miniapp.routes.ts');
expect(routes, 'loadFreshStaffAuthorizationResult(identity.subjectId, identity.telegramUserId)', 'fresh manager authorization must bind to Telegram User ID');
expect(routes, 'revokeCurrentMiniAppSession(req)', 'stale/invalid MiniApp session must be revoked');
expect(routes, 'app.use("/api/miniapp/manager", ...managerGuards)', 'manager API guard missing');
expect(routes, 'requireStaffPermissions(["dashboard.read"', 'dashboard permission guard missing');
expect(routes, 'requireAnyStaffPermission(["sales.read", "profits.read"])', 'sales/profit split guard missing');
expect(routes, 'requireStaffPermissions(["customers.read", "customers.ledger.read"])', 'customer ledger guard missing');
expect(routes, 'requireStaffPermissions(["partners.read", "partners.ledger.read", "profits.read"])', 'partner accounting profit guard missing');
expect(routes, 'requireStaffPermissions(["installments.read"])', 'installment guard missing');
expect(routes, 'requireStaffPermissions(["repairs.read"])', 'repairs guard missing');
expect(routes, 'requireStaffPermissions(["inventory.read"])', 'inventory guard missing');
expect(routes, 'createManagementRateLimiter', 'manager API rate limiter missing');

const managerService = read('server/services/miniAppManager.service.ts');
expect(managerService, 'if (sales && hasPermission(permissions, "sales.read"))', 'sales widget redaction missing');
expect(managerService, 'if (sales && hasPermission(permissions, "profits.read"))', 'profit widget redaction missing');
expect(managerService, '...(hasPermission(permissions, "profits.read") ? { grossProfit: data.grossProfit } : {})', 'sales-summary profit redaction missing');

const accessDb = read('server/db/domains/accessControl.db.ts');
expect(accessDb, 'WHERE tenant_id=? AND user_id=? LIMIT 1', 'tenant-scoped membership lookup missing');
expect(accessDb, 'r.tenant_id=?', 'tenant-scoped role lookup missing');
expect(accessDb, 'revokeMiniAppStaffSessions', 'RBAC mutation session invalidation missing');

const accessSchema = read('server/db/schema/accessControl.schema.ts');
expect(accessSchema, 'ACCESS_ROLE_TENANT_MISMATCH', 'cross-tenant role trigger missing');

const tgSchema = read('server/db/schema/telegramIdentity.schema.ts');
expect(tgSchema, 'telegram_user_id TEXT NOT NULL UNIQUE', 'Telegram User ID uniqueness missing for staff');
expectRe(tgSchema, /idx_(?:partners|customers)_telegram_user_unique/, 'customer/partner Telegram uniqueness guard missing');

const tgSecurity = read('server/services/telegramIdentitySecurity.service.ts');
expect(tgSecurity, 'resolveUserTenantAuthorization(userId)', 'manager binding target must resolve current tenant authorization');
expect(tgSecurity, 'DELETE FROM user_telegram_links WHERE user_id=?', 'binding revoke missing');
expect(tgSecurity, 'revokeMiniAppStaffSessions(userId)', 'binding revoke must invalidate manager MiniApp sessions');
expect(tgSecurity, 'l.telegram_user_id=?', 'fresh auth must compare immutable Telegram User ID');
assert.equal(/username\s*=\s*\?[^\n]*telegram/i.test(tgSecurity), false, 'Telegram username must not be used as authentication identity');

const notifSchema = read('server/db/schema/managerNotifications.schema.ts');
expect(notifSchema, 'PRIMARY KEY(tenant_membership_id, notification_key)', 'per-manager notification preference key missing');
expect(notifSchema, 'telegram_enabled INTEGER NOT NULL DEFAULT 0', 'safe Telegram default missing');
expect(notifSchema, 'in_app_enabled INTEGER NOT NULL DEFAULT 1', 'safe In-App default missing');

const notifDb = read('server/db/domains/managerNotifications.db.ts');
expect(notifDb, "WHERE m.tenant_id=? AND m.status='active' AND rp.permission_key=?", 'notification recipient tenant/active/permission filter missing');
expect(notifDb, 'WHERE id=? AND tenant_membership_id=?', 'In-App read mutation ownership guard missing');

const scheduledSchema = read('server/db/schema/managerScheduledReports.schema.ts');
for (const state of ['scheduled','running','completed','failed','skipped']) expect(scheduledSchema, `'${state}'`, `scheduled job state ${state} missing`);
expect(scheduledSchema, 'UNIQUE(schedule_id, scheduled_for)', 'scheduled occurrence duplicate prevention missing');
expect(scheduledSchema, "catch_up_policy TEXT NOT NULL DEFAULT 'catch_up'", 'catch-up policy missing');

const scheduledService = read('server/services/managerScheduledReports.service.ts');
expect(scheduledService, 'resolveUserTenantAuthorization(schedule.userId)', 'scheduled report fresh authorization missing');
expect(scheduledService, 'authorization.permissions.includes("profits.read")', 'scheduled profit permission re-check missing');
expect(scheduledService, 'authorization?.permissions.includes("installments.read")', 'scheduled installment permission re-check missing');

const audit = read('server/security/managementAudit.ts');
for (const key of ['tenantId','source','requestId','beforeJson','afterJson','metadataJson']) expect(audit, key, `structured audit ${key} missing`);
expect(audit, 'SECRET_KEY', 'audit secret redaction missing');

const auditSchema = read('server/db/schema/managementAuditHardening.schema.ts');
expect(auditSchema, 'trg_management_audit_no_update', 'append-only audit update guard missing');
expect(auditSchema, 'trg_management_audit_no_delete', 'append-only audit delete guard missing');

const worker = read('deployment/cloudflare-pages/_worker.js');
expect(worker, 'workspace?.kind === "manager"', 'manager-associated principal detection missing at edge');
expect(worker, 'MINIAPP_STAFF_OFFLINE_UNAVAILABLE', 'manager live-only offline failure missing');
expect(worker, 'url.pathname.startsWith("/api/miniapp/manager/")', 'manager live relay route missing');

const stage4Ui = read('miniapp/App.tsx');
const stage4Shell = read('miniapp/components/MiniAppShell.tsx');
const stage4Auth = read('miniapp/auth/MiniAppAuthContext.tsx');
expectRe(stage4Ui, /ManagerHome/, 'Manager workspace UI missing');
expect(stage4Shell, 'تغییر فضای کاری', 'Workspace switcher UI missing');
expect(stage4Shell, 'مدیریت فروشگاه', 'Manager workspace label missing');
expect(stage4Auth, 'switchWorkspace', 'Workspace switch auth flow missing');

console.log('PASS audit-telegram-management-stage9-v354');
