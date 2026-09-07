import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const customers = read('pages/Customers.tsx');
const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const pageKit = read('components/ui/PageKit.tsx');
const managementDirectory = read('components/ui/ManagementDirectory.tsx');
const version = read('KOUROSH_SOURCE_VERSION').trim();

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');

assert.equal(version, 'v225', 'v225 source version marker must be current.');

for (const token of [
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'getCustomerDueRowRailClass(due)',
  'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
  '>تعداد نمایش</span>',
  'showChevron={false}',
  "{ value: '25', label: '۲۵ مورد' }",
]) assert.ok(customers.includes(token), `v225 customers must include ${token}`);

for (const token of [
  'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch',
  'پاکسازی فیلترها',
  "${columns === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-5'}",
]) assert.ok(toolbar.includes(token), `v225 people toolbar must include ${token}`);

for (const token of [
  'src="/kourosh-logo.svg"',
  'در حال آماده‌سازی {title}',
  'دریافت اطلاعات',
  'bg-sky-500',
]) assert.ok(pageKit.includes(token), `v225 PageKit loading must include ${token}`);

for (const token of [
  'surface="default"',
  'border border-slate-200 bg-white',
  '[--ds-control-border:rgb(203_213_225)]',
]) assert.ok(managementDirectory.includes(token), `v225 neutral management filters must include ${token}`);

for (const selector of ['#customers-print-area table','#customers-print-area th','#customers-print-area td','[data-ui-customers-directory]']) {
  assert.ok(!cssSource.includes(selector), `v225 active CSS must not contain customer page override ${selector}`);
}

console.log('Customers base v225 audit passed: branded readable loading, two-row readable filters, compact visible page-size control, neutral controls, and no customer page CSS override.');
