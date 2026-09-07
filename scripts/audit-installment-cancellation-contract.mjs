import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const must = (src, needle, label) => assert.ok(src.includes(needle), `${label} missing: ${needle}`);
const mustNot = (src, needle, label) => assert.ok(!src.includes(needle), `${label} contains forbidden pattern: ${needle}`);

const schema = read('server/db/schema/installments.schema.ts');
const cancellation = read('server/db/domains/installmentCancellation.db.ts');
const installmentsDb = read('server/db/domains/installments.db.ts');
const accounting = read('server/db/domains/installmentAccounting.db.ts');
const routes = read('server/routes/installments.routes.ts');
const service = read('server/services/installments.service.ts');
const listPage = read('pages/InstallmentSalesPage.tsx');
const detailPage = read('pages/InstallmentSaleDetailPage.tsx');
const modal = read('components/InstallmentCancellationModal.tsx');
const reconciliation = read('server/db/migrations/legacyAccountingReconciliation.ts');
const collectionCenter = read('server/utils/collectionCenterHelpers.ts');
const notifications = read('server/routes/notifications.routes.ts');
const followups = read('server/routes/followupsInstallmentsReports.routes.ts');
const outbox = read('server/routes/notificationOutbox.routes.ts');
const dashboard = read('server/db/domains/reports/dashboardReports.db.ts');
const phoneReport = read('server/db/domains/reports/phoneSalesReports.db.ts');
const inventoryReport = read('server/db/domains/reports/inventoryTurnoverReports.db.ts');
const profitability = read('server/db/domains/reports/profitabilityInventoryReports.db.ts');
const realized = read('server/utils/productSalesReports/productSalesRealizedProfitReport.ts');
const collections = read('server/utils/productSalesReports/productSalesCollectionsReport.ts');
const cashflow = read('server/db/domains/reports/cashflowReports.db.ts');
const ledgerEditDelete = read('server/repositories/customerLedgerEditDelete.repo.ts');
const ledgerInsights = read('server/repositories/customerLedgerInsights.repo.ts');

for (const needle of [
  "status TEXT NOT NULL DEFAULT 'active'",
  'canceledAt TEXT',
  'cancelReason TEXT',
  'cancellationMode TEXT',
  'cancellationSettlementStatus TEXT',
  'CREATE TABLE IF NOT EXISTS installment_sale_cancellations',
  'saleId INTEGER NOT NULL UNIQUE',
  'snapshotJson TEXT',
]) must(schema, needle, 'schema');

for (const needle of [
  'getInstallmentCancellationPreviewFromDb',
  'cancelInstallmentSaleFromDb',
  'BEGIN TRANSACTION;',
  'COMMIT;',
  'ROLLBACK;',
  "status = 'canceled'",
  "installment_cancellation_reversal",
  "installment_cancellation_downpayment_refund_due",
  'updateSaleProfitSnapshotSourceStatus',
  'returnPhysicalItems',
  'returnUnusedChecks',
  'unresolvedRows',
  'alreadyReturnedRows',
  'needs_reconciliation',
  'assertInstallmentSaleIsMutable',
  'assertInstallmentPaymentIsMutable',
  'assertInstallmentCheckIsMutable',
]) must(cancellation, needle, 'cancellation domain');

// Cancellation must preserve financial history rather than deleting it.
for (const forbidden of [
  'DELETE FROM installment_transactions',
  'DELETE FROM installment_payments',
  'DELETE FROM installment_checks',
  'DELETE FROM customer_ledger',
]) mustNot(cancellation, forbidden, 'cancellation domain');

must(installmentsDb, "!== 'draft'", 'hard-delete guard');
must(routes, "/api/installment-sales/:id/cancellation/preview", 'routes');
must(routes, "/api/installment-sales/:id/cancel", 'routes');
must(routes, "status(409)", 'hard-delete route');
must(service, 'قرارداد نهایی اقساطی حذف نمی‌شود', 'service hard-delete policy');

for (const needle of [
  'layout="horizontal"',
  'فسخ با تسویه و تطبیق باز',
  'برگشت کامل و قابل‌اثبات',
  'فسخ با وجود مغایرت مجاز است',
  'تاریخچه پرداخت، چک و اسناد قبلی حذف نمی‌شود',
]) must(modal, needle, 'cancellation modal');
mustNot(modal, 'app-card', 'cancellation modal');

must(listPage, 'InstallmentCancellationModal', 'installment list UI');
must(listPage, 'فسخ قرارداد', 'installment list UI');
must(detailPage, 'این قرارداد فسخ شده است', 'installment detail freeze');
must(detailPage, 'cancellationSettlementStatus', 'installment cancellation summary');
must(accounting, 'remaining: canceled ? 0', 'receivable cancellation state');

// Canceled contracts remain visible/auditable but must stop producing active debt reminders and active-sale KPIs.
for (const [label, src] of [
  ['collection center', collectionCenter],
  ['notifications', notifications],
  ['followups', followups],
  ['notification outbox', outbox],
  ['dashboard', dashboard],
  ['phone sales report', phoneReport],
  ['inventory turnover', inventoryReport],
  ['profitability report', profitability],
  ['realized profit report', realized],
  ['collections report', collections],
]) {
  assert.ok(/COALESCE\([^\n]*status[^\n]*active/.test(src), `${label} must explicitly exclude canceled installment contracts from active projections`);
}

// Cancellation ledger entries are accounting reversals/liabilities, not cash receipts.
for (const [label, src] of [
  ['cashflow', cashflow],
  ['product collections', collections],
  ['realized profit', realized],
  ['last customer payment', ledgerInsights],
]) {
  must(src, 'installment_cancellation_reversal', `${label} non-cash exclusion`);
  must(src, 'installment_cancellation_downpayment_refund_due', `${label} non-cash exclusion`);
}

// System-generated cancellation entries must remain immutable in the customer ledger.
must(ledgerEditDelete, 'assertCancellationLedgerEntryMutable', 'cancellation ledger immutability');
must(ledgerEditDelete, 'این سند سیستمیِ فسخ بخشی از تاریخچه حسابداری قرارداد است و قابل ویرایش یا حذف نیست', 'cancellation ledger immutability');

for (const needle of [
  'canceled_sale_financial_review_required',
  'canceled_sale_physical_items_not_returned',
  'canceled_sale_physical_return_unresolved',
  'canceled_sale_unused_checks_not_returned',
  'canceled_sale_receipt_ledger_gap',
]) must(reconciliation, needle, 'reconciliation guard');

console.log('PASS: Installment cancellation/reversal contract — non-destructive cancellation, immutable history, reversal ledger, inventory/check confirmations, reconciliation flags, mutation freeze, and active-report/reminder exclusion.');
