import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 306, `KOUROSH_SOURCE_VERSION must be v306 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
const start = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(start >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(start);

assert.ok(versionNumber === 306 ? expense.includes('data-expense-modal-canonical="v306"') : /data-expense-modal-canonical="v3\d+"/.test(expense), 'Expense modal must publish the canonical contract marker');
assert.ok(expense.includes('hideCloseButton'), 'Expense modal must hide redundant close X button');
assert.ok(expense.includes('<ModalTemplateForm dir="ltr" data-expense-modal-columns="summary-left-form-right">'), 'Physical two-pane order must be owned by canonical ModalTemplateForm');
assert.ok(expense.includes('<ModalTemplateSide aria-label="خلاصه ثبت هزینه">'), 'Summary rail must use canonical ModalTemplateSide');
assert.ok(expense.includes('<ModalTemplateSummary'), 'Summary must use canonical ModalTemplateSummary');
assert.ok(expense.includes('<ModalTemplateMetricList>'), 'Summary values must use canonical metric list');
assert.ok((expense.match(/<ModalTemplateMetric\b/g) || []).length >= 5, 'Summary must expose at least five canonical metrics');
assert.ok(expense.includes('<ModalTemplateMain>'), 'Form content must use canonical ModalTemplateMain');
assert.ok((expense.match(/<ModalTemplateSection\b/g) || []).length >= 2, 'Expense form must have canonical core and payment sections');
assert.ok((expense.match(/<ModalTemplateSectionHeader\b/g) || []).length >= 2, 'Expense sections must use canonical section headers');
assert.ok(expense.includes('<FormGrid columns={3} gap="md" align="start">'), 'Core form must use the approved 2/3 + 1/3 grid contract');
assert.ok(expense.includes('appearance="segmented"'), 'Payment methods must use canonical segmented control');
assert.ok(expense.includes('fullWidth'), 'Segmented payment control must fill its row');
assert.ok(!expense.includes('<PanelCard'), 'Expense modal must not rebuild the approved layout from generic PanelCard surfaces');
assert.ok(!expense.includes('پیش‌نویس'), 'Rejected draft-status chip must stay removed');

const titleFieldStart = expense.indexOf('<ModalField label="نوع هزینه"');
assert.ok(titleFieldStart >= 0, 'Expense title field must exist');
const titleWindow = expense.slice(titleFieldStart, titleFieldStart + 3200);
assert.ok(titleWindow.includes('<TextField'), 'Expense title must use canonical TextField');
assert.ok(!titleWindow.includes('<div className="relative">\n                        <TextField'), 'Expense title must not restore the nested double-box wrapper');

const templates = read('components/modals/ModalTemplates.tsx');
for (const symbol of ['ModalTemplateForm', 'ModalTemplateSide', 'ModalTemplateMain', 'ModalTemplateSectionHeader', 'ModalTemplateSummary', 'ModalTemplateMetricList', 'ModalTemplateMetric']) {
  assert.ok(templates.includes(`function ${symbol}`), `Canonical template primitive ${symbol} must exist`);
}
assert.ok(templates.includes('data-ui-modal-template="form"'), 'Canonical form template must publish an ownership marker');

const modalCss = read('styles/components/modal-system.css');
if (versionNumber === 306) {
  assert.ok(modalCss.includes('grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.68fr)'), 'v306 must preserve its approved summary/form proportion');
  assert.ok(modalCss.includes('background: linear-gradient(155deg, rgba(240, 253, 244, 0.94), rgba(255, 255, 255, 0.98) 62%)'), 'v306 summary surface must preserve its approved treatment');
} else {
  assert.ok(modalCss.includes('.modal-template-summary'), 'Successor releases must preserve the canonical summary primitive');
  assert.ok(modalCss.includes('.modal-template-form'), 'Successor releases must preserve the canonical form template');
}
assert.ok(modalCss.includes('background: transparent !important;'), 'Canonical input contract must retain a single visual shell rather than nested control boxes');

console.log('v306 canonical expense modal template audit passed.');
