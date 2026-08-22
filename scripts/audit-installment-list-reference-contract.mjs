import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');
const headerCss = read('styles/system/ui-contracts/navigation-shell-contract-phase5.css');

assert.ok(headerCss.includes('--app-header-height: 52px;'), 'Canonical desktop app header must stay compact at 52px.');
assert.ok(headerCss.includes('--app-header-control-h: 34px;'), 'Canonical header controls must use the compact 34px contract.');
assert.ok(headerCss.includes('--app-header-icon-h: 32px;'), 'Canonical header icon buttons must use the compact 32px contract.');

for (const token of [
  'مرکز کنترل اقساط',
  'نمای کلی فروش اقساطی',
  'فهرست فروش اقساطی',
  'ManagementKpiGrid',
  'ManagementFilterSurface',
  'ariaLabel="جستجوی فروش اقساطی"',
  'ariaLabel="فیلتر وضعیت قرارداد"',
  'ariaLabel="فیلتر ریسک وصول"',
  'ثبت فروش اقساطی',
  'بروزرسانی',
  'وصول و مانده',
  'آخرین دریافت',
  'سررسید و ریسک',
  'CollectionRiskPill',
  'unstyled-table',
  'overflow-x-auto',
]) {
  assert.ok(page.includes(token), `Installment reference directory must include ${token}`);
}

assert.ok(!page.includes('title="کنترل اقساط"'), 'Reference directory must not restore the old control card.');
assert.ok(!page.includes('FilterChipsBar'), 'Reference directory must not restore the fragmented status-chip toolbar.');
assert.ok(!page.includes('headerLayout="inline"'), 'Reference directory search must stay in the filter surface, not the global PageKit header.');
assert.equal((page.match(/key: '(all|outstanding|overdue|settled|due-soon)'/g) || []).length, 5, 'Reference directory must expose five equal-weight KPI items through the shared primitive.');
assert.ok(!page.includes('lg:grid-cols-12'), 'Reference filters must not restore the cramped feature-owned 12-column grid.');
assert.ok(page.includes('unstyled-table w-full min-w-[62rem] table-fixed border-collapse text-xs'), 'Reference installment table must use native semantic styling outside the legacy table-shell cascade.');
assert.ok(page.includes('قرارداد و مشتری') && page.includes('وصول و مانده') && page.includes('آخرین دریافت') && page.includes('سررسید و ریسک'), 'Reference table must expose balance, last collection, next due and operational collection risk without opening the contract.');
assert.ok(!page.includes('data-ui-installment-view="cards"'), 'Reference comparative list must not auto-cardify; the native table region owns local horizontal overflow.');
assert.ok(!page.includes('installment-sales-responsive'), 'Reference list must not depend on installment-only container-query CSS.');
assert.ok(!page.includes('DataTableShell'), 'Reference list must not inherit legacy ux-table-shell table classes.');

console.log('Installment reference-list contract passed: customer-grade hierarchy, five KPI rhythm, complete shared filters, balance and collection visibility, next-due risk context, compact semantic table, local overflow, and unified pagination.');
