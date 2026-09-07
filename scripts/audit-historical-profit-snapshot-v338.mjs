import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 338, `KOUROSH_SOURCE_VERSION must be v338 or successor; found ${version}`);

const migration = read('server/migrations/2026-09-04-sale-profit-historical-freeze.sql');
const phoneSchema = read('server/db/schema/phones.schema.ts');
const auditSchema = read('server/db/schema/audit.schema.ts');
const profit = read('server/db/domains/profitSnapshots.db.ts');
const sales = read('server/db/domains/sales.db.ts');
const phoneCost = read('server/db/phoneCostBasis.ts');
const phones = read('server/db/domains/phones.db.ts');
const products = read('server/db/domains/products.db.ts');
const ownershipReview = read('server/repositories/storeOwnershipReviewQueue.repo.ts');
const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
const partnerReport = read('server/db/domains/reports/partnerBusinessReports.db.ts');
const summaryReport = read('server/db/domains/reports/salesSummaryProfitReports.db.ts');
const phoneReport = read('server/db/domains/reports/phoneSalesReports.db.ts');
const profitabilityReport = read('server/db/domains/reports/profitabilityInventoryReports.db.ts');
const turnoverReport = read('server/db/domains/reports/inventoryTurnoverReports.db.ts');
const pkg = JSON.parse(read('package.json'));

// Schema + migration: facts that can change today are frozen onto the sale snapshot.
for (const token of [
  'supplierIdAtSale', 'supplierNameAtSale', 'ownershipSharesJson',
  'profitShareSharesJson', 'snapshotVersion', 'snapshotState',
  'sourceCostBasis', 'frozenAt', 'sale_profit_capital_allocations',
]) {
  assert.ok(migration.includes(token), `v338 migration must contain ${token}`);
  assert.ok(phoneSchema.includes(token), `fresh schema must contain ${token}`);
}
assert.match(migration, /legacy_baseline/, 'pre-v338 facts must be explicitly labelled as a legacy baseline');
assert.match(migration, /legacy_profile_baseline_v338/, 'legacy capital ownership baseline must carry provenance');

// Current sale capture freezes supplier/profile/cost at source creation time.
assert.match(sales, /supplierIdAtSale:/, 'cash sale snapshot must freeze supplier');
assert.match(sales, /sourceCostBasis:\s*"sales_order_item_buy_price"/, 'cash sale snapshot must record its cost-basis provenance');
assert.match(profit, /JSON\.stringify\(ctx\.ownershipItems\)/, 'ownership shares must be serialized into the snapshot');
assert.match(profit, /JSON\.stringify\(ctx\.profitShareItems\)/, 'profit-share percentages must be serialized into the snapshot');
assert.match(profit, /INSERT INTO sale_profit_capital_allocations/, 'capital attribution must be persisted independently of mutable profiles');
assert.match(profit, /input\.snapshotState \|\| "frozen_at_sale"/, 'new snapshots must be frozen at sale');
assert.match(profit, /legacy_sale_document_buy_price/, 'legacy reconstruction must use persisted sale-document evidence');
assert.match(profit, /legacy_reconstructed/, 'legacy reconstruction must be distinguishable from native frozen-at-sale evidence');

// Backfill is INSERT-ONCE; asset edits can never fan out into historical rewrites.
assert.match(profit, /SELECT COUNT\(\*\) AS count FROM sale_profit_snapshots WHERE sourceKind = 'installment_sale'/, 'installment snapshot capture must detect existing history');
assert.match(profit, /SELECT COUNT\(\*\) AS count FROM sale_profit_snapshots WHERE sourceKind = 'sales_order'/, 'cash-sale backfill must detect existing history');
assert.match(profit, /if \(Number\(existing\?\.count \|\| 0\) > 0\) return;/, 'existing snapshots must not be rebuilt in place');
assert.doesNotMatch(phoneCost, /UPDATE\s+(?:sales_transactions|sales_order_items|installment_sale_items)/i, 'phone cost helper must not rewrite historical sale documents');
assert.ok(!phones.includes('rebuildProfitSnapshotsForItem("phone"'), 'editing a phone today must not rebuild old sale snapshots');
assert.ok(!products.includes('rebuildProfitSnapshotsForItem("inventory"'), 'editing a product today must not rebuild old sale snapshots');
assert.ok(!ownershipReview.includes('rebuildProfitSnapshotsForItem('), 'ownership review today must not rewrite old sale snapshots');

// SQLite rejects direct financial rewrite of native v338 snapshots.
assert.match(auditSchema, /trg_sale_profit_snapshots_frozen_financial_update/, 'frozen snapshot UPDATE guard must exist');
assert.match(auditSchema, /frozen sale profit snapshot cannot be rewritten/, 'frozen snapshot guard must hard fail');
assert.match(auditSchema, /trg_sale_profit_capital_allocations_period_lock_insert/, 'capital allocations must inherit closed-period protection');
assert.match(auditSchema, /trg_sale_profit_capital_allocations_period_lock_update/, 'capital allocation updates must be period locked');
assert.match(auditSchema, /trg_sale_profit_capital_allocations_period_lock_delete/, 'capital allocation deletes must be period locked');

// Reconciliation reports historical mismatch; it never "fixes" history from today's card values.
assert.ok(!reconciliation.includes('reconcileAllPhoneCostBasisDocuments()'), 'startup reconciliation must not sync current phone cost into historical documents');
assert.match(reconciliation, /historicalSnapshotMustNotFollowCurrentAssetPrice:\s*true/, 'drift audit must explicitly preserve historical snapshot truth');
assert.match(reconciliation, /profit_snapshot_legacy_baseline/, 'legacy baseline uncertainty must be visible for human review');
assert.match(reconciliation, /automaticRepairAllowed:\s*false/, 'ambiguous historical facts must not auto-repair');

// Historical partner attribution comes from frozen allocations, never the current ownership profile.
assert.match(partnerReport, /JOIN sale_profit_capital_allocations spca/, 'partner historical capital must use frozen allocation rows');
assert.doesNotMatch(partnerReport, /sps\.ownershipProfileId[\s\S]{0,180}ownership_profile_items/, 'partner historical report must not resolve snapshot ownership through current profile rows');

// Core historical profit reports must not let today's currentPurchasePrice override persisted sale evidence.
const historicalReports = [summaryReport, phoneReport, profitabilityReport, turnoverReport];
for (const [index, text] of historicalReports.entries()) {
  assert.doesNotMatch(text, /COALESCE\(NULLIF\(ph\.currentPurchasePrice,\s*0\),\s*NULLIF\((?:soi|isi|st)\.buyPrice/,
    `historical report ${index + 1} must not prefer current phone price over sale-line buyPrice`);
}
assert.doesNotMatch(summaryReport, /NULLIF\(soi\.buyPrice,\s*0\),\s*p\.purchasePrice/, 'sales summary must not fall back from a sale line to current product cost');
assert.doesNotMatch(profitabilityReport, /NULLIF\((?:soi|isi|st)\.buyPrice,\s*0\),\s*p\.purchasePrice/, 'profitability history must not fall back to current product cost');
assert.doesNotMatch(turnoverReport, /(?:soi|isi)\.quantity[^\n]*p\.purchasePrice[^\n]*as cogs/i, 'ABC historical COGS must not use current product purchasePrice');

assert.equal(pkg.scripts['audit:historical-profit-snapshot-v338'], 'node scripts/audit-historical-profit-snapshot-v338.mjs');
assert.equal(pkg.scripts['audit:release-toolchain-v338'], 'node scripts/release/audit-release-toolchain-v338.mjs');
if (versionNumber === 338) {
  assert.ok(String(pkg.scripts['audit:release'] || '').endsWith('npm run audit:historical-profit-snapshot-v338'), 'v338 historical snapshot audit must be the final v338 release gate');
} else {
  assert.ok(String(pkg.scripts['audit:release'] || '').includes('npm run audit:historical-profit-snapshot-v338'), 'successors must retain the v338 historical snapshot gate');
}

console.log('v338 immutable historical sale-profit snapshot audit passed.');
