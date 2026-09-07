import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 340, `KOUROSH_SOURCE_VERSION must be v340 or successor; found ${version}`);

const manualDoc = read('server/accounting/manualAccountingDocument.ts');
const customerMut = read('server/repositories/customerLedgerMutations.repo.ts');
const partnerMut = read('server/repositories/partnerLedgerMutations.repo.ts');
const customerEdit = read('server/repositories/customerLedgerEditDelete.repo.ts');
const partnerEdit = read('server/repositories/partnerLedgerEditDelete.repo.ts');
const reversal = read('server/accounting/accountingReversal.ts');
const migration = read('server/migrations/2026-09-04-z-accounting-reference-invariants.sql');
const migrationRunner = read('server/utils/migrationRunner.ts');
const schema = read('server/db/schema/audit.schema.ts');
const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
const reconciliationUi = read('pages/AccountingReconciliationCenter.tsx');
const customerController = read('pages/customerDetail/CustomerDetailController.tsx');
const customerModal = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const partnerController = read('pages/partnerDetail/PartnerDetailController.tsx');
const partnerModal = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const partnerRoute = read('server/routes/partners.routes.ts');
const pkg = JSON.parse(read('package.json'));

// Item 5: a manual payment is a real immutable source document, never an orphan ledger row.
assert.match(manualDoc, /CREATE|accounting_manual_documents|createManualAccountingDocument/, 'manual accounting source document service must exist');
assert.match(manualDoc, /reason\.length < 3/, 'standalone source reason must be mandatory');
assert.match(manualDoc, /manual_accounting_document_created/, 'manual source creation must be audited');
for (const [name, text] of [['customer mutation', customerMut], ['partner mutation', partnerMut]]) {
  assert.match(text, /referenceMode[^\n]*standalone|referenceMode\s*\|\|[^\n]*standalone/, `${name} must require explicit standalone mode`);
  assert.match(text, /createManualAccountingDocument/, `${name} must create a source document before ledger insertion`);
  assert.match(text, /manual_accounting_document/, `${name} ledger must reference the immutable manual source`);
}
assert.doesNotMatch(customerMut, /tryLinkExactInstallmentManualReceipt/, 'manual customer payments must not heuristically attach to installments');
for (const [name, text] of [['customer UI', customerController + customerModal], ['partner UI', partnerController + partnerModal]]) {
  assert.match(text, /referenceMode/, `${name} must expose explicit reference mode`);
  assert.match(text, /سند مستقل حسابداری/, `${name} must visibly identify standalone accounting documents`);
}
assert.match(partnerRoute, /\/api\/partners\/:id\/phone-settlements\/:phoneId\/payments/, 'phone settlement must have a source-specific route');
assert.match(partnerMut, /referenceType[\s\S]*phone_settlement_payment|"phone_settlement_payment"/, 'trusted phone settlement path must fix its source reference type');
assert.match(partnerController, /phone-settlements\/\$\{[^}]+\}\/payments/, 'PartnerDetail source settlement calls must use the dedicated endpoint');

// Existing manual source edits retain history by reversal+replacement.
for (const [name, text] of [['customer edit', customerEdit], ['partner edit', partnerEdit]]) {
  assert.match(text, /manual_accounting_document/, `${name} must recognize immutable manual source rows`);
  assert.match(text, /createLedgerReversal/, `${name} must correct immutable source rows by reversal`);
  assert.match(text, /createManualDocument:\s*true/, `${name} replacement must receive a new immutable source document`);
}
assert.match(reversal, /replacesDocumentId/, 'replacement source documents must retain lineage');

// Item 9: the existing DB gets the same invariants as a fresh schema.
for (const token of [
  'trg_partner_ledger_movement_insert_guard',
  'trg_customer_ledger_movement_insert_guard',
  'trg_customer_ledger_reference_insert_guard',
  'trg_partner_ledger_reference_insert_guard',
  'trg_customer_manual_document_reference_guard',
  'trg_partner_manual_document_reference_guard',
  'trg_sale_profit_allocation_insert_component_cap',
  'trg_sale_profit_allocation_active_source_guard',
  'trg_sale_profit_snapshot_status_cascade',
  'trg_installment_transactions_positive_insert',
  'trg_installment_checks_positive_insert',
  'trg_partner_settlement_positive_insert',
]) {
  assert.ok(migration.includes(token), `v340 migration must install ${token}`);
  assert.ok(schema.includes(token), `fresh schema must install ${token}`);
}
assert.match(migration, /CREATE TABLE IF NOT EXISTS sale_profit_capital_allocations/, 'v340 migration must be self-contained for capital status cascade');
assert.match(migration, /ABS\(COALESCE\(NEW\.amount,0\)\)/, 'allocation cap must support both profit and loss without allowing over-allocation');

// Migration runner must not split SQLite trigger bodies at internal semicolons.
assert.match(migrationRunner, /inTriggerBody/, 'migration splitter must track trigger bodies');
assert.match(migrationRunner, /triggerCaseDepth/, 'migration splitter must distinguish CASE END from trigger END');
assert.equal(pkg.scripts['test:migration-runner-v340'], 'node --experimental-strip-types server/tests/migrationRunnerV340.test.mjs');

// Item 2: daily reconciliation covers all newly-required cross-domain mismatch classes.
for (const issueType of [
  'ledger_missing_reference',
  'ledger_orphan_manual_reference',
  'sale_missing_primary_ledger',
  'supplier_owner_mismatch',
  'customer_zero_with_open_installments',
  'installments_settled_customer_debt',
]) {
  assert.ok(reconciliation.includes(issueType), `reconciliation detector must emit ${issueType}`);
  assert.ok(reconciliationUi.includes(issueType), `reconciliation UI must explain ${issueType}`);
}
for (const retainedIssue of [
  'partner_ledger_cache_drift', 'customer_ledger_cache_drift',
  'cashed_check_missing_ledger', 'profit_snapshot_missing_allocation',
  'profit_snapshot_cost_drift', 'ledger_date_outlier',
]) {
  assert.ok(reconciliation.includes(retainedIssue), `reconciliation must retain ${retainedIssue}`);
}
assert.match(reconciliation, /requiresHumanSourceAssignment:\s*true/, 'legacy orphan references must be human-reviewed rather than guessed');

assert.equal(pkg.scripts['audit:accounting-reference-reconciliation-v340'], 'node scripts/audit-accounting-reference-reconciliation-v340.mjs');
if (versionNumber === 340) {
  assert.ok(String(pkg.scripts['audit:release'] || '').endsWith('npm run audit:accounting-reference-reconciliation-v340'), 'v340 accounting reference/reconciliation audit must be the final v340 release gate');
} else {
  assert.ok(String(pkg.scripts['audit:release'] || '').includes('npm run audit:accounting-reference-reconciliation-v340'), 'successors must retain the v340 accounting reference/reconciliation gate');
}

console.log(JSON.stringify({ status: 'PASS', version, checks: 44 }, null, 2));
