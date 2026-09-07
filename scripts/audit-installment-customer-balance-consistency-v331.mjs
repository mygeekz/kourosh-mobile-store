import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 331, `KOUROSH_SOURCE_VERSION must be v331 or successor; found ${version}`);

const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
assert.ok(reconciliation.includes('CREATE VIEW v_customer_effective_balance AS'), 'v331 must create the canonical effective customer balance view');
assert.ok(reconciliation.includes('legacyCashedCheckAdjustment'), 'v331 effective balance must expose the proven legacy cashed-check adjustment');
assert.ok(reconciliation.includes("referenceType = 'installment_manual_receipt'"), 'v331 reconciliation must link exact manual installment receipts');
assert.ok(reconciliation.includes('linkExactManualReceiptsToCheckSaleGaps'), 'v331 must run the safe exact-gap manual receipt linker');
assert.ok(reconciliation.includes('manualReceiptTotal'), 'check-contract reconciliation must include linked manual receipts');
assert.ok(reconciliation.includes('automaticRepairAllowed: hasKnownCashDate'), 'unknown historical check cash dates must remain human-review-only');

const accounting = read('server/db/domains/installmentAccounting.db.ts');
assert.ok(accounting.includes('manualLedgerReceipt: number;'), 'receivable state must expose manual ledger receipts');
assert.ok(accounting.includes("referenceType = 'installment_manual_receipt'"), 'receivable calculation must read linked manual receipts');
assert.ok(accounting.includes('transactionPaid + cashedCheckRemainder + manualLedgerReceipt'), 'manual receipt must participate in remaining-balance calculation');
assert.ok(accounting.includes('if (!transactionDate) return;'), 'legacy cashed checks without a proven date must not get a fabricated ledger timestamp');

const directory = read('server/db/domains/installments.db.ts');
assert.ok(directory.includes('manual_receipt_by_sale AS ('), 'installment directory must aggregate linked manual receipts');
assert.ok(directory.includes("'manual_receipt' AS source"), 'installment directory must expose manual receipt as a collection source');
assert.ok(directory.includes('manualReceipts,'), 'installment detail payload must expose linked manual receipts');

const customerReads = read('server/repositories/customerReads.repo.ts');
assert.ok((customerReads.match(/v_customer_effective_balance/g) || []).length >= 5, 'customer profile/directory reads must consistently use effective balances');

const customerLedgerReads = read('server/repositories/customerLedgerReads.repo.ts');
assert.ok(customerLedgerReads.includes('legacyCashedCheckAdjustment'), 'customer ledger summary must disclose legacy effective-balance adjustment');

const debtorReport = read('server/db/domains/reports/debtorCreditorReports.db.ts');
assert.ok(debtorReport.includes('v_customer_effective_balance'), 'debtor report must use effective customer balances');

const miniApp = read('server/repositories/miniAppStaff.repo.ts');
assert.ok((miniApp.match(/v_customer_effective_balance/g) || []).length >= 3, 'mini app receivable/customer balance reads must use effective balances');

const telegramActions = read('server/routes/telegramCustomerActions.routes.ts');
const telegramRuntime = read('server/utils/telegramEventNotificationRuntime.ts');
assert.ok(telegramActions.includes('v_customer_effective_balance'), 'manual account-status Telegram action must use effective balance');
assert.ok(telegramRuntime.includes('v_customer_effective_balance'), 'event account-status notification must use effective balance');

const financialAudit = read('server/reportFinancialAudit.ts');
const reportRoute = read('server/routes/reportAudit.routes.ts');
assert.ok(financialAudit.includes('manualReceiptAmount'), 'financial audit math must include direct installment receipts');
assert.ok(reportRoute.includes("referenceType = 'installment_manual_receipt'"), 'financial audit route must load linked manual receipts');

const detailUi = read('pages/InstallmentSaleDetailPage.tsx');
const listUi = read('pages/InstallmentSalesPage.tsx');
assert.ok(detailUi.includes("sourceType: 'manual_receipt'"), 'installment detail timeline must show direct receipts');
assert.ok(listUi.includes("source === 'manual_receipt'"), 'installment list must label direct receipts');

const hero = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
assert.ok(hero.includes('legacyCashedCheckAdjustment'), 'customer profile must transparently disclose legacy cashed-check balance adjustment');

console.log('v331 installment/customer balance consistency audit passed.');
