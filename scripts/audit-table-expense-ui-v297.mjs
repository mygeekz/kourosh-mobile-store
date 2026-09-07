import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 297, `KOUROSH_SOURCE_VERSION must be v297 or successor; found ${version}`);

const management = read('components/ui/ManagementDirectoryTable.tsx');
if (versionNumber >= 300) {
  assert.ok(management.includes("minWidthClassName = 'min-w-[62rem]'"), 'v300+ directory tables must mirror the healthy installment 62rem reference width');
  assert.ok(management.includes('whitespace-nowrap bg-slate-50 px-3 py-2 text-xs'), 'v300+ directory headers must mirror installment header spacing');
} else {
  assert.ok(management.includes("minWidthClassName = 'min-w-[52rem]'"), 'Directory tables must use the compact canonical min-width');
  assert.ok(management.includes('whitespace-nowrap bg-slate-50 px-2.5 py-2 text-xs'), 'Directory header cells must remain compact');
}

const customer = read('pages/Customers.tsx');
const partner = read('components/people/PartnerDirectoryList.tsx');
if (versionNumber >= 300) {
  assert.ok(customer.includes('minWidthClassName="min-w-[62rem]"'), 'v300+ customer directory must mirror installment width');
  assert.ok(partner.includes('minWidthClassName="min-w-[62rem]"'), 'v300+ partner directory must mirror installment width');
} else {
  assert.ok(customer.includes('minWidthClassName="min-w-[52rem]"'), 'Customer directory must use canonical compact width');
  assert.ok(partner.includes('minWidthClassName="min-w-[52rem]"'), 'Partner directory must use canonical compact width');
}

const partnerHistory = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
assert.ok(partnerHistory.includes('TableViewport'), 'Partner purchase history must use canonical TableViewport');
assert.ok(partnerHistory.includes('layout="auto" density="compact"'), 'Partner purchase history must use auto compact table layout');
assert.ok(!partnerHistory.includes('table-fixed'), 'Partner purchase history must not regress to table-fixed');

const customerHistory = read('pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx');
assert.ok(customerHistory.includes('data-ui-customer-purchase-history="standard-v297"'), 'Customer purchase history must publish the v297 standard contract');
assert.ok(customerHistory.includes('TableViewport'), 'Customer purchase history must use canonical TableViewport');

const expenses = read('pages/Expenses.tsx');
for (const title of ['ثبت هزینه تکرارشونده', 'ثبت هزینه']) assert.ok(expenses.includes(title), `${title} modal must remain present`);
if (versionNumber === 297) {
  assert.ok((expenses.match(/size="lg"/g) || []).length >= 2, 'Expense modals must use the compact lg modal size');
  assert.ok((expenses.match(/lg:grid-cols-\[minmax\(0,1fr\)_13rem\]/g) || []).length >= 2, 'Expense modals must use the compact summary rail');
  assert.ok((expenses.match(/self-start border-t border-slate-200 p-3/g) || []).length >= 2, 'Expense summary rails must not stretch into empty background panels');
} else if (versionNumber >= 300) {
  assert.ok(expenses.includes('data-expense-modal-layout="compact-horizontal-v300"'), 'v300+ expense modals must publish the compact horizontal layout contract');
} else {
  assert.ok(expenses.includes('data-expense-modal-layout="horizontal-v298"'), 'v298+ expense modal must publish the horizontal layout contract');
}


console.log('v297 table + expense modal UI audit passed.');
