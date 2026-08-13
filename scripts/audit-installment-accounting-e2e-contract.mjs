import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const mustInclude = (source, needles, label) => {
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${label} must include: ${needle}`);
  }
};
const mustNotInclude = (source, needles, label) => {
  for (const needle of needles) {
    assert.ok(!source.includes(needle), `${label} must not include legacy pattern: ${needle}`);
  }
};

const db = read('server/db/domains/installments.db.ts');
const accounting = read('server/db/domains/installmentAccounting.db.ts');
const ledger = read('server/db/domains/installmentLedger.db.ts');
const schema = read('server/db/schema/installments.schema.ts');
const cashflow = read('server/db/domains/reports/cashflowReports.db.ts');
const auditRoute = read('server/routes/reportAudit.routes.ts');
const auditEngine = read('server/reportFinancialAudit.ts');
const collections = read('server/utils/productSalesReports/productSalesCollectionsReport.ts');
const realized = read('server/utils/productSalesReports/productSalesRealizedProfitReport.ts');
const collectionCenter = read('server/utils/collectionCenterHelpers.ts');
const routes = read('server/routes/installments.routes.ts');
const validator = read('server/validators.ts');
const page = read('pages/AddInstallmentSalePage.tsx');
const checkTypes = read('server/db/domains/installmentTypes.ts');
const customerInsights = read('server/repositories/customerLedgerInsights.repo.ts');
const productRisk = read('server/utils/productSalesReports/productSalesRiskReport.ts');
const analytics = read('server/routes/reportAnalytics.routes.ts');
const installmentsRepo = read('server/repositories/installments.repo.ts');
const partnerReads = read('server/repositories/partnerReads.repo.ts');
const partnerLedgerReads = read('server/repositories/partnerLedgerReads.repo.ts');
const detailPage = read('pages/InstallmentSaleDetailPage.tsx');
const notifications = read('server/routes/notifications.routes.ts');

mustInclude(schema, [
  'saleDateISO TEXT',
  'ALTER TABLE installment_sales ADD COLUMN saleDateISO TEXT',
  'existingSaleColumns',
  'sourceType TEXT NOT NULL DEFAULT \'installment\'',
  'sourceId INTEGER',
], 'Installment schema');

mustInclude(db, [
  'saleType === "installment" && nInst > 0 && instAmt > 0',
  'Math.abs(scheduledTotal - remainingDebt) > 0.00001',
  'Math.abs(checksTotal - expectedCheckDebt) > 0.00001',
  'removeInstallmentSaleCustomerLedger',
  'syncInstallmentCheckCustomerLedger',
  'syncCheckRecoveryLedgerForPayment(paymentId)',
  'تاریخ فروش نمی‌تواند در آینده باشد',
  'تاریخ دریافت نمی‌تواند در آینده باشد',
], 'Installment database');

mustInclude(accounting, [
  "referenceType = 'installment_check_cashed'",
  'getCheckRecoveryCollectedAmount',
  'getInstallmentSaleReceivableState',
  'collectedAfterDownPayment',
  'overpayment',
  'syncCheckRecoveryLedgerForPayment',
  'assertInstallmentReceiptDateOnOrAfterSale',
  'تاریخ دریافت نمی‌تواند در آینده باشد',
], 'Installment accounting bridge');

mustInclude(ledger, [
  "referenceType = 'installment_check_cashed'",
  'syncInstallmentCheckCustomerLedger',
  'normalizeInstallmentAccountingDate',
], 'Installment ledger reconciliation');

mustInclude(cashflow, [
  "LOWER(COALESCE(referenceType, '')) NOT IN",
  'installment_cancellation_reversal',
  'installment_cancellation_downpayment_refund_due',
  'downPayment',
  'normalizeInstallmentAccountingDate',
], 'Cashflow report');

mustInclude(auditRoute, [
  'scheduledAmount',
  'checkScheduledAmount',
  'cashedCheckRemainder',
  'COALESCE(ins.saleDateISO, ins.dateCreated)',
], 'Financial audit route');
mustInclude(auditEngine, [
  'const scheduledDebt = isCheckSale ? n(sale.checkScheduledAmount) : n(sale.scheduledAmount)',
  'const collected = n(sale.downPayment) + n(sale.paidAmount) + n(sale.cashedCheckRemainder)',
  '0.00001',
], 'Financial audit engine');

for (const [label, source] of [
  ['Product collections', collections],
  ['Realized profit', realized],
]) {
  mustInclude(source, [
    'COALESCE(ins.saleDateISO, ins.dateCreated)',
    'installment_check_cashed',
    "LOWER(COALESCE(cl.referenceType,'')) NOT IN",
    'installment_cancellation_reversal',
    'installment_cancellation_downpayment_refund_due',
  ], label);
  mustNotInclude(source, [
    'COALESCE(ins.dateCreated, ins.installmentsStartDate)',
  ], label);
}

mustInclude(collectionCenter, [
  'MAX(0, COALESCE(ip.amountDue,0) - COALESCE((',
  "COALESCE(ip.sourceType,'installment') = 'installment'",
  "ip.sourceType = 'check_recovery' AND ip.sourceId = ic.id",
  "checkSale.saleType = 'check'",
  'accountingOutstanding',
  'Number(row.accountingOutstanding || 0)',
  'COALESCE(ins.saleDateISO, ins.dateCreated',
], 'Collection center');


mustInclude(checkTypes, [
  '"نقدشده", "وصول شده", "پاس شده", "تسویه شده"',
  'return "نقد شد"',
], 'Check status normalizer');
mustInclude(schema, [
  "status='نقد شد' WHERE TRIM(COALESCE(status,'')) IN",
  "'پاس شده','تسویه شده','نقدشده'",
], 'Legacy check status migration');

mustInclude(customerInsights, [
  "COALESCE(ip.sourceType,'installment') = 'installment'",
  'MAX(0, COALESCE(ip.amountDue,0) - COALESCE((',
  "rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id",
  "NOT IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده'",
], 'Customer ledger insights');

mustInclude(productRisk, [
  'COUNT(CASE WHEN x.remainingAmount > 0.00001 THEN 1 END) AS unpaidCount',
  'MAX(0, COALESCE(ip.amountDue,0) - COALESCE((',
  "rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id",
  'cur.unpaidAmount = Math.max(installmentOpen, checkOpen)',
], 'Product sales collection risk');

mustInclude(routes, [
  "app.put(\n    '/api/installment-sales/check/:id',\n    authorizeRole(INSTALLMENT_ROLES)",
  'وضعیت قسط فقط از روی تراکنش‌های واقعی مشتق می‌شود',
], 'Installment routes');

mustInclude(validator, [
  'تاریخ فروش نمی‌تواند در آینده باشد',
  'تاریخ شروع اقساط نمی‌تواند قبل از تاریخ فروش باشد',
  'جمع مبلغ چک‌ها باید دقیقاً با مانده قرارداد برابر باشد',
], 'Installment validator');
mustInclude(page, [
  "errors.saleDate = 'تاریخ فروش نمی‌تواند در آینده باشد.'",
  'Math.abs(checkTotal - remainingAfterDownPayment) > 0.00001',
], 'Installment create page');

const dateSensitiveFiles = [
  'server/routes/financialOverviewReports.routes.ts',
  'server/reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallments.service.ts',
  'server/db/domains/reports/phoneSalesReports.db.ts',
  'server/db/domains/reports/inventoryTurnoverReports.db.ts',
  'server/repositories/inventoryLedger.repo.ts',
  'server/db/domains/profitSnapshots.db.ts',
];
for (const file of dateSensitiveFiles) {
  const source = read(file);
  assert.ok(
    source.includes('saleDateISO'),
    `${file} must use the normalized installment accounting date`,
  );
}


mustInclude(db, [
  'externalCollectionToAllocate',
  'externalCovered',
  'applySaleLevelReceiptsToInstallmentRows',
  'overpaymentAmount: receivableState.overpayment',
], 'Sale-level receivable projection');

mustInclude(installmentsRepo, [
  'getInstallmentSaleReceivableState',
  'state.remaining > 0.00001 ? 1 : 0',
], 'Installment finalization state');

mustInclude(analytics, [
  'COALESCE(s.actualSalePrice,0) - COALESCE(s.downPayment,0)',
  "rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id",
], 'Debt snapshot sale-level balance');

mustInclude(partnerReads, [
  'INSTALLMENT_SALE_HAS_OPEN_RECEIVABLE_SQL',
  'COALESCE(isale.actualSalePrice,0) - COALESCE(isale.downPayment,0)',
], 'Partner open receivable state');

mustInclude(partnerLedgerReads, [
  'LATEST_PHONE_INSTALLMENT_SALE_ID_SQL',
  'installmentSaleCheckPaidAmount',
  "rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id",
], 'Partner installment settlement');

mustInclude(detailPage, [
  'saleData.overpaymentAmount',
  "sourceType: 'check_recovery'",
  'cashPaymentId',
  'cashedLedgerAmount',
  "sourceType: 'check_cashed'",
  'externalCovered',
  'پوشش از وصول چک',
], 'Installment detail accounting UI');

mustInclude(notifications, [
  'effectivePendingInstallments',
  'getPendingInstallmentPaymentsWithCustomer',
  'COALESCE(s.actualSalePrice,0) - COALESCE(s.downPayment,0)',
  "rp2.sourceType = 'check_recovery' AND rp2.sourceId = ic2.id",
], 'Installment notifications sale-level balance');
console.log('Installment accounting E2E contract audit passed: exact schedule/check totals, atomic ledger bridge, no installment receipt double-count, partial-balance collection/risk logic, canonical legacy check statuses, and normalized accounting dates.');
