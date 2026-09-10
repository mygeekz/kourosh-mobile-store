// Synthetic supplier records; no production identities or credentials.
export const name = 'تأمین‌کننده آزمایشی با نام طولانی برای بررسی کامل خوانایی فارسی و اطلاعات همکاری';
export const huge = 1234567890123.25;
export const largeText = '۱٬۲۳۴٬۵۶۷٬۸۹۰٬۱۲۳٫۲۵ تومان';
export const negativeText = '-' + largeText;
export const date = '1405/06/19';
export const accounts = {
  creditor: { code: 'creditor', label: 'بستانکار از فروشگاه', amount: huge, signedBalance: huge },
  debtor: { code: 'debtor', label: 'بدهکار به فروشگاه', amount: huge, signedBalance: -huge },
  settled: { code: 'settled', label: 'تسویه کامل', amount: 0, signedBalance: 0 },
};
export const ledger = [
  { id: 1, description: name, transactionDate: date, debit: 0, credit: huge, balance: -huge },
  { id: 2, description: 'بدهکار و بستانکار مستقل', transactionDate: date, debit: huge, credit: 25, balance: huge },
  { id: 3, description: 'رکورد صفر', transactionDate: date, debit: 0, credit: 0, balance: 0 },
];
export const phones = [
  { ref: 'phone-1', name, identifier: '123456789012345', purchaseDate: date, status: 'فروخته‌شده', settlement: { code: 'open', label: 'تسویه‌نشده', amount: huge, paidAmount: 0, remainingAmount: huge, lastPaymentDate: null } },
  { ref: 'phone-2', name: 'گوشی با پرداخت بخشی از مبلغ', identifier: '123456789012346', purchaseDate: date, status: 'فروخته‌شده', settlement: { code: 'open', label: 'تسویه‌نشده', amount: 100, paidAmount: 25, remainingAmount: 75, lastPaymentDate: date } },
  { ref: 'phone-3', name: 'گوشی تسویه‌شده', identifier: '123456789012347', purchaseDate: date, status: 'فروخته‌شده', settlement: { code: 'settled', label: 'تسویه‌شده', amount: 100, paidAmount: 100, remainingAmount: 0, lastPaymentDate: date } },
];
const profile = { id: 1, name, type: 'supplier', contactName: name, phoneNumber: '09000000000', email: 'long.supplier.email.for.readability@example.invalid' };
const supplied = { total: 4, phones: 3, products: 1, totalSupplyAmount: huge };
const phoneSettlement = { total: 3, open: 2, settled: 1, amount: huge, paidAmount: 125, remainingAmount: huge };
export const makeFixture = (endpoint, accountCode = 'creditor') => {
  const account = accounts[accountCode];
  const paged = { page: 1, pageSize: 20, total: 4, totalPages: 2 };
  if (endpoint === '/home') return { partner: profile, account, supplied, phoneSettlement, ledger: { total: 4, lastActivity: date, recent: ledger } };
  if (endpoint === '/account') return { partner: profile, account, supplied, phoneSettlement, totalDebit: 0, totalCredit: huge };
  if (endpoint === '/ledger') return { ...paged, account, items: ledger };
  if (endpoint === '/phones') return { ...paged, items: phones, summary: { total: 3, amount: huge, paidAmount: 125, remainingAmount: huge } };
  if (endpoint === '/purchases') return { ...paged, items: [
    ...phones.slice(0, 2).map(item => ({ ...item, type: 'phone', quantity: 1, unit: 'عدد', supplyAmount: item.settlement.amount })),
    { ref: 'product-3', type: 'product', name: 'کالای بدون اطلاعات تسویه', identifier: null, quantity: 2, unit: 'عدد', purchaseDate: date, supplyAmount: 0, settlement: null, status: null },
  ] };
  return null;
};
export const screens = [
  { route: '/', name: 'home', money: { signedBalance: largeText, totalSupplyAmount: largeText, settlementRemaining: largeText, 'ledger-1-balance': negativeText } },
  { route: '/account', name: 'account', money: { signedBalance: largeText, accountAmount: largeText, totalDebit: '۰ تومان', totalCredit: largeText } },
  { route: '/ledger', name: 'ledger', money: { signedBalance: largeText, 'ledger-1-debit': '۰ تومان', 'ledger-1-credit': largeText, 'ledger-1-balance': negativeText, 'ledger-2-debit': largeText, 'ledger-2-credit': '۲۵ تومان', 'ledger-3-balance': '۰ تومان' } },
  { route: '/purchases', name: 'goods', money: { 'phone-1-supply': largeText, 'phone-1-paid': '۰ تومان', 'phone-2-remaining': '۷۵ تومان', 'product-3-supply': '۰ تومان' } },
  { route: '/phones', name: 'settlements', money: { summaryAmount: largeText, 'phone-1-amount': largeText, 'phone-1-paid': '۰ تومان', 'phone-1-remaining': largeText, 'phone-2-paid': '۲۵ تومان', 'phone-2-remaining': '۷۵ تومان', 'phone-3-paid': '۱۰۰ تومان', 'phone-3-remaining': '۰ تومان' } },
  { route: '/more', name: 'legacy-more', money: { signedBalance: largeText, totalCredit: largeText } },
];
