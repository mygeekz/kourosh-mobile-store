import assert from 'node:assert/strict';
import fs from 'node:fs';

const listFile = 'pages/InstallmentSalesPage.tsx';
const detailFile = 'pages/InstallmentSaleDetailPage.tsx';
const listSource = fs.readFileSync(listFile, 'utf8');
const detailSource = fs.readFileSync(detailFile, 'utf8');

const includesAll = (source, needles, label) => {
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${label} must include ${needle}`);
  }
};

includesAll(listSource, [
  'مرکز کنترل اقساط',
  'نمای کلی فروش اقساطی',
  'فهرست فروش اقساطی',
  'ManagementKpiGrid',
  'ManagementFilterSurface',
  'ariaLabel="فیلتر وضعیت قرارداد"',
  'ariaLabel="جستجوی فروش اقساطی"',
  'unstyled-table',
  'role="region"',
  'aria-label="نمای فروش اقساطی"',
], 'InstallmentSalesPage');

assert.ok(!listSource.includes('title="کنترل اقساط"'), 'InstallmentSalesPage must not restore the old standalone control card.');
assert.ok(!listSource.includes('FilterChipsBar'), 'InstallmentSalesPage list filters must use the unified directory filter surface, not the old status-chip strip.');
assert.ok(!listSource.includes('headerLayout="inline"'), 'InstallmentSalesPage must use the standard PageKit header and keep search inside the directory filter surface.');
assert.ok(!listSource.includes('toolbarRight={'), 'InstallmentSalesPage toolbar actions must stay out of the PageKit header to keep the header compact.');
assert.ok(!listSource.includes('secondaryRow={'), 'InstallmentSalesPage status filters must stay out of the PageKit header to prevent tall/empty header layouts.');
assert.ok(!listSource.includes('installment-sales-responsive'), 'InstallmentSalesPage must not restore feature-owned responsive CSS or container queries.');
assert.ok(!listSource.includes('data-ui-installment-view="cards"'), 'InstallmentSalesPage comparative data must stay a semantic table with local overflow instead of auto-cardifying.');
assert.ok(!listSource.includes('DataTableShell'), 'InstallmentSalesPage table must stay outside the legacy ux-table-shell cascade.');
assert.ok(!listSource.includes('data-ui-installment'), 'InstallmentSalesPage must not expose feature-owned CSS hooks.');

includesAll(detailSource, [
  'title="تسویه کامل"',
  'ariaLabel="بخش‌های پرونده فروش اقساطی"',
  'position: \'top-center\'',
  'allRecordedPaymentsSettled',
  'title={`قسط ${p.installmentNumber.toLocaleString(\'fa-IR\')}`}',
  'title="برنامه اقساط و وضعیت پرداخت"',
  'title="پرداخت‌ها"',
  'title="چک‌های دریافتی"',
], 'InstallmentSaleDetailPage');

assert.ok(!detailSource.includes('toast.custom('), 'Final installment settlement must not render the old fixed custom toast that could overlap the right sidebar.');
assert.ok(!detailSource.includes('INSTALLMENT SCHEDULE'), 'Installment detail must not restore the legacy English schedule kicker.');
assert.ok(!detailSource.includes('const Tile ='), 'Installment detail KPIs must use the canonical PanelCard metric contract.');

includesAll(detailSource, [
  'DialogActions',
  'ModalField',
  'layout="horizontal"',
  'ثبت پرداخت قسط شماره',
  'title="ویرایش ریز پرداخت"',
  'title={`ثبت دریافت نقدی چک شماره ${cashCheck.checkNumber}`}',
  'title={`ویرایش چک شماره ${editingCheck.checkNumber}`}',
], 'InstallmentSaleDetailPage modal contract');

const horizontalModalCount = (detailSource.match(/layout="horizontal"/g) || []).length;
assert.ok(horizontalModalCount >= 5, `Installment detail operational dialogs must stay horizontal; found ${horizontalModalCount}.`);
assert.ok(!/<input\b/.test(detailSource), 'Installment detail must not render raw native inputs; use TextField/PriceInput through ModalField.');
assert.ok(!/<label\b/.test(detailSource), 'Installment detail modal labels must be owned by ModalField/ControlShell.');
for (const legacyModalToken of ['installment-payment-modal', 'installment-edit-tx-modal', 'NEW PAYMENT ENTRY', 'PAYMENT DETAIL EDITOR', 'Check recovery summary']) {
  assert.ok(!detailSource.includes(legacyModalToken), `Installment detail must not restore legacy modal chrome/copy: ${legacyModalToken}`);
}

for (const cssFile of [
  'index.css',
  'styles/components/modal-system.css',
  'styles/system/modal-partner-foundation.css',
  'styles/system/header-sidebar-navigation-foundation.css',
  'styles/generated/tailwind-entry.generated.css',
]) {
  const cssSource = fs.readFileSync(cssFile, 'utf8');
  assert.ok(!cssSource.includes('installment-payment-modal'), `${cssFile} must not retain retired installment payment modal CSS.`);
  assert.ok(!cssSource.includes('installment-edit-tx-modal'), `${cssFile} must not retain retired installment edit transaction modal CSS.`);
}

for (const legacyCopy of ['NEXT INSTALLMENT', 'INSTALLMENT PAYMENT', 'Payments ledger', 'Due:']) {
  assert.ok(!detailSource.includes(legacyCopy), `Installment detail must keep visible operational copy Persian-only; found ${legacyCopy}`);
}

console.log('Installment sales UI contract audit passed: customer-grade directory hierarchy, shared directory toolbar, semantic locally scrollable table, canonical detail surfaces/tabs, horizontal modal primitives, and sidebar-safe settlement feedback.');
