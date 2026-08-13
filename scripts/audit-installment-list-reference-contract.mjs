import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');
const headerCss = read('styles/system/ui-contracts/navigation-shell-contract-phase5.css');

assert.ok(headerCss.includes('--app-header-height: 52px;'), 'Canonical desktop app header must stay compact at 52px.');
assert.ok(headerCss.includes('--app-header-control-h: 34px;'), 'Canonical header controls must use the compact 34px contract.');
assert.ok(headerCss.includes('--app-header-icon-h: 32px;'), 'Canonical header icon buttons must use the compact 32px contract.');

for (const token of [
  'data-ui-installment-directory="true"',
  'مرکز کنترل اقساط',
  'نمای کلی فروش اقساطی',
  'فهرست فروش اقساطی',
  'aria-label="خلاصه فروش اقساطی"',
  'ariaLabel="جستجوی فروش اقساطی"',
  'ariaLabel="فیلتر وضعیت قرارداد"',
  'ariaLabel="فیلتر ریسک وصول"',
  'ثبت فروش اقساطی',
  'بروزرسانی',
  'وصول و مانده',
  'آخرین دریافت',
  'سررسید و ریسک',
  'CollectionRiskPill',
]) {
  assert.ok(page.includes(token), `Installment reference directory must include ${token}`);
}

assert.ok(!page.includes('title="کنترل اقساط"'), 'Reference directory must not restore the old control card.');
assert.ok(!page.includes('FilterChipsBar'), 'Reference directory must not restore the fragmented status-chip toolbar.');
assert.ok(!page.includes('headerLayout="inline"'), 'Reference directory search must stay in the filter surface, not the global PageKit header.');
assert.equal((page.match(/data-ui-installment-kpi=/g) || []).length, 5, 'Reference directory must expose five equal-weight KPI cards.');
assert.ok(page.includes('lg:grid-cols-5'), 'Reference KPI row must use the five-column desktop directory rhythm.');
assert.ok(page.includes('lg:grid-cols-12'), 'Reference filter surface must use the responsive 12-column control grid.');
assert.ok(page.includes('min-w-[980px] table-fixed text-[11px] xl:text-xs'), 'Reference installment table must keep enough desktop width for financial and collection-state columns.');
assert.ok(page.includes('قرارداد و مشتری') && page.includes('وصول و مانده') && page.includes('آخرین دریافت') && page.includes('سررسید و ریسک'), 'Reference table must expose balance, last collection, next due and operational collection risk without opening the contract.');
assert.ok(page.includes('data-ui-installment-view="cards"'), 'Reference installment list must preserve the mobile-card representation.');

console.log('Installment reference-list contract passed: customer-grade hierarchy, five KPI rhythm, status/risk filters, balance and collection visibility, next-due risk context, dense desktop table, and mobile cards.');
