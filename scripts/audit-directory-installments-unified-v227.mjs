import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const partnerList = read('components/people/PartnerDirectoryList.tsx');
const installments = read('pages/InstallmentSalesPage.tsx');
const sharedPagination = read('components/ui/ManagementDirectoryPagination.tsx');
const sharedToolbar = read('components/ui/ManagementDirectoryToolbar.tsx');
const sharedOverview = read('components/ui/ManagementDirectoryOverview.tsx');
const peopleToolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const peopleOverview = read('components/people/PeopleDirectoryOverview.tsx');

assert.equal(version, 'v227', 'v227 source version marker must be current.');

// The page-size control is now a shared button group. This deliberately avoids the legacy
// SelectField class cascade that colored the footer control and hid its selected value.
for (const token of [
  'data-ui-management-directory-pagination="shared"',
  '>تعداد نمایش</span>',
  'role="group"',
  'aria-pressed={selected}',
  "variant={selected ? 'neutral' : 'ghost'}",
  "{option.toLocaleString('fa-IR')}",
]) assert.ok(sharedPagination.includes(token), `v227 shared pagination must include ${token}`);
assert.ok(!sharedPagination.includes('SelectField'), 'v227 shared page-size control must not use legacy SelectField styling.');

for (const [name, source] of [
  ['customers', customers],
  ['partners', partnerList],
  ['installments', installments],
]) {
  assert.ok(source.includes('<ManagementDirectoryPagination'), `v227 ${name} must use shared management pagination.`);
}

for (const token of [
  'data-ui-management-directory-toolbar="shared"',
  'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch',
  'پاکسازی فیلترها',
  'columns?: 2 | 3 | 4 | 5',
  "if (columns === 2) return 'lg:grid-cols-2'",
  "if (columns === 3) return 'lg:grid-cols-3'",
  'showChevron={false}',
]) assert.ok(sharedToolbar.includes(token), `v227 shared directory toolbar must include ${token}`);

for (const token of [
  'data-ui-management-directory-overview="shared"',
  'data-ui-management-directory-metrics="true"',
  'rounded-[24px]',
  'lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.72fr)]',
]) assert.ok(sharedOverview.includes(token), `v227 shared directory overview must include ${token}`);

for (const token of [
  'data-ui-people-toolbar="shared"',
  'data-ui-people-filters="true"',
]) assert.ok(peopleToolbar.includes(token), `v227 people toolbar compatibility marker missing: ${token}`);
assert.ok(peopleOverview.includes('data-ui-people-directory-overview="shared"'), 'v227 people overview compatibility marker must remain.');

for (const token of [
  'className="people-foundation"',
  'mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4',
  '<PeopleDirectoryOverview',
  '<PeopleDirectoryToolbar',
]) {
  assert.ok(customers.includes(token), `v227 customers must preserve approved directory base: ${token}`);
  assert.ok(partners.includes(token), `v227 partners must preserve approved directory base: ${token}`);
}

for (const token of [
  'isLoading={isLoading}',
  'data-ui-management-page="installments"',
  '<ManagementDirectoryOverview',
  '<ManagementDirectoryToolbar',
  'columns={3}',
  'data-ui-installments-directory="true"',
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'data-ui-table-layout="managed"',
  'data-ui-table-density="compact"',
  'min-w-[62rem]',
  'sticky end-0 z-20',
  'sticky end-0 z-10 bg-inherit',
  'border-s-4 border-s-rose-500',
  '<StatusIndicator status={sale.overallStatus} />',
  '<CollectionRiskStatus sale={sale} />',
  'collapseBelow="lg"',
  '<ManagementDirectoryPagination',
]) assert.ok(installments.includes(token), `v227 installment directory must include ${token}`);

for (const retired of [
  'unstyled-table',
  'CollectionRiskPill',
  'StatusPill',
  'border-s border-s-slate-200',
]) assert.ok(!installments.includes(retired), `v227 installment directory must not retain legacy presentation ${retired}`);

// Ensure the three management directories do not get page-specific stylesheet patches.
const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');
for (const selector of [
  '[data-ui-management-directory-pagination]',
  '[data-ui-customers-directory]',
  '[data-ui-partners-directory]',
  '[data-ui-installments-directory]',
  '#installments-print-area table',
  '#installments-print-area th',
  '#installments-print-area td',
]) assert.ok(!cssSource.includes(selector), `v227 active CSS must not contain directory page override ${selector}`);

console.log('Directory/Installments v227 audit passed: Customers, Partners and Installments share the same SaaS overview/filter/table/pagination contract; page-size controls are readable and isolated from legacy SelectField CSS.');
