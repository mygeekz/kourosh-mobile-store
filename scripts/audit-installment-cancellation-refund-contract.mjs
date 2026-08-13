import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireText = (file, pattern, label) => {
  const text = read(file);
  const ok = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (!ok) failures.push(`${file}: ${label}`);
};
const forbidText = (file, pattern, label) => {
  const text = read(file);
  const bad = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (bad) failures.push(`${file}: ${label}`);
};

requireText('server/db/schema/installments.schema.ts', 'CREATE TABLE IF NOT EXISTS installment_cancellation_refunds', 'refund transaction table is missing');
requireText('server/db/schema/installments.schema.ts', 'paymentMethod TEXT NOT NULL', 'refund payment method is not persisted');
requireText('server/db/domains/installmentCancellation.db.ts', 'BEGIN IMMEDIATE TRANSACTION', 'refund write is not concurrency-safe');
requireText('server/db/domains/installmentCancellation.db.ts', 'installment_cancellation_refund_payment', 'immutable ledger source for actual refund is missing');
requireText('server/db/domains/installmentCancellation.db.ts', 'recalcCustomerBalancesInternal', 'backdated refund does not recalculate customer balances');
requireText('server/db/domains/installmentCancellation.db.ts', 'amount - remainingBefore > MONEY_EPSILON', 'over-refund guard is missing');
requireText('server/db/domains/installmentCancellation.db.ts', 'تاریخ بازپرداخت نمی‌تواند قبل از تاریخ فسخ قرارداد باشد', 'refund-before-cancellation date guard is missing');
requireText('server/repositories/customerLedgerEditDelete.repo.ts', 'installment_cancellation_refund_payment', 'refund ledger entries are not immutable');
requireText('server/db/domains/reports/cashflowReports.db.ts', 'installment_cancellation_refunds', 'actual refunds are not included in cashflow outflow');
requireText('server/routes/installments.routes.ts', "'/api/installment-sales/:id/cancellation/refunds'", 'refund API route is missing');
requireText('server/routes/installments.routes.ts', "authorizeRole(['Admin'])", 'refund write must be Admin-only');
requireText('components/InstallmentCancellationRefundModal.tsx', 'layout="horizontal"', 'refund modal must remain horizontal');
requireText('components/InstallmentCancellationRefundModal.tsx', 'ShamsiDatePicker', 'actual refund date field is missing');
requireText('components/InstallmentCancellationRefundModal.tsx', 'paymentMethod', 'refund method field is missing');
requireText('pages/InstallmentSaleDetailPage.tsx', 'ثبت بازپرداخت', 'refund action is not exposed from canceled contract detail');
requireText('pages/InstallmentSaleDetailPage.tsx', 'مانده قابل استرداد', 'refund remaining is not visible');
forbidText('server/routes/installments.routes.ts', /delete\s*\(\s*['"]\/api\/installment-sales\/:id\/cancellation\/refunds/i, 'refund history must not have a delete route');

if (failures.length) {
  console.error(`Installment cancellation refund contract: FAIL (${failures.length})`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Installment cancellation refund contract: PASS');
