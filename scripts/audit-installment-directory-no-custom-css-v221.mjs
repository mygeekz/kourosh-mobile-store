import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');
const management = read('components/ui/ManagementDirectory.tsx');

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});

const cssSource = collectCss('styles').map((file) => read(file)).join('\n');

for (const token of [
  'ManagementKpiGrid',
  'ManagementFilterSurface',
  'placeholder="نام مشتری، کالا، سریال یا شماره قرارداد..."',
  'icon={false}',
  'showChevron={false}',
  'sm:grid-cols-2 lg:grid-cols-4',
  'unstyled-table w-full min-w-[62rem] table-fixed border-collapse text-xs',
  'overflow-x-auto overscroll-x-contain',
  'scope="col"',
  'role="region"',
]) {
  assert.ok(page.includes(token), `v221 page must include ${token}`);
}

for (const retiredToken of [
  'PeopleDirectoryToolbar',
  'DataTableShell',
  'data-ui-installment',
  'installment-sales-responsive',
  'installment-table-actions',
  'installment-card-actions',
  '<PanelCard',
]) {
  assert.ok(!page.includes(retiredToken), `v221 page must not retain ${retiredToken}`);
}

for (const selector of [
  '.installment-sales-page',
  '.installment-sales-responsive',
  '[data-ui-installment',
  '#installments-print-area',
  '@container installment-sales-list',
]) {
  assert.ok(!cssSource.includes(selector), `v221 styles must not contain page-specific selector ${selector}`);
}

assert.ok(management.includes('grid-cols-[minmax(0,1fr)_2rem]'), 'shared KPI primitive must reserve an independent icon track.');
assert.ok(management.includes('min-w-0 overflow-hidden'), 'shared KPI content must not overlap the icon track.');
assert.ok(management.includes('break-words text-xl'), 'shared KPI values must wrap instead of colliding with their icons.');
assert.ok(!page.includes('whitespace-nowrap text-base font-black'), 'installment KPI amount must not restore the overlap-prone nowrap value.');

console.log('Installment directory v221 audit passed: KPI icon isolation, complete filters, native semantic table, local overflow, and zero installment-specific CSS hooks/selectors.');
