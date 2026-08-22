import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const customers = read('pages/Customers.tsx');
const installments = read('pages/InstallmentSalesPage.tsx');

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');

for (const token of [
  'unstyled-table w-full min-w-[62rem] table-fixed border-collapse text-xs',
  'role="region" aria-label="جدول فهرست مشتریان"',
  '<col className="w-[31%]" />',
  '<col className="w-[16%]" />',
  'getCustomerDueRowRailClass(due)',
  'border-s-4 border-s-rose-500',
  'sticky end-0 z-20',
  'sticky end-0 z-10',
]) {
  assert.ok(customers.includes(token), `v223 customer table must include ${token}`);
}

assert.ok(!customers.includes('DataTableShell'), 'Customer list must not retain the legacy DataTableShell cascade.');
assert.ok(!customers.includes('data-ui-customer-table'), 'Customer list must not retain old table CSS hooks.');

for (const token of [
  '<col className="w-[27%]" />',
  '<col className="w-[22%]" />',
  '<col className="w-[16%]" />',
  '<col className="w-[18%]" />',
  '<col className="w-[17%]" />',
  'border-s-4 border-s-rose-500',
  'sticky end-0 z-20',
  'sticky end-0 z-10',
  'className="w-full justify-center"',
]) {
  assert.ok(installments.includes(token), `v223 installment table must include ${token}`);
}

assert.ok(!installments.includes('border-r-4 border-r-'), 'RTL rails must use logical border-s utilities, not physical border-r utilities.');
assert.ok(!installments.includes('DataTableShell'), 'Installment list must remain independent from DataTableShell.');

for (const selector of [
  '#customers-print-area table',
  '#customers-print-area th',
  '#customers-print-area td',
  '.installment-sales-page',
  '.installment-sales-responsive',
  '[data-ui-installment',
  '#installments-print-area',
]) {
  assert.ok(!cssSource.includes(selector), `v223 active CSS must not contain retired page selector ${selector}`);
}

console.log('Customer/installment tables v223 audit passed: four-column customer geometry, visible sticky actions, logical RTL rails, semantic local scroll, and zero feature CSS overrides.');
