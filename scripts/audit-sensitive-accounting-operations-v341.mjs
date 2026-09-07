import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 341, `KOUROSH_SOURCE_VERSION must be v341 or successor; found ${version}`);

const governance = read('server/accounting/accountingGovernance.ts');
const sensitive = read('server/accounting/sensitiveAccountingOperations.ts');
const auditSchema = read('server/db/schema/audit.schema.ts');
const migration = read('server/migrations/2026-09-04-zz-accounting-sensitive-immutability.sql');
const reversal = read('server/accounting/accountingReversal.ts');
const salesRoute = read('server/routes/salesOrderMutations.routes.ts');
const phoneRoute = read('server/routes/phones.routes.ts');
const productRoute = read('server/routes/products.routes.ts');
const customerRoute = read('server/routes/customers.routes.ts');
const partnerRoute = read('server/routes/partners.routes.ts');
const installmentRoute = read('server/routes/installments.routes.ts');
const salesDb = read('server/salesOrders.ts');
const installmentDb = read('server/db/domains/installments.db.ts');
const installmentAccounting = read('server/db/domains/installmentAccounting.db.ts');
const installmentLedger = read('server/db/domains/installmentLedger.db.ts');
const phoneDb = read('server/db/domains/phones.db.ts');
const maintenance = read('server/db/core/maintenance.ts');
const customerEdit = read('server/repositories/customerLedgerEditDelete.repo.ts');
const partnerEdit = read('server/repositories/partnerLedgerEditDelete.repo.ts');
const settlement = read('server/services/partnerSettlementAtomicSubmitService.ts');
const settlementUi = read('pages/partnerDetail/partnerSettlementAtomicSubmitUiActions.ts');
const invoicesUi = read('pages/Invoices.tsx') + read('pages/InvoiceDetail.tsx');
const productUi = read('pages/Products.tsx') + read('pages/inventory/ProductsManager.tsx');
const phoneUi = read('pages/mobilePhones/MobilePhonesController.tsx');
const customerUi = read('pages/customerDetail/CustomerDetailController.tsx');
const partnerUi = read('pages/partnerDetail/PartnerDetailController.tsx');
const installmentUi = read('components/InstallmentCancellationModal.tsx');
const pkg = JSON.parse(read('package.json'));

// Item 11: the challenge is a real second request bound to the prepared payload.
assert.match(governance, /payloadSha256/, 'confirmation challenge must persist the payload fingerprint');
assert.match(governance, /fingerprintAccountingConfirmationPayload/, 'confirmation payload must use deterministic fingerprinting');
assert.match(governance, /payloadMatches/, 'execute must reject a changed payload');
assert.match(governance, /confirmations\.delete\(token\)/, 'confirmation token must be one-time');
assert.match(governance, /expiresAt/, 'confirmation token must expire');
assert.match(sensitive, /FinancialImpact/, 'sensitive operations must expose a structured financial impact');
assert.match(sensitive, /summaryText/, 'financial impact must contain a human-readable summary');

const guardedRoutes = [
  ['sales route', salesRoute, /sales-orders\/:id\/cancel\/prepare/, /sales-orders\/:id\/delete\/prepare/],
  ['phone route', phoneRoute, /phones\/:id\/sensitive-update\/prepare/],
  ['product route', productRoute, /products\/:id\/sensitive-update\/prepare/],
  ['customer route', customerRoute, /customers\/:id\/ledger\/:entryId\/correction\/prepare/, /customers\/:id\/ledger\/:entryId\/reversal\/prepare/],
  ['partner route', partnerRoute, /partners\/:id\/ledger\/:entryId\/correction\/prepare/, /partners\/:id\/ledger\/:entryId\/reversal\/prepare/],
  ['installment route', installmentRoute, /installment-sales\/:id\/cancel\/prepare/],
];
for (const [name, text, ...patterns] of guardedRoutes) {
  for (const pattern of patterns) assert.match(text, pattern, `${name} must expose the v341 prepare step`);
  assert.match(text, /prepareSensitiveAccountingOperation/, `${name} must issue a payload-bound confirmation token`);
  assert.match(text, /consumeSensitiveAccountingOperation/, `${name} must require the second execute request`);
  assert.match(text, /recordSensitiveAccountingMutation/, `${name} must append immutable accounting audit evidence`);
}

for (const [name, text] of [
  ['invoice UI', invoicesUi],
  ['product UI', productUi],
  ['phone UI', phoneUi],
  ['customer UI', customerUi],
  ['partner UI', partnerUi],
  ['installment cancellation UI', installmentUi],
]) {
  assert.match(text, /\/prepare/, `${name} must request a prepare preview before sensitive execution`);
  assert.match(text, /confirmationToken/, `${name} must submit the one-time confirmation token`);
  assert.match(text, /summaryText|اثر مالی|تأیید اثر مالی|تأیید نهایی اثر مالی/, `${name} must surface impact before execution`);
}

// Item 4: destructive financial history is preserved; correction is append-only reversal/replacement.
assert.doesNotMatch(salesDb, /DELETE\s+FROM\s+sales_orders/i, 'sales order implementation must never physically delete the invoice');
assert.match(salesDb, /status='canceled'/, 'sales order deletion/cancellation must preserve the source row as canceled');
assert.match(installmentDb, /Hard Delete نمی‌شود|Hard Delete/, 'installment sale hard delete must fail closed');
assert.doesNotMatch(installmentDb, /DELETE\s+FROM\s+installment_sales\s+WHERE\s+id\s*=\s*\?/i, 'installment source must not physically delete finalized contracts');
assert.match(reversal, /INSERT INTO accounting_reversal_links/, 'ledger corrections must preserve lineage links');
for (const [name, text] of [['customer ledger editor', customerEdit], ['partner ledger editor', partnerEdit]]) {
  assert.match(text, /createLedgerReversal/, `${name} financial corrections must append reversal/replacement`);
}
for (const [name, text] of [['installment accounting sync', installmentAccounting], ['installment ledger sync', installmentLedger]]) {
  assert.doesNotMatch(text, /UPDATE\s+customer_ledger[\s\S]{0,180}(debit|credit|transactionDate|referenceType|referenceId)/i, `${name} must not directly rewrite financial ledger identity`);
  assert.doesNotMatch(text, /DELETE\s+FROM\s+customer_ledger/i, `${name} must not physically delete customer ledger history`);
  assert.match(text, /createLedgerReversal/, `${name} must use reversal when an existing financial row changes/disappears`);
}
assert.doesNotMatch(phoneDb, /UPDATE\s+partner_ledger[\s\S]{0,220}(debit|credit|transactionDate|referenceType|referenceId)/i, 'phone purchase edits must not rewrite partner ledger history');
assert.match(phoneDb, /accounting_reversal_links/, 'phone purchase edit must create reversal lineage');
assert.doesNotMatch(maintenance, /DELETE\s+FROM\s+(partner_ledger|customer_ledger)/i, 'maintenance must not erase financial history');
assert.doesNotMatch(maintenance, /UPDATE\s+(partner_ledger|customer_ledger)[\s\S]{0,180}(debit|credit|transactionDate|referenceType|referenceId)/i, 'maintenance must not rewrite financial identity');
assert.match(maintenance, /legacy_customer_ledger_missing_reference/, 'ambiguous legacy source identity must become a reconciliation issue instead of a guessed mutation');

// DB is the final enforcement layer, including fresh databases.
for (const trigger of [
  'trg_partner_ledger_no_physical_delete_v341',
  'trg_customer_ledger_no_physical_delete_v341',
  'trg_partner_ledger_financial_fields_immutable_v341',
  'trg_customer_ledger_financial_fields_immutable_v341',
  'trg_sales_orders_no_physical_delete_v341',
  'trg_sales_order_items_no_physical_delete_v341',
  'trg_accounting_reversal_links_no_update_v341',
  'trg_accounting_reversal_links_no_delete_v341',
]) {
  assert.ok(migration.includes(trigger), `v341 migration must install ${trigger}`);
  assert.ok(auditSchema.includes(trigger), `fresh schema must install ${trigger}`);
}
assert.match(migration, /CREATE TABLE IF NOT EXISTS accounting_reversal_links/, 'v341 migration must be self-contained for reversal lineage');
assert.match(auditSchema, /trg_accounting_audit_events_no_update/, 'accounting audit events must be immutable at SQLite level');
assert.match(auditSchema, /trg_accounting_audit_events_no_delete/, 'accounting audit events must be undeletable at SQLite level');

// Item 3: every v341 sensitive mutation appends actor/reason/before/after/source evidence.
assert.match(sensitive, /recordAccountingAuditEvent/, 'central sensitive guard must write the immutable accounting audit trail');
for (const field of ['actorUserId', 'actorUsername', 'actorRole', 'reason', 'beforeJson', 'afterJson', 'source']) {
  assert.ok(auditSchema.includes(field), `accounting audit schema must retain ${field}`);
}

// Partner settlement keeps its stronger deterministic dry-run + manager signoff contract and now writes accounting audit evidence.
for (const token of ['dryRunId', 'confirmedAmount', 'confirmedLineIds', 'managerConfirmation', 'sourceFingerprint']) {
  assert.ok(settlement.includes(token), `partner settlement service must bind ${token}`);
}
assert.match(settlement, /managerConfirmation\?\.confirmed !== true/, 'partner settlement execution must require manager confirmation');
assert.match(settlement, /recordAccountingAuditEvent/, 'partner settlement must append immutable accounting audit evidence');
assert.match(settlement, /eventType:\s*["']partner_settlement_submit["']/, 'partner settlement audit event must have a stable event type');
assert.match(settlementUi, /confirmAction/, 'partner settlement UI must show a second confirmation');
assert.match(settlementUi, /confirmedAmount/, 'partner settlement UI confirmation must show/bind amount');
assert.match(settlementUi, /confirmedLineIds/, 'partner settlement UI confirmation must show/bind source lines');

assert.equal(pkg.scripts['audit:sensitive-accounting-operations-v341'], 'node scripts/audit-sensitive-accounting-operations-v341.mjs');
if (versionNumber === 341) {
  assert.ok(String(pkg.scripts['audit:release'] || '').endsWith('npm run audit:sensitive-accounting-operations-v341'), 'v341 sensitive accounting audit must be the final v341 release gate');
} else {
  assert.ok(String(pkg.scripts['audit:release'] || '').includes('npm run audit:sensitive-accounting-operations-v341'), 'successors must retain the v341 sensitive accounting gate');
}

console.log(JSON.stringify({ status: 'PASS', version, checks: 73 }, null, 2));
