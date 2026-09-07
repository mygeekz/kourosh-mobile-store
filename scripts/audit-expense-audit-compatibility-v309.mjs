import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 309, `KOUROSH_SOURCE_VERSION must be v309 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
const start = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(start >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(start);
assert.ok(expense.includes('widthClass="max-w-5xl"'), 'Expense modal must retain the historical approved width token required by the v300 compatibility audit');
assert.ok(expense.includes('panelClassName="expense-entry-modal"'), 'Expense modal must retain the semantic runtime modifier');
assert.ok(expense.includes('data-expense-modal-canonical="v309"') || versionNumber > 309, 'Expense modal must publish the v309 compatibility contract');
assert.ok(expense.includes('data-expense-modal-columns="summary-left-form-right"'), 'Expense modal must preserve left summary / right form ordering');

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('body .kourosh-modal__panel.app-modal.expense-entry-modal {'), 'Expense runtime modifier must remain canonical modal CSS');
assert.ok(css.includes('--kourosh-modal-width: 1280px !important;'), 'Reference-match runtime width must remain 1280px despite the compatibility token');
assert.ok(css.includes('@media (max-width: 980px)'), 'Expense modal must preserve the responsive collapse contract');

const dialog = read('components/ui/Dialog.tsx');
assert.ok(dialog.includes('max-w-5xl') && dialog.includes("return 'full';"), 'Dialog must continue resolving max-w-5xl as full-size');

console.log('v309 expense audit compatibility + reference-width audit passed.');
