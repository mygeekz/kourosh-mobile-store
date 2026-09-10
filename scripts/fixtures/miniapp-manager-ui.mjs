// Synthetic records only. Values deliberately exercise signed, zero and large balances.
export const name = 'فروشگاه و مشتری آزمایشی با نام بسیار بلند برای بررسی خوانایی کامل اطلاعات فارسی';
export const huge = 1234567890123.25;
export const permissions = ['dashboard.read', 'sales.read', 'profits.read', 'customers.read', 'customers.ledger.read', 'partners.read', 'partners.ledger.read', 'installments.read', 'inventory.read', 'repairs.read'];
const date = '1405/06/19';
const page = { page: 1, pageSize: 30, total: 31, totalPages: 2 };
const account = { signedBalance: -huge, amount: huge, code: 'creditor', label: 'بستانکار از فروشگاه' };
const supplied = { total: 2, phones: 1, products: 1, totalSupplyAmount: huge };
const settlement = { label: 'تسویه کامل', code: 'settled', amount: huge, paidAmount: huge, remainingAmount: 0 };
const ledger = [{ id: 1, description: name, transactionDate: date, debit: 0, credit: huge, balance: -huge }];
export const fixtures = {
  '/dashboard': { generatedAt: new Date().toISOString(), widgets: {
    sales: { todayAmount: huge, todayTransactions: 12, averageSaleValue: 0 }, profit: { todayGrossProfit: -huge },
    customerReceivables: { debtorsCount: 2, totalReceivables: huge, creditorsCount: 1, totalCustomerCredit: 0 },
    partnerAccounts: { totalPartners: 3, positiveBalanceCount: 2, positiveBalanceAmount: huge, negativeBalanceCount: 1, negativeBalanceAmount: 100 },
    installments: { overdueCount: 1, overdueAmount: huge, dueTodayCount: 0, dueTodayAmount: 0, next7Count: 2, next7Amount: 100 },
    inventory: { activeItemsCount: 24 }, repairs: { openCount: 1, readyForPickupCount: 0, waitingPartCount: 1, oldestOpen: { id: 1, customerName: name, deviceModel: 'گوشی آزمایشی', status: 'منتظر قطعه', ageDays: 8 } },
  } },
  '/sales-summary': { period: 'today', from: date, to: date, totalRevenue: huge, grossProfit: -huge, totalTransactions: 2, averageSaleValue: 0, topSellingItems: [{ id: 1, itemType: 'phone', itemName: name, totalRevenue: huge, quantitySold: 2 }] },
  '/installments/due': { ...page, scope: 'overdue', items: [{ paymentId: 1, saleId: 1, customerId: 1, customerName: name, dueDate: date, remainingAmount: huge, status: 'overdue', overdueDays: 8 }] },
  '/customers': { ...page, items: [{ id: 1, fullName: name, phoneNumber: '09000000000', currentBalance: -huge }, { id: 2, fullName: 'مشتری تسویه‌شده', phoneNumber: null, currentBalance: 0 }] },
  '/partners': { ...page, items: [{ id: 1, name, phoneNumber: '09000000000', currentBalance: -huge, account }] },
  '/repairs': { ...page, summary: { openCount: 1, readyForPickupCount: 0, waitingPartCount: 1, oldestOpen: null }, items: [{ id: 1, customerName: name, deviceModel: 'مدل آزمایشی', problemDescription: name, status: 'منتظر قطعه', ageDays: 8, estimatedCost: huge, finalCost: 0, technicianName: name }] },
  '/inventory/phones': { page: 1, limit: 30, offset: 0, query: '', items: [{ id: 1, model: name, imei: '123456789012345', status: 'موجود', color: 'آبی', storage: '256 GB', ram: '8 GB', salePrice: huge }] },
  '/customers/1': { customer: { id: 1, fullName: name, phoneNumber: '09000000000', address: name }, account: { account: { ...account, label: 'بستانکار' }, totalDebit: 0, totalCredit: 0 }, purchases: { count: 31, totalAmount: huge }, installments: { activeCount: 1, overdueCount: 1 } },
  '/customers/1/purchases': { page: 1, pageSize: 10, hasMore: true, totalKnown: 11, items: [{ id: 1, ref: 'sale:1', itemsSummary: name, totalAmount: huge, purchaseTypeLabel: 'نقدی', transactionDate: date }] },
  '/customers/1/installments': [{ id: 1, itemsSummary: name, overdueCount: 1, nextDueDate: date, status: 'فعال', remainingAmount: 0 }],
  '/customers/1/ledger': { ...page, summary: { totalDebit: 0, totalCredit: huge, currentBalance: -huge }, items: ledger },
  '/partners/1': { partner: { id: 1, name, phoneNumber: '09000000000', type: 'supplier' }, supplied, account: { account }, phoneSettlement: { total: 1, open: 0, settled: 1, amount: huge, paidAmount: huge, remainingAmount: 0 } },
  '/partners/1/purchases': { ...page, items: [{ ref: 'phone:1', name, quantity: 1, unit: 'عدد', purchaseDate: date, supplyAmount: huge }] },
  '/partners/1/settlements': { ...page, items: [{ ref: 'phone:1', name, settlement }] },
  '/partners/1/ledger': { ...page, items: ledger, account },
  '/partners/1/accounting-breakdown': { summary: { profitShareAccrued: -huge, profitAllocationCount: 1 }, profitAllocations: [{ id: 1, itemDescription: name, amount: -huge, sharePercent: 25, saleDate: date }] },
  '/installments/1': { saleId: 1, customer: { id: 1, fullName: name }, saleDate: date, itemSummary: name, actualSalePrice: huge, downPayment: 0, paidAmount: huge, remainingAmount: 0, totalInstallmentCount: 1, status: 'تسویه‌شده', paymentTimeline: [{ paymentId: 1, installmentNumber: 1, dueDate: date, amount: huge, paidAmount: huge, remainingAmount: 0, status: 'paid', paymentDate: date }], checks: [{ checkId: 1, bankName: 'بانک آزمایشی', dueDate: date, amount: huge, status: 'وصول‌شده' }] },
  '/notifications': { unreadCount: 1, items: [{ id: 1, title: name, body: name, severity: 'warning', readAt: null, createdAt: new Date().toISOString(), sourceEventType: 'fixture', entityType: 'fixture' }] },
};
// Explicit expected text, independent of production formatting code.
export const largeText = '۱٬۲۳۴٬۵۶۷٬۸۹۰٬۱۲۳٫۲۵ تومان';
export const negativeText = '-' + largeText;
export const screens = [
  { route: '/', name: 'home', money: { todayAmount: largeText, todayGrossProfit: negativeText, averageSaleValue: '۰ تومان', overdueAmount: largeText, totalCustomerCredit: '۰ تومان', positiveBalanceAmount: largeText } },
  { route: '/sales?period=month', name: 'sales', money: { totalRevenue: largeText, grossProfit: negativeText, averageSaleValue: '۰ تومان', 'sales-item-1': largeText } },
  { route: '/dues?scope=overdue', name: 'dues', money: { 'due-1': largeText } },
  { route: '/directory?type=customer', name: 'customers', money: { 'directory-1': negativeText, 'directory-2': '۰ تومان' } },
  { route: '/directory?type=partner', name: 'partners', money: { 'directory-1': largeText } },
  { route: '/operations?tab=repairs', name: 'repairs', money: { 'repair-1': '۰ تومان' } },
  { route: '/operations?tab=inventory', name: 'inventory', money: { 'phone-1': largeText } },
  { route: '/customers/1', name: 'customer-detail', money: { customerAccountAmount: largeText, customerTotalCredit: '۰ تومان', 'purchase-1': largeText, 'ledger-1-debit': '۰ تومان', 'ledger-1-credit': largeText, 'ledger-1-balance': negativeText } },
  { route: '/partners/1', name: 'partner-detail', money: { partnerAccountAmount: largeText, totalSupplyAmount: largeText, settlementRemaining: '۰ تومان', profitShareAccrued: negativeText, 'allocation-1': negativeText, 'ledger-1-balance': negativeText } },
  { route: '/installments/1', name: 'installment-detail', money: { actualSalePrice: largeText, downPayment: '۰ تومان', remainingAmount: '۰ تومان', 'payment-1-remaining': '۰ تومان', 'payment-1-amount': largeText, 'check-1': largeText } },
  { route: '/notifications', name: 'notifications', money: {} },
];
