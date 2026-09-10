// Synthetic customer data only. Accounting direction differs from Partner.
export const name = 'مشتری آزمایشی با نام طولانی برای بررسی خوانایی فارسی و نمایش کامل سوابق خرید';
export const huge = 1234567890123.25;
export const largeText = '۱٬۲۳۴٬۵۶۷٬۸۹۰٬۱۲۳٫۲۵ تومان';
export const date = '1405/06/19';
export const accounts = {
  debtor: { code: 'debtor', label: 'بدهکار', signedBalance: huge, amount: huge },
  creditor: { code: 'creditor', label: 'بستانکار', signedBalance: -huge, amount: huge },
  settled: { code: 'settled', label: 'تسویه', signedBalance: 0, amount: 0 },
};
const purchase = { ref: 'order-1', source: 'sales_order', id: 1, transactionDate: date, itemsSummary: name, quantity: 2, totalAmount: huge, purchaseType: 'cash', purchaseTypeLabel: 'نقدی', invoiceRef: 'order-1' };
const sale = { id: 1, saleType: 'installment', itemsSummary: name, saleDate: date, totalAmount: huge, downPayment: 0, collectedAmount: 125, remainingAmount: 275, installmentCount: 4, paidInstallmentCount: 1, remainingInstallmentCount: 3, nextDueDate: date, nextDueAmount: 75, overdueCount: 1, status: 'فعال' };
const completed = { ...sale, id: 2, itemsSummary: 'قرارداد تسویه‌شده', totalAmount: 100, collectedAmount: 100, remainingAmount: 0, installmentCount: 1, paidInstallmentCount: 1, remainingInstallmentCount: 0, nextDueDate: null, nextDueAmount: 0, overdueCount: 0, status: 'تسویه‌شده' };
export const makeFixture = (endpoint, code = 'debtor') => {
  const account = accounts[code];
  if (endpoint === '/home') return { customer: { id: 1, fullName: name }, account, installments: { activeCount: 1, overdueCount: 1, next: { saleId: 1, dueDate: date, amount: 75 } }, lastPurchase: purchase };
  if (endpoint === '/purchases') return [purchase, { ...purchase, id: 3, ref: 'installment-3', source: 'installment_sale', invoiceRef: null }, { ...purchase, id: 4, ref: 'legacy-4', source: 'legacy_sale', invoiceRef: null }];
  if (endpoint === '/account') return { account, totalDebit: huge, totalCredit: 125, entries: [
    { id: 1, transactionDate: date, description: name, debit: huge, credit: 25, balance: -huge },
    { id: 2, transactionDate: date, description: 'گردش با مبلغ صفر', debit: 0, credit: 0, balance: 0 },
  ] };
  if (endpoint === '/installments') return [sale, completed];
  if (endpoint === '/installments/1') return { ...sale, items: [{ description: name, quantity: 1, unitPrice: huge, totalPrice: huge }], timeline: [
    { id: 6, installmentNumber: 1, dueDate: date, amount: 100, paidAmount: 100, remainingAmount: 0, paymentDate: date, state: 'paid' },
    { id: 7, installmentNumber: 2, dueDate: date, amount: 100, paidAmount: 25, remainingAmount: 75, paymentDate: date, state: 'overdue' },
    { id: 8, installmentNumber: 3, dueDate: date, amount: 100, paidAmount: 0, remainingAmount: 100, paymentDate: null, state: 'due' },
    { id: 9, installmentNumber: 4, dueDate: date, amount: 100, paidAmount: 0, remainingAmount: 100, paymentDate: null, state: 'upcoming' },
  ], checks: [{ id: 1, dueDate: date, amount: huge, bankName: 'بانک آزمایشی', status: 'در انتظار وصول' }] };
  if (endpoint === '/invoices/order-1') return { business: { name: 'فروشگاه آزمایشی کوروش', logoUrl: null }, invoiceNumber: 'INV-1405/ABC-001', transactionDate: date, paymentMethod: 'cash', paymentMethodLabel: 'نقدی', status: 'active', items: [{ id: 1, description: name, quantity: 2, unitPrice: huge, discountAmount: 12.5, totalPrice: huge }],
    // Deliberately independent totals detect accidental client-side recalculation.
    totals: { subtotal: huge, itemsDiscount: 25, globalDiscount: 10, taxAmount: 2.5, grandTotal: 9876543210.25 } };
  return null;
};
export const screens = [
  { route: '/', name: 'home', money: { nextAmount: '۷۵ تومان', accountAmount: largeText, 'purchase-1': largeText } },
  { route: '/purchases', name: 'purchases', money: { 'purchase-1': largeText, 'purchase-3': largeText } },
  { route: '/invoices/order-1', name: 'invoice', money: { 'item-1-unit': largeText, 'item-1-discount': '۱۲٫۵ تومان', 'item-1-total': largeText, subtotal: largeText, itemsDiscount: '۲۵ تومان', globalDiscount: '۱۰ تومان', taxAmount: '۲٫۵ تومان', grandTotal: '۹٬۸۷۶٬۵۴۳٬۲۱۰٫۲۵ تومان' } },
  { route: '/installments', name: 'installments', money: { 'sale-1-total': largeText, 'sale-1-paid': '۱۲۵ تومان', 'sale-1-remaining': '۲۷۵ تومان', 'sale-2-remaining': '۰ تومان', 'sale-2-paid': '۱۰۰ تومان' } },
  { route: '/installments/1?paymentId=7', name: 'payment-detail', money: { totalAmount: largeText, downPayment: '۰ تومان', collectedAmount: '۱۲۵ تومان', remainingAmount: '۲۷۵ تومان', 'payment-6-remaining': '۰ تومان', 'payment-7-amount': '۱۰۰ تومان', 'payment-7-paid': '۲۵ تومان', 'payment-7-remaining': '۷۵ تومان', 'payment-8-paid': '۰ تومان', 'check-1': largeText } },
  { route: '/account', name: 'account', money: { signedBalance: largeText, totalDebit: largeText, totalCredit: '۱۲۵ تومان', 'ledger-1-debit': largeText, 'ledger-1-credit': '۲۵ تومان', 'ledger-1-balance': '-' + largeText, 'ledger-2-balance': '۰ تومان' } },
];
