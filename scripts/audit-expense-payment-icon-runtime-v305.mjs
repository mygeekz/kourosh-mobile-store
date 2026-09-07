import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 305, `KOUROSH_SOURCE_VERSION must be v305 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
assert.ok(
  expenses.includes('const paymentMethodIcon = (value: string | null | undefined) =>'),
  'Canonical paymentMethodIcon helper must exist',
);
assert.ok(
  expenses.includes('paymentMethodIcon(expenseForm.paymentMethod)'),
  'Expense summary must use the canonical paymentMethodIcon helper',
);
assert.ok(
  !expenses.includes('expensePaymentMethodIcon('),
  'Undefined expensePaymentMethodIcon runtime symbol must stay removed',
);

console.log('v305 expense payment icon runtime audit passed.');
