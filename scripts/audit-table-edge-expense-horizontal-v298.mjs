import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 298, `KOUROSH_SOURCE_VERSION must be v298 or successor; found ${version}`);

const tablesCss = read('styles/components/tables.css');
if (versionNumber >= 300) {
  assert.ok(tablesCss.includes('tbody tr[data-ui-row-accent] > td:first-child'), 'Canonical table row accent must use the healthy installment collapsed-border contract');
  assert.ok(tablesCss.includes('border-inline-start-width: 4px'), 'Canonical table row accent must be a real 4px RTL edge border');
} else if (versionNumber >= 299) {
  assert.ok(tablesCss.includes('tbody tr[data-ui-row-accent] {'), 'Canonical table row accent must be owned by the full row box');
  assert.ok(tablesCss.includes('box-shadow: inset -4px 0 0'), 'Canonical table row accent must reach the physical RTL edge');
} else {
  assert.ok(tablesCss.includes('tbody tr[data-ui-row-accent] > td:first-child::before'), 'Canonical table row accent must be owned by tables.css');
  assert.ok(tablesCss.includes('inset-inline-start: -1px'), 'Canonical table row accent must reach the logical table edge');
  assert.ok(tablesCss.includes('inset-block: -1px'), 'Canonical table row accent must bridge row separators without gaps');
}

const customers = read('pages/Customers.tsx');
assert.ok(customers.includes('data-ui-row-accent={getCustomerDueRowAccent(due)}'), 'Customer rows must use canonical row accent contract');
assert.ok(!customers.includes('getCustomerDueRowRailClass'), 'Customer rows must not own accent borders on individual cells');

const partners = read('components/people/PartnerDirectoryList.tsx');
assert.ok(partners.includes('data-ui-row-accent={getPartnerBalanceRowAccent(balance)}'), 'Partner rows must use canonical row accent contract');
assert.ok(!partners.includes('getPartnerBalanceRowRailClass'), 'Partner rows must not own accent borders on individual cells');

const expenses = read('pages/Expenses.tsx');
if (versionNumber >= 300) {
  assert.ok(expenses.includes('data-expense-modal-layout="compact-horizontal-v300"'), 'Expense modals must publish the v300 compact horizontal contract');
  assert.ok(expenses.includes('widthClass="max-w-4xl"'), 'Expense workspace must use the compact 4xl width in v300+');
} else {
  assert.ok(expenses.includes('data-expense-modal-layout="horizontal-v298"'), 'Expense modal must publish horizontal v298 contract');
  assert.ok(expenses.includes('widthClass="max-w-5xl"'), 'Expense modal must use the wide horizontal workspace');
}
assert.ok(expenses.includes('size="wide"'), 'Expense modal must use canonical wide dialog size');
assert.ok(expenses.includes('layout="horizontal"'), 'Expense modal must use canonical horizontal dialog layout');
assert.ok(expenses.includes('<FormGrid columns={3} gap="sm" align="start">'), 'Expense form must use the canonical 3-column horizontal form grid');

console.log('v298 table edge + horizontal expense modal audit passed.');
