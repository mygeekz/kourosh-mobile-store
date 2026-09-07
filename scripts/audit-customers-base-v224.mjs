import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const customers = read('pages/Customers.tsx');
const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const managementDirectory = read('components/ui/ManagementDirectory.tsx');
const version = read('KOUROSH_SOURCE_VERSION').trim();

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');

assert.equal(version, 'v224', 'v224 source version marker must be current.');

for (const token of [
  'className="people-foundation"',
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'data-ui-table-layout="managed"',
  'data-ui-table-density="compact"',
  '<caption className="sr-only">فهرست مشتریان، وضعیت حساب، تعهدات، اعتبار و عملیات پرونده</caption>',
  '<col className="w-[33%]" />',
  '<col className="w-[28%]" />',
  '<col className="w-[25%]" />',
  '<col className="w-[14%]" />',
  'getCustomerDueRowRailClass(due)',
  'border-s-4 border-s-rose-500',
  'sticky end-0 z-20 bg-slate-50',
  'sticky end-0 z-10 bg-inherit',
  'before:hidden after:hidden',
]) {
  assert.ok(customers.includes(token), `v224 customers base must include ${token}`);
}

for (const retired of [
  'people-merged-page people-foundation',
  'unstyled-table',
  'border-s border-s-slate-200 bg-inherit',
  'rounded-lg border px-2 py-1 text-[10px] font-black leading-5',
  'getCustomerDueRowStateClass(due)',
]) {
  assert.ok(!customers.includes(retired), `v224 customers base must retire ${retired}`);
}

for (const token of [
  "import { ManagementFilterSurface, SelectField } from '@/components/ui';",
  '<ManagementFilterSurface',
  'icon={false}',
  'showChevron={false}',
  'className="ux-filter-button w-full shrink-0"',
  'xl:grid-cols-[minmax(20rem,1.15fr)_minmax(0,2.85fr)]',
]) {
  assert.ok(toolbar.includes(token), `v224 people toolbar must include ${token}`);
}

for (const retired of [
  "import { SelectField, Surface } from '@/components/ui';",
  'iconClassName={filter.iconClassName',
]) {
  assert.ok(!toolbar.includes(retired), `v224 people toolbar must retire ${retired}`);
}

for (const token of [
  'surface="default"',
  'border border-slate-200 bg-white',
  '[--ds-control-border:rgb(203_213_225)]',
  '[--ux-control-border:rgb(203_213_225)]',
  'dark:[--ds-control-border:rgb(71_85_105)]',
]) {
  assert.ok(managementDirectory.includes(token), `v224 neutral management filters must include ${token}`);
}

for (const selector of [
  '#customers-print-area table',
  '#customers-print-area th',
  '#customers-print-area td',
  '[data-ui-customers-directory]',
]) {
  assert.ok(!cssSource.includes(selector), `v224 active CSS must not contain customer page override ${selector}`);
}

console.log('Customers base v224 audit passed: neutral fixed filters, readable native selects, semantic RTL managed table, right-side status rail, separator-free operations, flat due status, and no customer page CSS override.');
