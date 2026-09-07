import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));

assert.ok(
  Number.isInteger(versionNumber) && versionNumber >= 302,
  `KOUROSH_SOURCE_VERSION must be v302 or successor; found ${version}`,
);

const expenses = read('pages/Expenses.tsx');

const forbiddenRawDateRenders = [
  "{expenseForm.expenseDate || 'ثبت نشده'}",
  '{expenseForm.expenseDate || "ثبت نشده"}',
  "{recurringForm.nextRunDate || 'ثبت نشده'}",
  '{recurringForm.nextRunDate || "ثبت نشده"}',
];

for (const pattern of forbiddenRawDateRenders) {
  assert.ok(
    !expenses.includes(pattern),
    `Expenses.tsx must not render a Date object directly in JSX: ${pattern}`,
  );
}

assert.ok(
  expenses.includes("expenseForm.expenseDate ? toShamsi(expenseForm.expenseDate) : 'ثبت نشده'"),
  'Expense summary must format expenseDate before rendering',
);

assert.ok(
  expenses.includes("recurringForm.nextRunDate ? toShamsi(recurringForm.nextRunDate) : 'ثبت نشده'"),
  'Recurring summary must format nextRunDate before rendering',
);

console.log('v302 expense Date render audit passed.');
