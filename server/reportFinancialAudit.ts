export type AuditSeverity = 'critical' | 'warning' | 'info';
export type AuditArea = 'sales' | 'profit' | 'payments' | 'inventory' | 'partners';

export interface FinancialAuditIssue {
  id: string;
  severity: AuditSeverity;
  area: AuditArea;
  title: string;
  description: string;
  entityType: string;
  entityId?: number | string | null;
  expected?: number;
  actual?: number;
  difference?: number;
  actionHint: string;
}

export interface FinancialAuditInput {
  invoiceRows?: any[];
  itemRows?: any[];
  installmentRows?: any[];
  inventoryRows?: any[];
  phoneRows?: any[];
  partnerLedgerRows?: any[];
}

const n = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const diff = (a: number, b: number): number => roundMoney(a - b);
const isMeaningful = (value: number, tolerance = 1): boolean => Math.abs(value) > tolerance;

const pushIssue = (issues: FinancialAuditIssue[], issue: FinancialAuditIssue) => {
  issues.push({ ...issue, difference: issue.difference == null ? undefined : roundMoney(issue.difference) });
};

export function buildFinancialAudit(input: FinancialAuditInput) {
  const issues: FinancialAuditIssue[] = [];
  const invoiceRows = input.invoiceRows || [];
  const itemRows = input.itemRows || [];
  const installmentRows = input.installmentRows || [];
  const inventoryRows = input.inventoryRows || [];
  const phoneRows = input.phoneRows || [];
  const partnerLedgerRows = input.partnerLedgerRows || [];

  const invoiceItemMap = new Map<number, any[]>();
  for (const item of itemRows) {
    const orderId = n(item.orderId);
    if (!invoiceItemMap.has(orderId)) invoiceItemMap.set(orderId, []);
    invoiceItemMap.get(orderId)!.push(item);
  }

  for (const invoice of invoiceRows) {
    const id = n(invoice.id);
    const subtotal = n(invoice.subtotal);
    const discount = Math.max(0, n(invoice.discount));
    const taxRate = Math.max(0, n(invoice.tax));
    const grandTotal = n(invoice.grandTotal);
    const calculatedGrand = roundMoney(Math.max(0, subtotal - discount) * (1 + taxRate / 100));
    const invoiceDiff = diff(calculatedGrand, grandTotal);
    if (isMeaningful(invoiceDiff, 5)) {
      pushIssue(issues, {
        id: `invoice-total-${id}`,
        severity: 'critical',
        area: 'sales',
        title: 'اختلاف مبلغ نهایی فاکتور',
        description: 'جمع فاکتور با فرمول subtotal - discount + tax با مبلغ نهایی ثبت‌شده یکسان نیست.',
        entityType: 'sales_order',
        entityId: id,
        expected: calculatedGrand,
        actual: grandTotal,
        difference: invoiceDiff,
        actionHint: 'فاکتور را بازبینی کن؛ احتمالاً تخفیف کلی، مالیات یا مبلغ نهایی بعد از ویرایش همگام نشده است.',
      });
    }

    const rows = invoiceItemMap.get(id) || [];
    if (!rows.length) {
      pushIssue(issues, {
        id: `invoice-no-items-${id}`,
        severity: 'critical',
        area: 'sales',
        title: 'فاکتور بدون ردیف کالا',
        description: 'برای این فاکتور مبلغ نهایی وجود دارد اما هیچ ردیف کالایی ثبت نشده است.',
        entityType: 'sales_order',
        entityId: id,
        actual: grandTotal,
        actionHint: 'جزئیات فاکتور را بازیابی یا فاکتور را اصلاح کن؛ این مورد می‌تواند گزارش سود و فروش را خراب کند.',
      });
      continue;
    }

    const rowsNet = rows.reduce((sum, row) => sum + n(row.totalPrice), 0);
    const expectedRowsNet = Math.max(0, subtotal - discount);
    const rowDiff = diff(rowsNet, expectedRowsNet);
    if (isMeaningful(rowDiff, 10)) {
      pushIssue(issues, {
        id: `invoice-lines-${id}`,
        severity: 'warning',
        area: 'sales',
        title: 'اختلاف جمع ردیف‌ها با مبلغ قابل فروش فاکتور',
        description: 'جمع totalPrice ردیف‌های فاکتور با مبلغ بعد از تخفیف کلی برابر نیست؛ این معمولاً باعث خطای گزارش کالاهای چندقلمی می‌شود.',
        entityType: 'sales_order',
        entityId: id,
        expected: expectedRowsNet,
        actual: rowsNet,
        difference: rowDiff,
        actionHint: 'منطق توزیع تخفیف کلی روی ردیف‌ها را بررسی کن و در گزارش‌ها از سهم نسبی تخفیف استفاده کن.',
      });
    }
  }

  for (const item of itemRows) {
    const itemType = String(item.itemType || '').trim();
    const buyPrice = n(item.buyPrice);
    const fallbackCost = n(item.productPurchasePrice || item.phoneCurrentPurchasePrice || item.phonePurchasePrice);
    const quantity = Math.max(1, n(item.quantity));
    const revenue = n(item.totalPrice) || n(item.unitPrice) * quantity;
    if ((itemType === 'inventory' || itemType === 'phone') && revenue > 0 && buyPrice <= 0 && fallbackCost <= 0) {
      pushIssue(issues, {
        id: `missing-cost-${item.orderId}-${item.id}`,
        severity: 'critical',
        area: 'profit',
        title: 'بهای تمام‌شده نامشخص',
        description: 'ردیف فروش درآمد دارد اما قیمت خرید/بهای تمام‌شده برای محاسبه سود واقعی صفر یا خالی است.',
        entityType: 'sales_order_item',
        entityId: item.id,
        actual: 0,
        actionHint: 'برای کالا/گوشی قیمت خرید معتبر ثبت کن؛ در غیر این صورت سود این فروش بیش‌نمایی می‌شود.',
      });
    }
    if (itemType === 'phone' && n(item.phonePurchasePrice) > 0 && n(item.phoneCurrentPurchasePrice) <= 0) {
      pushIssue(issues, {
        id: `phone-current-price-${item.orderId}-${item.id}`,
        severity: 'warning',
        area: 'profit',
        title: 'قیمت خرید روز گوشی خالی است',
        description: 'برای گوشی فروخته‌شده قیمت خرید روز ثبت نشده و گزارش ناچار است به قیمت خرید اولیه برگردد.',
        entityType: 'phone',
        entityId: item.itemId,
        actual: n(item.phonePurchasePrice),
        actionHint: 'در فرم گوشی، currentPurchasePrice را هنگام فروش یا تغییر بازار ثبت کن تا سود شرکا دقیق شود.',
      });
    }
  }

  for (const sale of installmentRows) {
    const id = n(sale.id);
    const actualSalePrice = n(sale.actualSalePrice);
    const scheduledTotal = n(sale.downPayment) + n(sale.numberOfInstallments) * n(sale.installmentAmount);
    const totalMismatch = diff(scheduledTotal, actualSalePrice);
    if (isMeaningful(totalMismatch, 5)) {
      pushIssue(issues, {
        id: `installment-total-${id}`,
        severity: 'warning',
        area: 'payments',
        title: 'اختلاف مبلغ فروش اقساط با برنامه پرداخت',
        description: 'جمع پیش‌پرداخت و اقساط با قیمت فروش واقعی برابر نیست.',
        entityType: 'installment_sale',
        entityId: id,
        expected: actualSalePrice,
        actual: scheduledTotal,
        difference: totalMismatch,
        actionHint: 'تعداد اقساط، مبلغ هر قسط یا قیمت فروش واقعی را اصلاح کن.',
      });
    }
    const collected = n(sale.downPayment) + n(sale.paidAmount);
    if (collected - actualSalePrice > 5) {
      pushIssue(issues, {
        id: `installment-overpaid-${id}`,
        severity: 'critical',
        area: 'payments',
        title: 'وصولی بیشتر از مبلغ فروش',
        description: 'مجموع پیش‌پرداخت و پرداخت‌های ثبت‌شده از مبلغ فروش بیشتر است.',
        entityType: 'installment_sale',
        entityId: id,
        expected: actualSalePrice,
        actual: collected,
        difference: diff(collected, actualSalePrice),
        actionHint: 'پرداخت‌های تکراری یا مبلغ فروش را بررسی کن.',
      });
    }
    if (n(sale.overdueUnpaidAmount) > 0) {
      pushIssue(issues, {
        id: `installment-overdue-${id}`,
        severity: 'info',
        area: 'payments',
        title: 'قسط سررسید گذشته وصول‌نشده',
        description: 'این فروش اقساطی دارای مبلغ سررسید گذشته و پرداخت‌نشده است.',
        entityType: 'installment_sale',
        entityId: id,
        actual: n(sale.overdueUnpaidAmount),
        actionHint: 'در مرکز پیگیری وصول، این مشتری را در اولویت تماس قرار بده.',
      });
    }
  }

  for (const product of inventoryRows) {
    if (n(product.stock_quantity) < 0) {
      pushIssue(issues, {
        id: `negative-stock-${product.id}`,
        severity: 'critical',
        area: 'inventory',
        title: 'موجودی منفی کالا',
        description: 'موجودی کالا منفی شده و می‌تواند گزارش ارزش موجودی و سود را مخدوش کند.',
        entityType: 'product',
        entityId: product.id,
        actual: n(product.stock_quantity),
        actionHint: 'گردش انبار، فروش‌های تکراری و اصلاح موجودی این کالا را بررسی کن.',
      });
    }
    if (n(product.stock_quantity) > 0 && n(product.purchasePrice) <= 0) {
      pushIssue(issues, {
        id: `inventory-zero-cost-${product.id}`,
        severity: 'warning',
        area: 'inventory',
        title: 'کالای موجود بدون قیمت خرید',
        description: 'این کالا موجودی مثبت دارد اما قیمت خرید آن صفر است.',
        entityType: 'product',
        entityId: product.id,
        actual: n(product.purchasePrice),
        actionHint: 'قیمت خرید را ثبت کن تا ارزش موجودی و سود واقعی درست شود.',
      });
    }
  }

  for (const phone of phoneRows) {
    const status = String(phone.status || '').trim();
    const isUnsold = ['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی'].includes(status);
    const isSold = ['فروخته شده', 'فروخته شده (قسطی)'].includes(status);
    if ((isUnsold || isSold) && n(phone.purchasePrice) > 0 && n(phone.currentPurchasePrice) <= 0) {
      pushIssue(issues, {
        id: `phone-stock-current-price-${phone.id}`,
        severity: isSold ? 'warning' : 'info',
        area: 'profit',
        title: 'قیمت خرید روز گوشی ثبت نشده',
        description: isSold ? 'این گوشی فروخته شده اما قیمت خرید روز ندارد.' : 'این گوشی در موجودی است و قیمت خرید روز ندارد.',
        entityType: 'phone',
        entityId: phone.id,
        actual: n(phone.purchasePrice),
        actionHint: 'برای محاسبه دقیق ارزش موجودی/سود شرکا قیمت خرید روز گوشی را تکمیل کن.',
      });
    }
  }

  for (const ledger of partnerLedgerRows) {
    const debit = n(ledger.debit);
    const credit = n(ledger.credit);
    if (debit > 0 && credit > 0) {
      pushIssue(issues, {
        id: `partner-ledger-double-sided-${ledger.id}`,
        severity: 'warning',
        area: 'partners',
        title: 'سند همکار دوطرفه ثبت شده',
        description: 'در یک ردیف دفتر همکار هم بدهکار و هم بستانکار مقدار دارد.',
        entityType: 'partner_ledger',
        entityId: ledger.id,
        actual: debit + credit,
        actionHint: 'برای خوانایی حساب، سند را به دو ردیف یا یک جهت بدهکار/بستانکار تبدیل کن.',
      });
    }
  }

  const counts = issues.reduce(
    (acc, issue) => {
      acc.total += 1;
      acc[issue.severity] += 1;
      acc.byArea[issue.area] = (acc.byArea[issue.area] || 0) + 1;
      return acc;
    },
    { total: 0, critical: 0, warning: 0, info: 0, byArea: {} as Record<AuditArea, number> }
  );

  const score = Math.max(0, 100 - counts.critical * 18 - counts.warning * 8 - counts.info * 3);

  return {
    score,
    counts,
    issues: issues.sort((a, b) => {
      const rank: Record<AuditSeverity, number> = { critical: 0, warning: 1, info: 2 };
      return rank[a.severity] - rank[b.severity] || String(a.area).localeCompare(String(b.area));
    }),
  };
}
