import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 337, `KOUROSH_SOURCE_VERSION must be v337 or successor; found ${version}`);

const schema = read('server/db/schema/audit.schema.ts');
const governance = read('server/accounting/accountingGovernance.ts');
const migrations = read('server/utils/migrationRunner.ts');
const backup = read('server/backup.ts');
const reconciliationRoute = read('server/routes/accountingReconciliation.routes.ts');
const reconciliationUi = read('pages/AccountingReconciliationCenter.tsx');
const partnerRoute = read('server/routes/partners.routes.ts');
const partnerController = read('pages/partnerDetail/PartnerDetailController.tsx');
const partnerBreakdownUi = read('pages/partnerDetail/PartnerAccountingBreakdownSection.tsx');
const pkg = JSON.parse(read('package.json'));

// SQLite-level closed-period enforcement.
assert.match(schema, /CREATE TABLE IF NOT EXISTS accounting_period_locks/, 'accounting period lock registry must exist');
assert.match(schema, /CREATE TABLE IF NOT EXISTS accounting_period_snapshots/, 'versioned historical snapshot registry must exist');
assert.match(schema, /trg_accounting_period_snapshots_no_update/, 'historical snapshots must reject updates');
assert.match(schema, /trg_accounting_period_snapshots_no_delete/, 'historical snapshots must reject deletes');
assert.match(schema, /sales_orders[^\n]*NEW\.transactionDate/, 'sales_orders period lock must use transactionDate');
assert.match(schema, /sales_order_items[^\n]*sales_orders[^\n]*transactionDate/, 'cash-sale line items must inherit parent transactionDate');
assert.match(schema, /installment_sale_items[^\n]*installment_sales/, 'installment-sale line items must inherit parent accounting date');
assert.match(schema, /installment_transactions[^\n]*NEW\.payment_date/, 'installment receipt transactions must be period locked by real payment date');
assert.match(schema, /sale_profit_allocations_period_lock_insert/, 'profit allocations must not mutate closed-period snapshots');
assert.doesNotMatch(governance, /salesOrdersTotal:[^\n]*\btotalPrice\b/, 'sales_orders historical total must never use legacy totalPrice');
assert.match(governance, /salesOrdersTotal:[^\n]*grandTotal/, 'sales_orders historical total must use grandTotal');
assert.match(governance, /sales_orders[^\n]*transactionDate/, 'sales_orders snapshot filter must use transactionDate');

// Versioned and hashed historical snapshots.
assert.match(governance, /MAX\(version\),0\)\+1 AS nextVersion/, 'historical snapshots must increment versions');
assert.match(governance, /sha256Text\(payloadJson\)/, 'snapshot payload must be SHA256 hashed');
assert.match(governance, /accounting_period_closed/, 'period close must leave immutable accounting audit evidence');
assert.match(governance, /BEGIN IMMEDIATE TRANSACTION/, 'period close and snapshot must be atomic');
assert.match(governance, /ROLLBACK;/, 'failed period close must rollback');

// Migration registry drift detection.
assert.match(migrations, /sha256 TEXT/, 'schema_migrations must store SHA256');
assert.match(migrations, /createHash\("sha256"\)/, 'migration file checksum must be computed from source bytes');
assert.match(migrations, /checksum mismatch/, 'migration checksum drift must hard fail');
assert.match(migrations, /UPDATE schema_migrations SET sha256/, 'legacy migration rows must receive a baseline checksum');

// Backups are hash-addressable evidence and Repair is hard-gated by a verified pre-backup.
assert.match(backup, /computeFileSha256/, 'backup SHA256 helper must exist');
assert.match(backup, /\.sha256/, 'backup checksum sidecar must be written');
assert.match(backup, /checksumVerified/, 'backup checksum must be verified before success');
assert.match(reconciliationRoute, /pre-accounting-repair/, 'safe Repair must create a dedicated pre-repair backup');
assert.match(reconciliationRoute, /safetyBackup\.checksumVerified/, 'safe Repair must refuse an unverified backup');

// Irreversible accounting actions require two HTTP steps.
assert.match(reconciliationRoute, /\/api\/accounting-reconciliation\/prepare-action/, 'two-step accounting challenge endpoint must exist');
assert.match(reconciliationRoute, /consumeAccountingConfirmation\(req\.body\?\.confirmationToken, 'safe_repair'/, 'Repair must consume a one-time challenge');
assert.match(reconciliationRoute, /consumeAccountingConfirmation\(req\.body\?\.confirmationToken, 'close_period'/, 'period close must consume a one-time challenge');
assert.match(governance, /randomBytes\(24\)/, 'challenge tokens must use cryptographic randomness');
assert.match(governance, /5 \* 60_000/, 'challenge must expire quickly');

// Governance health is visible in the real UI.
assert.match(governance, /getAccountingGovernanceHealth/, 'governance health read model must exist');
assert.match(reconciliationRoute, /governanceHealth/, 'reconciliation API must expose governance health');
assert.match(reconciliationUi, /سلامت حاکمیت حسابداری/, 'accounting governance dashboard must be visible');
assert.match(reconciliationUi, /بستن دوره حسابداری/, 'period close control must be exposed');
assert.match(reconciliationUi, /تأیید نهایی و اجرای Repair/, 'Repair UI must visibly require a second step');

// Partner receivable / profit / payments stay separate and drill down to forming evidence.
assert.match(governance, /supplierReceivable/, 'partner supplier receivable must be computed separately');
assert.match(governance, /profitShareAccrued/, 'partner profit allocation must be computed separately');
assert.match(governance, /totalPayments/, 'partner ledger reductions/payments must be exposed');
assert.match(governance, /profitAllocations:/, 'profit allocation evidence must be returned');
assert.match(partnerRoute, /\/api\/partners\/:id\/accounting-breakdown/, 'partner accounting breakdown endpoint must exist');
assert.match(partnerController, /accounting-breakdown/, 'PartnerDetail must fetch the accounting breakdown');
assert.match(partnerBreakdownUi, /طلب تأمین‌کنندگی همکار/, 'supplier receivable must have an explicit UI number');
assert.match(partnerBreakdownUi, /Drill-down طلب تأمین‌کنندگی/, 'supplier receivable must open to all forming ledger movements');
assert.match(partnerBreakdownUi, /Drill-down سهم سود \/ مالکیت/, 'profit allocation number must open to its forming documents');

assert.equal(pkg.scripts['audit:accounting-governance-v337'], 'node scripts/audit-accounting-governance-v337.mjs');
assert.equal(pkg.scripts['test:accounting-governance-v337'], 'node --no-warnings server/tests/accountingGovernanceV337.test.mjs');
if (versionNumber === 337) {
  assert.ok(String(pkg.scripts['audit:release'] || '').endsWith('npm run audit:accounting-governance-v337'), 'v337 governance audit must be the final v337 audit:release gate');
} else {
  assert.ok(String(pkg.scripts['audit:release'] || '').includes('npm run audit:accounting-governance-v337'), 'successors must retain the v337 governance gate');
}

console.log('v337 accounting governance source audit passed.');
