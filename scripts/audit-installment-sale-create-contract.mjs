import assert from 'node:assert/strict';
import fs from 'node:fs';

const pageFile = 'pages/AddInstallmentSalePage.tsx';
const validatorFile = 'server/validators.ts';
const dbFile = 'server/db/domains/installments.db.ts';

const pageSource = fs.readFileSync(pageFile, 'utf8');
const validatorSource = fs.readFileSync(validatorFile, 'utf8');
const dbSource = fs.readFileSync(dbFile, 'utf8');

const includesAll = (source, needles, label) => {
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${label} must include ${needle}`);
  }
};

includesAll(pageSource, [
  'PanelCard',
  'ModalField',
  'DialogActions',
  'TableActionGroup',
  'id="checks-section"',
  "errors.checks = 'برای فروش چکی، ثبت حداقل یک چک الزامی است.'",
  'جمع مبلغ چک‌ها باید دقیقاً با مانده قرارداد برابر باشد',
  'تاریخ شروع اقساط نمی‌تواند قبل از تاریخ فروش باشد',
  'قسط آخرِ تنظیم‌شده هنگام ثبت',
  "'stock_quantity'",
], 'AddInstallmentSalePage');

const horizontalModalCount = (pageSource.match(/layout="horizontal"/g) || []).length;
assert.ok(horizontalModalCount >= 3, `Create-installment operational dialogs must stay horizontal; found ${horizontalModalCount}.`);
assert.ok(!pageSource.includes('className="app-card'), 'Create-installment primary cards must use the canonical PanelCard contract.');
assert.ok(!pageSource.includes('/adjust-stock'), 'Create-installment page must not decrement accessory stock after the transactional backend save.');
assert.ok(!pageSource.includes('/decrement'), 'Create-installment page must not use the legacy accessory decrement fallback.');
assert.ok(!pageSource.includes('inventoryAdjustments:'), 'Create-installment payload must not carry a second frontend-owned stock decrement instruction.');

includesAll(validatorSource, [
  'پیش پرداخت نمی‌تواند بیشتر از مبلغ کل قرارداد باشد',
  'const adjustedLastInstallment = remainingDebt',
  'جمع مبلغ چک‌ها باید دقیقاً با مانده قرارداد برابر باشد',
  'شماره چک «${normalizedCheckNumber}» تکراری است.',
], 'Installment sale validator');

includesAll(dbSource, [
  'const finalInstallmentAmount = remainingDebt',
  'i === nInst - 1 ? finalInstallmentAmount : instAmt',
  'تاریخ شروع اقساط نمی‌تواند قبل از تاریخ فروش باشد',
  'تاریخ سررسید چک نمی‌تواند قبل از تاریخ فروش باشد',
  'const ledgerDateIso = `${saleDateISO}T12:00:00.000Z`',
  'stock_quantity >= ?',
  "status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')",
], 'Installment sale database contract');

console.log('Installment sale create contract audit passed: canonical cards/actions, horizontal dialogs, single stock owner, exact payment schedule, check reconciliation, and sale-date accounting guards.');
