import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const expenses = read('pages/Expenses.tsx');
const manifest = read('styles/manifest/style-manifest.json');

const retiredCss = [
  'styles/system/expenses-modal-horizontal-phase87.css',
  'styles/system/expenses-modal-horizontal-phase88.css',
  'styles/system/expenses-modal-horizontal-phase89.css',
  'styles/system/expenses-recurring-payment-history-phase93.css',
];
for (const file of retiredCss) {
  assert.equal(fs.existsSync(file), false, `retired Expenses custom CSS must not exist: ${file}`);
  assert.equal(manifest.includes(file), false, `retired Expenses custom CSS must not remain in style manifest: ${file}`);
}

for (const legacyClass of [
  'expense-modal87',
  'expense-modal89',
  'recurring-expense-modal91',
  'recurring-payment-modal92',
  'expenses-page-date-stable',
  'recurring-expense-payment-history',
]) {
  assert.equal(expenses.includes(legacyClass), false, `legacy Expenses page CSS contract remains: ${legacyClass}`);
}

assert.doesNotMatch(expenses, /<(?:input|select|textarea)\b/, 'Expenses must not render raw text/select/textarea controls');
for (const primitive of ['AppSearchField', 'DialogActions', 'ModalField', 'SelectField', 'TextareaField', 'TextField']) {
  assert.match(expenses, new RegExp(`\\b${primitive}\\b`), `Expenses must use shared primitive ${primitive}`);
}
assert.match(expenses, /ShamsiDatePicker/, 'specialized Persian date picker must remain the existing shared primitive');
assert.match(expenses, /className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-\[minmax\(0,1fr\)_18rem\]"/, 'expense dialogs must use utility-based responsive split composition');
assert.match(expenses, /className="absolute inset-x-0 top-full z-30/, 'expense title combobox popup must be utility styled in the component');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v262',
  removedExpensesCssFiles: retiredCss.length,
  removedExpensesCssLines: 1091,
  rawFormControls: 0,
  pageSpecificExpenseCssContracts: 0,
  specializedDatePickerPreserved: true,
}, null, 2));
