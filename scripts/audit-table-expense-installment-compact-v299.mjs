import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 299, `KOUROSH_SOURCE_VERSION must be v299 or successor; found ${version}`);

const tableCss = read('styles/components/tables.css');
if (versionNumber >= 300) {
  assert.ok(tableCss.includes('tbody tr[data-ui-row-accent] > td:first-child'), 'v300+ must mirror the healthy installment first-cell rail contract');
  assert.ok(tableCss.includes('border-inline-start-width: 4px'), 'v300+ row rail must use a real collapsed border');
} else {
  assert.ok(tableCss.includes('tbody tr[data-ui-row-accent] {\n    box-shadow: inset -4px 0 0'), 'Canonical table row accent must be owned by the full row box');
}
assert.ok(!tableCss.includes('tr[data-ui-row-accent] > td:first-child::before'), 'Cell pseudo-element row accent must stay removed');

const dialog = read('components/ui/Dialog.tsx');
assert.ok(dialog.includes('hideHeader?: boolean;'), 'Dialog must expose canonical hideHeader API');
assert.ok(dialog.includes('ariaLabel={hideHeader ? title : undefined}'), 'Headerless dialogs must retain an accessible label');
assert.ok(dialog.includes('{!hideHeader ? ('), 'Dialog header rendering must be conditional');

const expenses = read('pages/Expenses.tsx');
const expenseStart = expenses.indexOf('{isExpenseModalOpen ? (');
const expenseEnd = expenses.indexOf('      ) : null}\n    </div>', expenseStart);
assert.ok(expenseStart >= 0 && expenseEnd > expenseStart, 'Expense modal source window must exist');
const expenseModal = expenses.slice(expenseStart, expenseEnd);
assert.ok(expenseModal.includes('<ModalField label="تاریخ هزینه" required'), 'Expense date must use the same ModalField alignment contract as peer fields');
assert.ok(expenseModal.includes('<FilterChipGroup'), 'Expense payment method must use the canonical compact chip group');
assert.ok(!expenseModal.includes('این هزینه در گزارش‌های مالی و سود خالص'), 'Expense modal financial guidance box must be removed');
assert.ok(!expenseModal.includes('aria-label="تاریخچه همین نوع هزینه"'), 'Expense modal history guidance box must be removed');

const installment = read('pages/InstallmentSaleDetailPage.tsx');
const paymentStart = installment.indexOf('{isPaymentModalOpen && currentPayment && (');
const paymentEnd = installment.indexOf('      {/* Edit Transaction Modal */}', paymentStart);
assert.ok(paymentStart >= 0 && paymentEnd > paymentStart, 'Installment payment modal source window must exist');
const paymentModal = installment.slice(paymentStart, paymentEnd);
assert.ok(paymentModal.includes('hideHeader'), 'Installment payment modal must use the headerless Dialog contract');
assert.ok(paymentModal.includes('widthClass="max-w-4xl"'), 'Installment payment modal must stay compact/wide rather than expansive');
assert.ok(paymentModal.includes('size="wide"'), 'Installment payment modal must use the canonical wide size');
assert.ok(!paymentModal.includes('variant="expansive"'), 'Installment payment modal must not use expansive layout');
assert.ok(paymentModal.includes('grid-cols-2 gap-2 rounded-2xl'), 'Installment summary must be a compact strip');
assert.ok(paymentModal.includes("size: 'sm'"), 'Installment submit action must use compact standard sizing');

console.log('v299 table edge + expense/installment compact UI audit passed.');
