import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 336, `KOUROSH_SOURCE_VERSION must be v336 or successor; found ${version}`);

const engine = read('server/accounting/accountingEngine.ts');
const sharedCore = versionNumber >= 339 ? read('shared/accounting/accountingCore.ts') : '';
const auditTrail = read('server/accounting/accountingAuditTrail.ts');
const reversal = read('server/accounting/accountingReversal.ts');
const schema = read('server/db/schema/audit.schema.ts');
const ledgerBalance = read('server/db/ledgerBalanceConsistency.ts');
const customerMut = read('server/repositories/customerLedgerMutations.repo.ts');
const partnerMut = read('server/repositories/partnerLedgerMutations.repo.ts');
const customerEdit = read('server/repositories/customerLedgerEditDelete.repo.ts');
const partnerEdit = read('server/repositories/partnerLedgerEditDelete.repo.ts');
const sales = read('server/db/domains/sales.db.ts');
const maintenance = read('server/db/core/maintenance.ts');
const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
const reconciliationRead = read('server/db/domains/accountingReconciliationCenter.db.ts');
const reconciliationRoute = read('server/routes/accountingReconciliation.routes.ts');
const reconciliationUi = read('pages/AccountingReconciliationCenter.tsx');
const partnerRoutes = read('server/routes/partners.routes.ts');
const customerRoutes = read('server/routes/customers.routes.ts');
const pkg = JSON.parse(read('package.json'));

// One accounting engine owns movement semantics and canonical balance.
const movementContractSource = versionNumber >= 339 ? sharedCore : engine;
assert.match(movementContractSource, /AccountingLedgerKind = "partner" \| "customer"/, 'central accounting ledger kind contract must exist');
assert.match(movementContractSource, /allowBalancedPair\?: boolean/, 'balanced zero-net system movement policy must be explicit');
assert.match(movementContractSource, /direction: "debit" \| "credit" \| "balanced"/, 'normalized movement must model balanced system visibility rows');
assert.match(movementContractSource, /if \(normalized\.direction === "balanced"\) return 0/, 'balanced system visibility row must have zero canonical delta');
assert.match(engine, /getCanonicalAccountingBalance/, 'canonical accounting balance must live in central engine');
assert.match(ledgerBalance, /getCanonicalAccountingBalance\("partner"/, 'partner balance must delegate to central engine');
assert.match(ledgerBalance, /getCanonicalAccountingBalance\("customer"/, 'customer balance must delegate to central engine');
assert.match(ledgerBalance, /accountingMovementDelta\("partner"/, 'partner cache rebuild must use central movement semantics');
assert.match(ledgerBalance, /accountingMovementDelta\("customer"/, 'customer cache rebuild must use central movement semantics');

// Manual forms remain one-sided; system zero-net rows require a real source reference.
assert.match(customerMut, /allowBalancedPair: false/, 'manual customer entry must reject balanced debit+credit');
assert.match(customerMut, /origin: "system" \| "manual" = "system"/, 'customer ledger must distinguish manual from system origin');
assert.match(partnerMut, /allowBalancedPair: false/, 'manual partner entry must remain one-sided');
if (versionNumber >= 340) {
  assert.match(customerMut, /manualFallbackType: ""/, 'successor customer system entries must require an explicit source reference');
  assert.match(partnerMut, /manualFallbackType: ""/, 'successor partner system entries must require an explicit source reference');
  assert.match(customerMut, /createManualAccountingDocument/, 'manual customer entry must create a first-class immutable source');
  assert.match(partnerMut, /createManualAccountingDocument/, 'manual partner entry must create a first-class immutable source');
  assert.match(customerMut, /referenceType: "manual_accounting_document"/, 'manual customer ledger must reference its immutable source document');
  assert.match(partnerMut, /"manual_accounting_document"/, 'manual partner ledger must reference its immutable source document');
} else {
  assert.match(customerMut, /origin === "manual"[\s\S]*referenceType: null, referenceId: null/, 'manual description must not spoof a system source reference');
  assert.match(customerMut, /system_unclassified_customer_entry/, 'unclassified system customer entries must not masquerade as manual');
  assert.match(partnerMut, /system_unclassified_partner_entry/, 'unclassified system partner entries must not masquerade as manual');
}
assert.match(sales, /referenceType: "sales_transaction_charge"/, 'legacy sale transactions must carry explicit source references');
assert.match(maintenance, /'sales_transaction_charge'/, 'maintenance-created legacy sales ledger rows must carry explicit references');
assert.match(maintenance, /'sales_order_charge'/, 'maintenance-created sales order ledger rows must carry explicit references');

// DB invariants survive future UI bugs, while known system net-zero rows remain valid.
assert.match(schema, /trg_partner_ledger_movement_insert_guard/, 'partner DB movement insert guard must exist');
assert.match(schema, /trg_customer_ledger_movement_insert_guard/, 'customer DB movement insert guard must exist');
assert.match(schema, /BEFORE UPDATE OF debit, credit, referenceType ON customer_ledger/, 'customer reference changes must also be checked by movement guard');
assert.match(schema, /sales_order_charge','sales_transaction_charge','installment_charge/, 'known balanced system references must be explicitly allowlisted');
assert.match(schema, /DROP TRIGGER IF EXISTS/, 'successor releases must replace stale guard definitions');

// Immutable accounting audit evidence.
assert.match(schema, /CREATE TABLE IF NOT EXISTS accounting_audit_events/, 'immutable accounting audit table must exist');
assert.match(schema, /trg_accounting_audit_events_no_update/, 'accounting audit events must reject updates');
assert.match(schema, /trg_accounting_audit_events_no_delete/, 'accounting audit events must reject deletes');
assert.match(auditTrail, /recordAccountingAuditEvent/, 'accounting audit writer must exist');
assert.match(customerMut, /if \(origin === "manual"\) await auditEvent/, 'manual customer creation must require audit write');
if (versionNumber >= 340) {
  assert.match(partnerMut, /if \(reference\.referenceType === "manual_accounting_document"\) await auditEvent/, 'manual partner source document creation must require audit write');
} else {
  assert.match(partnerMut, /if \(reference\.referenceType === "manual_partner_entry"\) await auditEvent/, 'manual partner creation must require audit write');
}

// Manual financial changes are reversal-based, source-linked documents are protected.
assert.match(schema, /CREATE TABLE IF NOT EXISTS accounting_reversal_links/, 'reversal link registry must exist');
assert.match(reversal, /BEGIN IMMEDIATE TRANSACTION/, 'reversal + replacement + audit must be atomic');
assert.match(reversal, /ledger_corrected_by_reversal/, 'replacement correction must be audit-trailed as reversal');
assert.match(reversal, /ROLLBACK;/, 'failed reversal must roll back atomically');
assert.match(customerEdit, /createLedgerReversal/, 'customer financial edit/delete must use reversal path');
assert.match(partnerEdit, /createLedgerReversal/, 'partner financial edit/delete must use reversal path');
assert.match(customerEdit, /باید از همان بخش منبع اصلاح شود/, 'customer source-linked documents must reject direct financial edits');
assert.match(partnerEdit, /باید از همان بخش منبع اصلاح شود/, 'partner source-linked documents must reject direct financial edits');
assert.match(customerEdit, /جهت تراکنش دفتر مشتری در ویرایش قابل تغییر نیست/, 'customer edit must prevent accidental direction flip');
assert.match(partnerEdit, /جهت تراکنش دفتر در ویرایش قابل تغییر نیست/, 'partner edit must preserve direction lock');

// Reconciliation center is live, can repair only deterministic state, and audits the run atomically.
assert.match(reconciliation, /issueType: 'invalid_ledger_movement'/, 'invalid ledger movement must be surfaced for human review');
assert.match(reconciliation, /detectAllAccountingReconciliationIssues/, 'combined reconciliation detector must exist');
assert.match(reconciliation, /options\?\.audit[\s\S]*recordAccountingAuditEvent[\s\S]*COMMIT/, 'manual safe repair must write audit evidence before commit');
assert.match(reconciliationRead, /detectAllAccountingReconciliationIssues\(\)/, 'reconciliation page must use live detector');
assert.match(reconciliationRead, /safeRepairable/, 'reconciliation summary must distinguish safe-repairable issues');
assert.match(reconciliationRead, /accounting_audit_events/, 'reconciliation center must expose audit trail health');
assert.match(reconciliationRoute, /\/api\/accounting-reconciliation\/repair-safe/, 'safe repair endpoint must exist');
assert.match(reconciliationRoute, /audit: true/, 'safe repair endpoint must require atomic audit event');
assert.match(reconciliationUi, /اصلاح امن/, 'reconciliation UI must expose safe repair action');
assert.match(reconciliationUi, /رویدادهای Audit غیرقابل‌ویرایش/, 'reconciliation UI must disclose immutable audit trail count');
assert.match(reconciliationUi, /invalid_ledger_movement/, 'reconciliation UI must explain invalid movement issues');

// API errors should fail safely as 4xx rather than surfacing as a generic 500.
assert.match(partnerRoutes, /مرجع سیستمی/, 'partner ledger route must classify forged system references as validation errors');
assert.match(customerRoutes, /مرجع سیستمی/, 'customer ledger route must classify forged system references as validation errors');

assert.equal(pkg.scripts.prebuild, 'npm run prepare:production-styles', 'prebuild must remain lightweight');
assert.equal(pkg.scripts['audit:accounting-safety-v336'], 'node scripts/audit-accounting-safety-foundation-v336.mjs', 'v336 audit script must be registered');
assert.ok(String(pkg.scripts['audit:release'] || '').includes('npm run audit:accounting-safety-v336'), 'v336 audit must remain in the release gate chain');

console.log('v336 accounting safety foundation audit passed.');
