import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const partnerList = read('components/people/PartnerDirectoryList.tsx');
const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const pageKit = read('components/ui/PageKit.tsx');
const managementDirectory = read('components/ui/ManagementDirectory.tsx');

assert.equal(version, 'v226', 'v226 source version marker must be current.');

for (const token of [
  'className="people-foundation"',
  'mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4',
  'columns={2}',
  '<PartnerDirectoryList',
]) assert.ok(partners.includes(token), `v226 partners page must include ${token}`);

for (const retired of [
  'people-merged-page',
  'people-page-shell',
]) assert.ok(!partners.includes(retired), `v226 partners page must not use retired shell hook ${retired}`);

for (const token of [
  'data-ui-partners-directory="true"',
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'data-ui-table-layout="managed"',
  'data-ui-table-density="compact"',
  'min-w-[62rem]',
  'w-[33%]',
  'w-[28%]',
  'w-[25%]',
  'w-[14%]',
  'sticky end-0 z-20',
  'sticky end-0 z-10 bg-inherit',
  'getPartnerBalanceRowRailClass(balance)',
  'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
  '>تعداد نمایش</span>',
  'showChevron={false}',
  "{ value: '25', label: '۲۵ مورد' }",
  '>قبلی</Button>',
  '>بعدی</Button>',
  'collapseBelow="lg"',
]) assert.ok(partnerList.includes(token), `v226 partner list must include ${token}`);

for (const retired of [
  'customers-directory-v73',
  'table-row-state--',
  '<DataTableShell',
]) assert.ok(!partnerList.includes(retired), `v226 partner list must not use legacy/custom directory contract ${retired}`);

for (const token of [
  'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch',
  'پاکسازی فیلترها',
  "columns?: 2 | 4 | 5",
  "columns === 2 ? 'lg:grid-cols-2'",
]) assert.ok(toolbar.includes(token), `v226 shared people toolbar must include ${token}`);

for (const token of [
  'src="/kourosh-logo.svg"',
  'در حال آماده‌سازی {title}',
  'دریافت اطلاعات',
  'bg-sky-500',
]) assert.ok(pageKit.includes(token), `v226 PageKit branded loading must include ${token}`);

for (const token of [
  'surface="default"',
  'border border-slate-200 bg-white',
  '[--ds-control-border:rgb(203_213_225)]',
]) assert.ok(managementDirectory.includes(token), `v226 neutral management filters must include ${token}`);

for (const customerToken of [
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
]) assert.ok(customers.includes(customerToken), `v226 customer base must remain intact: ${customerToken}`);

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');
for (const selector of ['[data-ui-partners-directory]']) {
  assert.ok(!cssSource.includes(selector), `v226 active CSS must not contain partner page override ${selector}`);
}

console.log('Partners/Customers v226 parity audit passed: shared branded loading, two-row neutral filters, utility-only semantic RTL table, status rail, sticky operations, readable pagination, and no partner page CSS override.');
