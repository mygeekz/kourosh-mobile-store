import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 304, `KOUROSH_SOURCE_VERSION must be v304 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
const start = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(start >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(start);

assert.ok(expense.includes('hideCloseButton'), 'Expense modal must not render the redundant close X button');
assert.ok(expense.includes('data-expense-modal-design="approved-v304"'), 'Expense modal must preserve the approved design compatibility contract');
assert.ok(expense.includes('data-expense-modal-columns="summary-left-form-right"'), 'Expense modal must use left summary and right form columns');
assert.ok(expense.includes('aria-label="خلاصه ثبت هزینه"'), 'Approved summary column must be explicit and accessible');
assert.ok(expense.includes('پس از ثبت، سند در گزارش‌های مالی ذخیره می‌شود.'), 'Summary card must include the approved persistence note');
assert.ok(!expense.includes('پیش‌نویس'), 'Draft status chip from the rejected implementation must stay removed');
assert.ok(expense.includes('appearance="segmented"'), 'Payment selector must use canonical segmented appearance');
assert.ok(expense.includes('fullWidth'), 'Payment segmented control must fill the available row');

if (versionNumber >= 306) {
  assert.ok(/data-expense-modal-canonical="v3\d+"/.test(expense), 'v306+ must publish the canonical modal-template contract');
  assert.ok(expense.includes('<ModalTemplateForm dir="ltr" data-expense-modal-columns="summary-left-form-right">'), 'v306+ outer split must be owned by ModalTemplateForm');
  assert.ok(expense.includes('<ModalTemplateSummary'), 'v306+ summary must use ModalTemplateSummary');
  assert.ok(expense.includes('<ModalTemplateMetricList>'), 'v306+ summary metrics must use canonical metric list');
  assert.ok(expense.includes('titleId="expense-core-section-title"'), 'v306+ core section header must use canonical section header');
  assert.ok(expense.includes('titleId="expense-payment-section-title"'), 'v306+ payment section header must use canonical section header');
  assert.ok(expense.includes('<FormGrid columns={3} gap="md" align="start">'), 'v306+ core fields must retain the approved 2/3 + 1/3 grid');
  const titleFieldStart = expense.indexOf('<ModalField label="نوع هزینه"');
  assert.ok(titleFieldStart >= 0, 'Expense title field must exist');
  const titleWindow = expense.slice(titleFieldStart, titleFieldStart + 2600);
  assert.ok(titleWindow.includes('<TextField'), 'Expense title control must remain a direct canonical TextField child');
  assert.ok(!titleWindow.includes('<div className="relative">\n                          <TextField'), 'Nested wrapper that caused double-box rendering must stay removed');
} else {
  assert.ok(expense.includes('dir="ltr" data-expense-modal-columns="summary-left-form-right"'), 'Outer split must explicitly own physical column order');
  assert.ok(expense.includes('title="خلاصه ثبت"'), 'Approved summary card must exist');
  assert.ok(expense.includes('id="expense-core-section-title"'), 'Core information section must exist');
  assert.ok(expense.includes('md:grid-cols-3'), 'Approved core fields must use the 2/3 + 1/3 reference grid');
  assert.ok(expense.includes('className="relative md:col-span-2" ref={expenseTitleBoxRef}'), 'Expense title must own the wide two-column span');
  assert.ok(expense.includes('className="md:col-span-2"'), 'Category must own the wide two-column span');
  assert.ok(expense.includes('className="md:col-span-3"'), 'Reference number must span the full core row');
  assert.ok(expense.includes('id="expense-payment-section-title"'), 'Payment/documentation section must exist');
}

const filterChips = read('components/ui/FilterChipGroup.tsx');
assert.ok(filterChips.includes("appearance?: 'chips' | 'segmented'"), 'FilterChipGroup must expose canonical segmented appearance');
assert.ok(filterChips.includes('data-ui-filter-chip-appearance={appearance}'), 'FilterChipGroup must publish its appearance contract');
assert.ok(filterChips.includes('fullWidth?: boolean'), 'FilterChipGroup must support full-width segmented controls');

console.log('v304 approved expense modal canonical audit passed.');
