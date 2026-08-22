import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');
const tablesCss = read('styles/components/tables.css');
const generatedCss = read('styles/generated/tailwind-entry.generated.css');

for (const token of [
  'ManagementKpiGrid',
  'ManagementFilterSurface',
  'placeholder="نام مشتری، کالا، سریال یا شماره قرارداد..."',
  "{ value: '', label: 'همه وضعیت‌ها' }",
  "{ value: '', label: 'همه ریسک‌ها' }",
  "{ value: 'latest', label: 'جدیدترین' }",
  'unstyled-table w-full min-w-[62rem] table-fixed border-collapse text-xs',
  'scope="col"',
  'role="region"',
  'controlOnly',
  'در هر صفحه',
]) {
  assert.ok(page.includes(token), `installment directory must include ${token}`);
}

for (const retiredToken of [
  'PeopleDirectoryToolbar',
  'DataTableShell',
  'data-ui-installment',
  'installment-sales-responsive',
  'data-ui-installment-view="cards"',
  'installment-card-actions',
  '<PanelCard',
  'lg:grid-cols-12',
  'min-w-[980px]',
]) {
  assert.ok(!page.includes(retiredToken), `installment directory must not retain ${retiredToken}`);
}

for (const css of [tablesCss, generatedCss]) {
  assert.ok(!css.includes('.installment-sales-responsive'), 'installment-only responsive/card CSS must be removed from source and generated CSS.');
  assert.ok(!css.includes('.installment-sales-page'), 'installment-only page overrides must be removed from source and generated CSS.');
  assert.ok(!css.includes('@container installment-sales-list'), 'installment list must not auto-cardify through a container query.');
}

assert.ok(!page.includes("label: `در حال پرداخت ("), 'selected status labels must not repeat KPI counts or truncate inside the control.');
assert.ok(!page.includes("label: `ریسک بالا ("), 'selected risk labels must not repeat KPI counts or truncate inside the control.');

console.log('Installment directory v220 successor audit passed: complete-label filters, compact native semantic table, local overflow, unified pagination, and no feature-owned CSS hooks.');
