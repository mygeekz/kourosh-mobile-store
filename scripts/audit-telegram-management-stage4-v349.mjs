import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 349, `KOUROSH_SOURCE_VERSION must be v349 or successor; found ${version}`);

const resolver = read('server/miniapp/miniAppIdentityResolver.ts');
assert.match(resolver, /export const selectMiniAppWorkspace/);
assert.match(resolver, /requestedKind/);
assert.match(resolver, /workspace\.kind === "manager"/);
assert.match(resolver, /kind: "staff"/);
assert.match(resolver, /workspaces: identity\.workspaces/);
assert.doesNotMatch(resolver, /requestedSubjectId|workspaceSubjectId/);

const routes = read('server/routes/miniapp.routes.ts');
assert.match(routes, /req\.body\?\.workspaceKind/);
assert.match(routes, /MINIAPP_WORKSPACE_INVALID/);
assert.match(routes, /MINIAPP_WORKSPACE_ACCESS_REQUIRED/);
assert.match(routes, /selectMiniAppWorkspace\(resolvedIdentity, requestedWorkspace\)/);
assert.doesNotMatch(routes, /req\.body\?\.(?:subjectId|customerId|partnerId).*selectMiniAppWorkspace/);

const client = read('miniapp/apiClient.ts');
assert.match(client, /workspaceKind\?/);
assert.match(client, /workspaceKind \? \{ workspaceKind \}/);

const auth = read('miniapp/auth/MiniAppAuthContext.tsx');
assert.match(auth, /switchWorkspace: \(kind: MiniAppWorkspaceKind\) => Promise<boolean>/);
assert.match(auth, /authenticateMiniApp\(webApp\.initData, undefined, kind\)/);

const permission = read('miniapp/permission/MiniAppPermissionContext.tsx');
assert.match(permission, /permissions: ReadonlySet<string>/);
assert.match(permission, /canPermission/);

const app = read('miniapp/App.tsx');
for (const page of [
  'ManagerHome', 'ManagerDirectory', 'ManagerCustomerDetail', 'ManagerPartnerDetail',
  'ManagerDues', 'ManagerOperations', 'ManagerSales', 'ManagerInstallmentDetail',
]) assert.ok(app.includes(page), `Manager page route missing: ${page}`);
assert.match(app, /identity\?\.kind === "staff"/);
assert.match(app, /can\("customers\.read"\)/);
assert.match(app, /can\("partners\.read"\)/);
assert.match(app, /can\("installments\.read"\)/);
assert.match(app, /can\("repairs\.read"\) \|\| can\("inventory\.read"\)/);
assert.match(app, /can\("sales\.read"\) \|\| can\("profits\.read"\)/);
// Existing personal workspaces remain routed through their original pages.
assert.ok(app.includes('<PartnerHome />'));
assert.ok(app.includes('<CustomerHome />'));

const shell = read('miniapp/components/MiniAppShell.tsx');
assert.match(shell, /مدیریت فروشگاه/);
assert.match(shell, /حساب همکار من/);
assert.match(shell, /حساب مشتری من/);
assert.match(shell, /switchWorkspace\(kind\)/);
assert.match(shell, /workspaces\.length > 1/);
assert.match(shell, /dashboard\.read/);
assert.match(shell, /customers\.read/);
assert.match(shell, /profits\.read/);

const managerPages = [
  ['miniapp/pages/ManagerHome.tsx', '/api/miniapp/manager/dashboard'],
  ['miniapp/pages/ManagerDirectory.tsx', '/api/miniapp/manager/'],
  ['miniapp/pages/ManagerCustomerDetail.tsx', '/api/miniapp/manager/customers/'],
  ['miniapp/pages/ManagerPartnerDetail.tsx', '/api/miniapp/manager/partners/'],
  ['miniapp/pages/ManagerDues.tsx', '/api/miniapp/manager/installments/due'],
  ['miniapp/pages/ManagerOperations.tsx', '/api/miniapp/manager/'],
  ['miniapp/pages/ManagerSales.tsx', '/api/miniapp/manager/sales-summary'],
  ['miniapp/pages/ManagerInstallmentDetail.tsx', '/api/miniapp/manager/installments/'],
];
for (const [file, endpoint] of managerPages) {
  const source = read(file);
  assert.ok(source.includes(endpoint), `${file} must use ${endpoint}`);
  assert.doesNotMatch(source, /\/api\/miniapp\/staff\//, `${file} must use granular manager APIs instead of legacy staff API`);
}

const gateway = read('server/miniapp/miniAppGatewayPolicy.mjs');
assert.match(gateway, /pathname\.startsWith\("\/api\/miniapp\/manager\/"\)/);

const worker = read('deployment/cloudflare-pages/_worker.js');
assert.match(worker, /workspaceKind/);
assert.match(worker, /requestedWorkspace/);
assert.match(worker, /isManagerAssociatedIdentity/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
if (number >= 362 || worker.includes("manager_snapshots")) {
  // v362+: Manager read-only workspaces may switch against explicit, permission-filtered snapshots.
  // Legacy /staff endpoints and every manager mutation remain live-only.
  assert.match(worker, /!\["manager", "customer", "partner"\]\.includes\(requestedWorkspace\)/);
  assert.match(worker, /identityFromSnapshots/);
  assert.match(worker, /requestedRevoked/);
  assert.match(worker, /manager_snapshots/);
  assert.match(worker, /Legacy staff endpoints stay live-only/);
  assert.match(worker, /authenticatedManagerMutation/);
  assert.match(worker, /MINIAPP_MANAGER_PERMISSION_REQUIRED/);
} else {
  assert.match(worker, /تغییر فضای کاری فقط هنگام اتصال زنده فعال است/);
  assert.match(worker, /workspace\?\.kind === "manager"/);
  const explicitSwitchGuardIndex = worker.indexOf('if (requestedWorkspace)');
  const snapshotLookupIndex = worker.indexOf('getSnapshot(db, tenant.tenantId, "customer", subjectKey)');
  assert.ok(explicitSwitchGuardIndex >= 0 && snapshotLookupIndex > explicitSwitchGuardIndex, 'Explicit workspace switch must fail before D1 snapshot lookup');
}

const edgeSchema = read('deployment/cloudflare-pages/schema/0001_edge_snapshot.sql');
assert.doesNotMatch(edgeSchema, /manager_permissions|manager_ledger|manager_profit|manager_dashboard|manager_customers|manager_partners/i);

const cssFiles = fs.readdirSync('miniapp', { recursive: true }).filter((name) => String(name).endsWith('.css'));
assert.ok(cssFiles.length <= 1, `Stage 4 must not introduce scattered MiniApp CSS; found ${cssFiles.length} CSS files`);

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.scripts?.['audit:telegram-management-stage4-v349'], 'node scripts/audit-telegram-management-stage4-v349.mjs');
assert.equal(pkg.scripts?.['test:telegram-management-stage4-gateway-v349'], 'node scripts/test-telegram-management-stage4-gateway-v349.mjs');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:telegram-management-stage4-v349/);
assert.match(String(pkg.scripts?.['audit:release'] || ''), /test:telegram-management-stage4-gateway-v349/);

console.log('Telegram Management Center Stage 4 v349 source audit passed');
