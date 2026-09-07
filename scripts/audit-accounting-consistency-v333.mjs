import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const version = read('KOUROSH_SOURCE_VERSION').trim();
const ledger = read('server/db/ledgerBalanceConsistency.ts');
const partnerMut = read('server/repositories/partnerLedgerMutations.repo.ts');
const partnerEdit = read('server/repositories/partnerLedgerEditDelete.repo.ts');
const customerMut = read('server/repositories/customerLedgerMutations.repo.ts');
const customerEdit = read('server/repositories/customerLedgerEditDelete.repo.ts');
const partnerReads = read('server/repositories/partnerLedgerReads.repo.ts');
const settlement = read('server/services/partnerSettlementAtomicSubmitService.ts');
const ownership = read('server/db/ownershipConsistency.ts');
const phones = read('server/db/domains/phones.db.ts');
const products = read('server/db/domains/products.db.ts');
const ownershipReview = read('server/repositories/storeOwnershipReviewQueue.repo.ts');
const phoneCost = read('server/db/phoneCostBasis.ts');
const profit = read('server/db/domains/profitSnapshots.db.ts');
const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
const center = read('server/db/domains/accountingReconciliationCenter.db.ts');
const reportBoundary = read('server/repositories/partnerOwnershipReportBoundary.repo.ts');
const mobileAnalytics = read('server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallments.service.ts');
const pkg = JSON.parse(read('package.json'));

const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 333, `KOUROSH_SOURCE_VERSION must be v333 or successor; found ${version}`);

assert.ok(ledger.includes('SUM(COALESCE(credit,0) - COALESCE(debit,0))'), 'Partner canonical balance must be movement based');
assert.ok(ledger.includes('SUM(COALESCE(debit,0) - COALESCE(credit,0))'), 'Customer canonical balance must be movement based');
assert.ok(ledger.includes('ORDER BY datetime(COALESCE(transactionDate, createdAt, updatedAt)) ASC, id ASC'), 'Ledger cache rebuild must use accounting chronology');
assert.ok(ledger.includes('v_customer_effective_balance'), 'Customer cache rebuild must preserve effective-balance adjustment');

assert.ok(partnerMut.includes('getPartnerLedgerCanonicalBalance(partnerId)'), 'Partner inserts must not chain from stale last-row balance');
assert.ok(partnerMut.includes('rebuildPartnerLedgerBalanceCache(partnerId)'), 'Partner inserts must rebuild row balance cache');
assert.ok(partnerEdit.includes('rebuildPartnerLedgerBalanceCache(partnerId)'), 'Partner edit/delete must rebuild row balance cache');
assert.ok(customerMut.includes('getCustomerLedgerRawCanonicalBalance(customerId)'), 'Customer inserts must use canonical raw balance');
assert.ok(customerMut.includes('rebuildCustomerLedgerBalanceCache(customerId)'), 'Customer inserts must rebuild row balance cache');
assert.ok(customerEdit.includes('rebuildCustomerLedgerBalanceCache(customerId)'), 'Customer edit/delete must rebuild row balance cache');
assert.ok(settlement.includes('getPartnerLedgerCanonicalBalance(partnerId)'), 'Partner settlement must start from canonical balance');
assert.ok(settlement.includes('rebuildPartnerLedgerBalanceCache(partnerId)'), 'Partner settlement must rebuild chronological cache');

assert.ok(partnerReads.includes('getPartnerLedgerCanonicalBalance'), 'Partner ledger read-model must expose canonical balance');
assert.ok(partnerReads.includes('latestBalance: Number(canonicalBalance || 0)'), 'Partner summary must not trust a last-row cache');
assert.ok(!partnerReads.includes('SELECT balance FROM display_partner_ledger ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate))'), 'Old latest cached-balance read must be removed');

assert.ok(ownership.includes("new Set(['legacy_supplier_backfill', 'supplier_auto', 'supplier_sync'])"), 'Only known automatic ownership methods may be overwritten');
assert.ok(ownership.includes('protectedManual'), 'Manual ownership decisions must be protected');
assert.ok(phones.includes('syncSupplierAutoOwnership("phone"'), 'Phone supplier changes must sync automatic ownership');
assert.ok(products.includes('syncSupplierAutoOwnership("product"'), 'Product supplier changes must sync automatic ownership');
if (versionNumber >= 338) {
  // v338 deliberately forbids current asset edits from rewriting historical sale facts.
  assert.ok(!phones.includes('rebuildProfitSnapshotsForItem("phone"'), 'v338 phone edits must not rebuild historical profit snapshots');
  assert.ok(!products.includes('rebuildProfitSnapshotsForItem("inventory"'), 'v338 product edits must not rebuild historical profit snapshots');
  assert.ok(!ownershipReview.includes('rebuildProfitSnapshotsForItem("phone"'), 'v338 manual phone ownership review must not rewrite historical snapshots');
  assert.ok(!ownershipReview.includes('rebuildProfitSnapshotsForItem("inventory"'), 'v338 manual product ownership review must not rewrite historical snapshots');
  assert.doesNotMatch(phoneCost, /UPDATE\s+(?:sales_transactions|sales_order_items|installment_sale_items)/i, 'v338 phone cost sync must never UPDATE historical sale documents');
  assert.ok(!reconciliation.includes('reconcileAllPhoneCostBasisDocuments()'), 'v338 startup repair must not normalize historical documents from current phone cost');
  assert.ok(profit.includes('backfills missing snapshots'), 'v338 source reconciliation must be missing-only');
  assert.ok(profit.includes('sale_profit_capital_allocations'), 'v338 capital attribution must be frozen at sale');
  const ownershipPos = reconciliation.indexOf('reconcileSupplierAutoOwnership()');
  const profitPos = reconciliation.indexOf('rebuildAllProfitSnapshotsFromSources()');
  assert.ok(ownershipPos > 0 && profitPos > ownershipPos, 'v338 startup repair order must preserve current ownership first, then only backfill missing historical snapshots');
} else {
  assert.ok(phones.includes('rebuildProfitSnapshotsForItem("phone"'), 'Phone ownership/cost changes must rebuild profit snapshots');
  assert.ok(products.includes('rebuildProfitSnapshotsForItem("inventory"'), 'Product ownership/cost changes must rebuild profit snapshots');
  assert.ok(ownershipReview.includes('rebuildProfitSnapshotsForItem("phone"'), 'Manual phone ownership review must rebuild profit snapshots');
  assert.ok(ownershipReview.includes('rebuildProfitSnapshotsForItem("inventory"'), 'Manual product ownership review must rebuild profit snapshots');
  assert.ok(phoneCost.includes('reconcileAllPhoneCostBasisDocuments'), 'Startup must be able to normalize historical phone sale cost documents');
  const ownershipPos = reconciliation.indexOf('reconcileSupplierAutoOwnership()');
  const phoneCostPos = reconciliation.indexOf('reconcileAllPhoneCostBasisDocuments()');
  const profitPos = reconciliation.indexOf('rebuildAllProfitSnapshotsFromSources()');
  assert.ok(ownershipPos > 0 && phoneCostPos > ownershipPos && profitPos > phoneCostPos, 'Startup repair order must be ownership -> phone cost basis -> profit rebuild');
}
assert.ok(profit.includes('rebuildSalesOrderProfitSnapshots'), 'Sales-order profit snapshot backfill helper must exist');
assert.ok(profit.includes('rebuildProfitSnapshotsForItem'), 'Per-item missing-snapshot backfill helper must exist');
assert.ok(profit.includes('rebuildAllProfitSnapshotsFromSources'), 'All-source missing-snapshot backfill helper must exist');
assert.ok(profit.includes('updateSaleProfitSnapshotSourceStatus("sales_order", orderId, "canceled")'), 'Canceled cash sales must not remain active in profit');
assert.ok(profit.includes('updateSaleProfitSnapshotSourceStatus("installment_sale", saleId, "canceled")'), 'Canceled installment sales must not remain active in profit');
assert.ok(reconciliation.includes('rebuildAllLedgerBalanceCaches()'), 'Startup reconciliation must rebuild all ledger caches');
assert.ok(reconciliation.includes("issueType: 'partner_ledger_cache_drift'"), 'Partner cache drift must be audited');
assert.ok(reconciliation.includes("issueType: 'customer_ledger_cache_drift'"), 'Customer cache drift must be audited');
assert.ok(reconciliation.includes("issueType: 'profit_snapshot_missing_allocation'"), 'Missing profit allocations must be audited');
assert.ok(reconciliation.includes("issueType: 'profit_snapshot_cost_drift'"), 'Profit cost-basis drift must be audited');
assert.ok(reconciliation.includes("issueType: 'ledger_date_outlier'"), 'Implausible accounting dates must be surfaced instead of silently shifting periods');
assert.ok(reconciliation.includes("automaticRepairAllowed: false"), 'Ambiguous historical data must remain human-review only');

assert.ok(center.includes('.filter((row) => !liveKeys.has(String(row.issueKey)))'), 'Active persisted derived issues must remain visible in reconciliation center');
assert.ok(center.includes('profit_snapshot_missing_allocation'), 'Reconciliation center must quantify missing-allocation exposure');
assert.ok(reportBoundary.includes('range?.toDateIso ||'), 'Current partner reports must have a safe default upper date');
assert.ok(reportBoundary.includes("return now.toISOString().slice(0, 10)"), 'Default report upper date must be today, not an unbounded future');
assert.ok(mobileAnalytics.includes('v_customer_effective_balance'), 'Mobile sales analytics must use canonical effective customer balance');

assert.equal(pkg.scripts['audit:accounting-consistency-v333'], 'node scripts/audit-accounting-consistency-v333.mjs', 'v333 audit script must be registered');
assert.ok(String(pkg.scripts['audit:release'] || '').includes('audit:accounting-consistency-v333'), 'v333 audit must be included in release gate');
assert.equal(pkg.scripts.prebuild, 'npm run prepare:production-styles', 'prebuild must remain lightweight');

console.log('v333 accounting consistency + derived-state repair audit passed.');
