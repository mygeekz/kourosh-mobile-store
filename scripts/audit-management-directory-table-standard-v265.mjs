import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const primitive = read('components/ui/ManagementDirectoryTable.tsx');
const uiIndex = read('components/ui/index.ts');
const customers = read('pages/Customers.tsx');
const partners = read('components/people/PartnerDirectoryList.tsx');
const repairs = read('pages/Repairs.tsx');

for (const token of [
  'overflow-hidden rounded-2xl border border-slate-200 bg-white',
  'overflow-x-auto overscroll-x-contain',
  'data-ui-table-layout="managed"',
  'data-ui-table-density="compact"',
  'sticky end-0 z-20',
  '<ManagementDirectoryPagination',
]) assert.ok(primitive.includes(token), `ManagementDirectoryTable base contract missing: ${token}`);

assert.ok(uiIndex.includes("export { default as ManagementDirectoryTable, MANAGEMENT_DIRECTORY_ROW_CLASS }"), 'ManagementDirectoryTable must be exported by the UI foundation');
assert.doesNotMatch(primitive, /import\s+['"][^'"]+\.css['"]/, 'ManagementDirectoryTable must not import custom CSS');
assert.doesNotMatch(primitive, /style\s*=\s*\{\{/, 'ManagementDirectoryTable must not use inline style objects');

for (const [name, source] of [['Customers', customers], ['Partners', partners], ['Repairs', repairs]]) {
  assert.ok(source.includes('<ManagementDirectoryTable'), `${name} must use the shared ManagementDirectoryTable standard`);
  assert.ok(source.includes('MANAGEMENT_DIRECTORY_ROW_CLASS'), `${name} must use the shared management row state`);
}

assert.ok(customers.includes("dataUi=\"customers\""), 'Customers must identify the canonical table instance');
assert.ok(partners.includes("dataUi=\"partners\""), 'Partners must identify the canonical table instance');
assert.ok(repairs.includes("dataUi=\"repairs\""), 'Repairs must identify the canonical table instance');

for (const token of ['پرونده و مشتری', 'دستگاه و پذیرش', 'وضعیت و پیگیری', 'تعداد پرونده تعمیر در هر صفحه']) {
  assert.ok(repairs.includes(token), `Repairs directory grouping missing: ${token}`);
}
assert.ok(repairs.includes('<ManagementDirectoryToolbar'), 'Repairs must use the shared directory toolbar');
assert.ok(repairs.includes('pagedRepairs.map'), 'Repairs list must paginate through the shared directory contract');
assert.ok(repairs.includes('pageSizeOptions: [25, 50, 100]'), 'Repairs directory page-size contract is missing');
assert.doesNotMatch(repairs, /repairs-premium-table|repair-mobile-card/, 'Repairs list must not fall back to legacy table/mobile-card contracts');
assert.doesNotMatch(repairs, /hidden\s+md:block[^\n]*data-ui-repair-table/, 'Repairs table must remain a table on compact viewports with local scrolling');
assert.doesNotMatch(repairs, /<DataTableShell/, 'Repairs list must use the management-directory base instead of a page-specific DataTableShell');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v265',
  standard: 'customers-partners-management-directory-table',
  consumers: ['Customers', 'Partners', 'Repairs'],
  mobileCardification: false,
  customCssAdded: false,
}, null, 2));
