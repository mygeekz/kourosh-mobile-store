import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  calculatePartnerAccountSnapshot,
  getPartnerPhoneReferencePurchasePrice,
} from '../calculations';

(() => {
  assert.strictEqual(
    getPartnerPhoneReferencePurchasePrice({ purchasePrice: 10_000_000, currentPurchasePrice: 15_000_000 }),
    15_000_000,
    'گوشی همکار باید اول با قیمت خرید روز/جایگزینی محاسبه شود، نه قیمت ثبت اولیه.'
  );

  assert.strictEqual(
    getPartnerPhoneReferencePurchasePrice({ purchasePrice: 10_000_000, currentPurchasePrice: 0 }),
    10_000_000,
    'اگر قیمت خرید روز صفر یا خالی بود، باید به قیمت ثبت اولیه برگردد.'
  );
})();

(() => {
  const snapshot = calculatePartnerAccountSnapshot({
    ledger: [
      { credit: 60_000_000, debit: 5_000_000 },
    ],
    phones: [
      { status: 'فروخته شده', purchasePrice: 10_000_000, currentPurchasePrice: 15_000_000 },
      { status: 'موجود در انبار', purchasePrice: 8_000_000, currentPurchasePrice: 12_000_000 },
      { status: 'فروخته شده (قسطی)', purchasePrice: 20_000_000, currentPurchasePrice: 0 },
    ],
    accessories: [
      { purchasePrice: 500_000, stock_quantity: 4 },
      { purchasePrice: 1_000_000, stock_quantity: 0 },
    ],
  });

  assert.strictEqual(snapshot.currentBalance, 55_000_000, 'مانده دفتر همکار باید credit - debit باشد.');
  assert.strictEqual(snapshot.soldPhoneCurrentDeltaAmount, 5_000_000, 'اختلاف قیمت خرید روز فقط برای گوشی فروخته‌شده اعمال شود.');
  assert.strictEqual(snapshot.unsoldPhonesInventoryAmount, 12_000_000, 'گوشی فروخته‌نشده باید با قیمت خرید روز از مانده وصول‌شده حذف شود.');
  assert.strictEqual(snapshot.unsoldAccessoriesInventoryAmount, 2_000_000, 'لوازم فروخته‌نشده باید از مانده وصول‌شده حذف شود.');
  assert.strictEqual(snapshot.realizedCollectedBalance, 46_000_000, 'مانده وصول‌شده باید همه‌چیز را حساب کند به جز گوشی و لوازم فروخته‌نشده.');
})();

(() => {
  const databasePath = path.resolve(process.cwd(), 'server/database.ts');
  const databaseSource = fs.readFileSync(databasePath, 'utf8');

  assert.match(
    databaseSource,
    /COALESCE\(NULLIF\(ph\.currentPurchasePrice, 0\), ph\.purchasePrice, 0\).*AS phoneSalesReceivableAmount/s,
    'SQL جزئیات/لیست همکار باید برای گوشی‌های فروخته‌شده currentPurchasePrice را قبل از purchasePrice استفاده کند.'
  );

  assert.match(
    databaseSource,
    /AS realizedCollectedBalance/s,
    'SQL همکار باید خروجی realizedCollectedBalance برای باکس مانده وصول‌شده حساب داشته باشد.'
  );
})();

console.log('Partner account calculation checks passed.');
