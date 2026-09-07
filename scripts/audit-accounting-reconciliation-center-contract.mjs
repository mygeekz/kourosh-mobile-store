import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
};

const page = read('pages/AccountingReconciliationCenter.tsx');
const route = read('server/routes/accountingReconciliation.routes.ts');
const domain = read('server/db/domains/accountingReconciliationCenter.db.ts');
const manifest = read('app/routes/routeManifest.tsx');
const access = read('app/routes/routeAccessMatrix.ts');
const nav = read('constants.tsx');
const migration = read('server/db/migrations/legacyAccountingReconciliation.ts');

assert(route.includes('app.get(') && route.includes('/api/accounting-reconciliation'), 'Read-only reconciliation GET API must exist.');
assert(!/app\.(post|put|patch|delete)\s*\(/.test(route), 'Reconciliation API route must not expose mutation endpoints.');
assert(route.includes('authorizeRole(["Admin", "Manager"])'), 'API must be restricted to Admin/Manager.');
assert(domain.includes('detectLegacyAccountingHumanReviewIssues'), 'Center must perform live read-only issue detection.');
assert(page.includes('layout="horizontal"'), 'Detail modal must use horizontal modal contract.');
assert(page.includes('فقط خواندنی') && page.includes('هیچ مبلغ، تاریخ یا سند مالی'), 'UI must state its read-only accounting contract.');
assert(!page.includes('app-card'), 'Legacy app-card contract must not be introduced.');
assert(manifest.includes("route('/accounting-reconciliation'"), 'App route must exist.');
assert(access.includes("effectivePath: '/accounting-reconciliation'"), 'Route access matrix must include reconciliation center.');
assert(nav.includes("id: 'accounting-reconciliation'"), 'Sidebar navigation must expose reconciliation center to allowed roles.');
assert(migration.includes('export const detectLegacyAccountingHumanReviewIssues'), 'Legacy detector must remain exported for live read-only audit.');

if (!process.exitCode) console.log('PASS: Accounting Reconciliation Center contract');
