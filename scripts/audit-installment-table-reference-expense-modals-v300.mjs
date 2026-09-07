import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 300, `KOUROSH_SOURCE_VERSION must be v300 or successor; found ${version}`);

const directory = read('components/ui/ManagementDirectoryTable.tsx');
assert.ok(directory.includes("minWidthClassName = 'min-w-[62rem]'"), 'Management directory must use the same 62rem table width reference as installments');
assert.ok(directory.includes("'table-fixed border-collapse text-xs'"), 'Management directory must mirror installment table fixed/collapsed layout');
assert.ok(directory.includes('border-b border-slate-200/80 px-3 py-3'), 'Management directory header must mirror installment directory spacing');
assert.ok(directory.includes('divide-y divide-slate-200 bg-white text-slate-700'), 'Management directory body must mirror installment table surface');

const tableCss = read('styles/components/tables.css');
assert.ok(tableCss.includes('tbody tr[data-ui-row-accent] > td:first-child'), 'Row accent must be on the first RTL cell like the healthy installment table');
assert.ok(tableCss.includes('border-inline-start-width: 4px'), 'Row accent must be a real 4px border');
assert.ok(!tableCss.includes('box-shadow: inset -4px 0 0 var(--ui-table-row-accent'), 'Shadow-based row accent must stay removed');

const expenses = read('pages/Expenses.tsx');
const recurringStart = expenses.indexOf('{isRecurringModalOpen ? (');
const recurringEnd = expenses.indexOf('{isRecurringPaymentModalOpen && recurringPaymentTarget ? (', recurringStart);
assert.ok(recurringStart >= 0 && recurringEnd > recurringStart, 'Recurring expense modal source window must exist');
const recurring = expenses.slice(recurringStart, recurringEnd);
assert.ok(recurring.includes('data-expense-modal-layout="compact-horizontal-v300"'), 'Recurring expense modal must use v300 compact horizontal layout');
assert.ok(recurring.includes('widthClass="max-w-4xl"'), 'Recurring expense modal must match the compact expense width');
assert.ok(recurring.includes('layout="horizontal"'), 'Recurring expense modal must match the horizontal expense layout');
assert.ok(recurring.includes('<FilterChipGroup'), 'Recurring payment type/status must use compact shared chip controls');
assert.ok(!recurring.includes('تعریف پرداخت ماهانه یا قسطی'), 'Large recurring guidance banner must stay removed');
assert.ok(!recurring.includes('منطق ثبت'), 'Recurring side logic card must stay removed');
assert.ok(!recurring.includes('<aside'), 'Recurring modal must not restore the tall side rail');

const expenseStart = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(expenseStart >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(expenseStart);
if (versionNumber >= 304) {
  assert.ok(expense.includes('data-expense-modal-layout="reference-split-v304"'), 'v304+ expense modal must use the approved reference split layout');
  assert.ok(expense.includes('widthClass="max-w-5xl"'), 'v304+ expense modal must use the approved full-width SaaS canvas');
  assert.ok(expense.includes('data-expense-modal-columns="summary-left-form-right"'), 'v304+ expense modal must keep summary left and form right');
  assert.ok(expense.includes('appearance="segmented"'), 'v304+ payment method selector must use canonical segmented appearance');
} else {
  assert.ok(expense.includes('data-expense-modal-layout="compact-horizontal-v300"'), 'Expense modal must use v300 compact horizontal layout');
  assert.ok(expense.includes('widthClass="max-w-4xl"'), 'Expense modal must use compact 4xl width');
  assert.ok(expense.includes('<FormGrid columns={3} gap="sm" align="start">'), 'Expense modal must keep one compact 3-column form grid');
  assert.ok(!expense.includes('aria-label="خلاصه ثبت هزینه"'), 'Deprecated bulky expense summary strip must stay removed');
  if (versionNumber === 300) {
    assert.ok(expense.includes('showIcons={false}'), 'v300 payment method chips must stay compact without redundant icons');
  } else {
    assert.ok(expense.includes('data-expense-modal-design="saas-v301"'), 'v301+ expense modal must publish the SaaS redesign contract');
    assert.ok(expense.includes('showIcons'), 'v301+ payment method chips may use compact semantic icons');
  }
}

console.log('v300 installment-table reference + compact expense modals audit passed.');
