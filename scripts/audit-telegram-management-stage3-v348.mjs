import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 348, `KOUROSH_SOURCE_VERSION must be v348 or successor; found ${version}`);

const routes = read('server/routes/miniapp.routes.ts');
const managerEndpoints = [
  '/api/miniapp/manager/me',
  '/api/miniapp/manager/dashboard',
  '/api/miniapp/manager/sales-summary',
  '/api/miniapp/manager/customers',
  '/api/miniapp/manager/customers/:id',
  '/api/miniapp/manager/customers/:id/ledger',
  '/api/miniapp/manager/customers/:id/purchases',
  '/api/miniapp/manager/customers/:id/installments',
  '/api/miniapp/manager/partners',
  '/api/miniapp/manager/partners/:id',
  '/api/miniapp/manager/partners/:id/ledger',
  '/api/miniapp/manager/partners/:id/purchases',
  '/api/miniapp/manager/partners/:id/settlements',
  '/api/miniapp/manager/partners/:id/accounting-breakdown',
  '/api/miniapp/manager/installments/due',
  '/api/miniapp/manager/installments/:saleId',
  '/api/miniapp/manager/repairs',
  '/api/miniapp/manager/repairs/:id',
  '/api/miniapp/manager/inventory/phones',
  '/api/miniapp/manager/inventory/phones/:id',
  '/api/miniapp/manager/invoices/:invoiceRef',
];
for (const endpoint of managerEndpoints) {
  assert.ok(routes.includes(endpoint), `Manager endpoint missing: ${endpoint}`);
}
assert.match(routes, /app\.use\("\/api\/miniapp\/manager", \.\.\.managerGuards\)/);
assert.match(routes, /requireStaffPermissions\(\["dashboard\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["customers\.read", "customers\.ledger\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["partners\.read", "partners\.ledger\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["partners\.read", "partners\.ledger\.read", "profits\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["repairs\.read"\]\)/);
assert.match(routes, /requireStaffPermissions\(\["inventory\.read"\]\)/);
assert.match(routes, /requireAnyStaffPermission\(\["sales\.read", "profits\.read"\]\)/);
assert.match(routes, /MINIAPP_MANAGER_CUSTOMER_LEDGER_VIEWED/);
assert.match(routes, /MINIAPP_MANAGER_PARTNER_LEDGER_VIEWED/);
assert.match(routes, /MINIAPP_MANAGER_PARTNER_ACCOUNTING_VIEWED/);

const service = read('server/services/miniAppManager.service.ts');
for (const canonicalImport of [
  './customers.service',
  './partners.service',
  './miniAppCustomer.service',
  './miniAppPartner.service',
  './miniAppStaff.service',
  './miniAppStaffReadModels',
  '../db/domains/repairs.db',
  '../accounting/accountingGovernance',
]) assert.ok(service.includes(canonicalImport), `Canonical Source-of-Truth import missing: ${canonicalImport}`);
assert.match(service, /hasPermission\(permissions, "profits\.read"\)/);
assert.match(service, /hasPermission\(permissions, "customers\.ledger\.read"\)/);
assert.match(service, /hasPermission\(permissions, "partners\.ledger\.read"\)/);
assert.match(service, /getSalesSummaryAndProfit/);
assert.match(service, /getPartnerAccountingBreakdown/);
assert.match(service, /getAllRepairsFromDb/);
assert.doesNotMatch(service, /cloudflare|subject_snapshots|D1|telegram_bot_token/i);

const policy = read('server/security/managementAccessPolicy.ts');
assert.match(policy, /hasAllManagementPermissions/);
assert.match(policy, /hasAnyOfManagementPermissions/);

const identityResolver = read('server/miniapp/miniAppIdentityResolver.ts');
assert.match(identityResolver, /workspaces/);
assert.match(identityResolver, /kind: "manager"/);

const worker = read('deployment/cloudflare-pages/_worker.js');
assert.ok(worker.includes('url.pathname.startsWith("/api/miniapp/manager/")'));
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
const edgeSchema = read('deployment/cloudflare-pages/schema/0001_edge_snapshot.sql');
assert.doesNotMatch(edgeSchema, /manager_permissions|manager_ledger|manager_profit|manager_dashboard|manager_customers/i);

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.scripts?.['audit:telegram-management-stage3-v348'], 'node scripts/audit-telegram-management-stage3-v348.mjs');
assert.equal(pkg.scripts?.['test:telegram-management-stage3-permissions-v348'], 'node --experimental-strip-types scripts/test-telegram-management-stage3-permissions-v348.mjs');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:telegram-management-stage3-v348/);
assert.match(String(pkg.scripts?.['audit:release'] || ''), /test:telegram-management-stage3-permissions-v348/);

console.log('Telegram Management Center Stage 3 v348 source audit passed');
