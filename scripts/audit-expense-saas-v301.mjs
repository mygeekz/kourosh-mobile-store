import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 301, `KOUROSH_SOURCE_VERSION must be v301 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
assert.ok(expenses.includes('PanelCard'), 'Expense workspace must use shared PanelCard composition');

const recurringStart = expenses.indexOf('{isRecurringModalOpen ? (');
const recurringEnd = expenses.indexOf('{isRecurringPaymentModalOpen && recurringPaymentTarget ? (', recurringStart);
assert.ok(recurringStart >= 0 && recurringEnd > recurringStart, 'Recurring expense modal source window must exist');
const recurring = expenses.slice(recurringStart, recurringEnd);
assert.ok(recurring.includes('data-expense-modal-design="recurring-saas-v301"'), 'Recurring modal must publish v301 SaaS design contract');
assert.ok(recurring.includes('fa-calendar-days'), 'Recurring monthly mode must expose a semantic icon');
assert.ok(recurring.includes('fa-hand-holding-dollar'), 'Recurring installment mode must expose a semantic icon');
assert.ok(recurring.includes('fa-circle-check'), 'Recurring active state must expose a semantic icon');
assert.ok(recurring.includes('fa-circle-pause'), 'Recurring inactive state must expose a semantic icon');
assert.ok(recurring.includes('خلاصه نهایی برنامه پرداخت'), 'Recurring modal must include a final summary box');
assert.ok(recurring.includes('جمع تعهد'), 'Recurring summary must expose projected commitment');
assert.ok(recurring.includes('سررسید بعدی'), 'Recurring summary must expose the next due date');

const expenseStart = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(expenseStart >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(expenseStart);
if (versionNumber >= 306) {
  assert.ok(/data-expense-modal-canonical="v3\d+"/.test(expense), 'v306+ expense modal must publish the canonical template contract');
  assert.ok(expense.includes('titleId="expense-core-section-title"'), 'v306+ expense modal must preserve the core-information section');
  assert.ok(expense.includes('titleId="expense-payment-section-title"'), 'v306+ expense modal must preserve the payment/documentation section');
  assert.ok(expense.includes('<ModalTemplateSummary'), 'v306+ expense modal must use the canonical summary primitive');
  assert.ok(expense.includes('appearance="segmented"'), 'v306+ payment method selector must use the canonical segmented contract');
} else if (versionNumber >= 304) {
  assert.ok(expense.includes('data-expense-modal-design="approved-v304"'), 'v304+ expense modal must publish the approved reference contract');
  assert.ok(expense.includes('id="expense-core-section-title"'), 'v304+ expense modal must preserve the core-information section');
  assert.ok(expense.includes('id="expense-payment-section-title"'), 'v304+ expense modal must preserve the payment/documentation section');
  assert.ok(expense.includes('title="خلاصه ثبت"'), 'v304+ expense modal must include the approved live summary card');
  assert.ok(expense.includes('appearance="segmented"'), 'v304+ payment method selector must use the canonical segmented contract');
} else {
  assert.ok(expense.includes('data-expense-modal-design="saas-v301"'), 'Expense modal must publish v301 SaaS design contract');
  assert.ok(expense.includes('title="اطلاعات هزینه"'), 'Expense modal must group core fields in a shared PanelCard');
  assert.ok(expense.includes('title="پرداخت و توضیحات"'), 'Expense modal must group payment/documentation fields');
  assert.ok(expense.includes('title="خلاصه ثبت"'), 'Expense modal must include a compact live summary');
  assert.ok(expense.includes('showIcons'), 'Expense payment method chips must use compact semantic icons');
}
assert.ok(expense.includes('variant="ghost"'), 'Expense title suggestions must use canonical Button variants');
assert.ok(!expense.includes('<button'), 'Expense modal must not introduce raw native button controls');

console.log('v301 expense SaaS redesign audit passed.');
