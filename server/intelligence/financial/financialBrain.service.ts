import { formatExactNumberText, formatReadablePercentText } from "../../../utils/exactNumber";
import { getAsync } from "../../database";
import type { FinancialBrainAction, FinancialBrainQuery, FinancialBrainSignal } from "./financialTypes";
import {
  FINANCIAL_REPORT_CURRENCY_CONTRACT,
  financialBrainNum,
  formatFinancialBrainMoneyText,
  resolveFinancialBrainDateRange,
} from "./financialUtils";

export class FinancialBrainRangeError extends Error {
  constructor() {
    super("بازه زمانی Financial Brain نامعتبر است.");
    this.name = "FinancialBrainRangeError";
  }
}

export const buildFinancialBrainData = async (query: FinancialBrainQuery) => {
  const { fromJ, toJ, start, end, isValid } = resolveFinancialBrainDateRange(query);
  if (!isValid || !start || !end) {
    throw new FinancialBrainRangeError();
  }

  const n = financialBrainNum;

  const sales = await getAsync(
    `
      SELECT COUNT(*) AS ordersCount,
             COALESCE(SUM(grandTotal), 0) AS totalSales,
             COALESCE(SUM(discount), 0) AS invoiceDiscount,
             COALESCE(AVG(grandTotal), 0) AS avgTicket
      FROM sales_orders
      WHERE date(substr(transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
        AND COALESCE(status, 'active') = 'active'
    `,
    [start, end],
  ).catch(() => ({}) as any);

  const profit = await getAsync(
    `
      SELECT COALESCE(SUM(COALESCE(soi.totalPrice, 0)), 0) AS lineRevenue,
             COALESCE(SUM(
               COALESCE(soi.totalPrice, 0)
               - (
                 CASE
                   WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0)
                   WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0)
                   ELSE COALESCE(soi.buyPrice, 0)
                 END
               ) * COALESCE(soi.quantity, 1)
               - COALESCE(soi.discountPerItem, 0)
             ), 0) AS grossProfit,
             COALESCE(SUM(CASE
               WHEN soi.itemType = 'phone' AND COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) = 0 THEN 1
               WHEN soi.itemType = 'inventory' AND COALESCE(NULLIF(soi.buyPrice, 0), NULLIF(p.purchasePrice, 0), 0) = 0 THEN 1
               ELSE 0
             END), 0) AS missingCostRows
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      LEFT JOIN products p ON soi.itemType = 'inventory' AND p.id = soi.itemId
      LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
      WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
        AND COALESCE(so.status, 'active') = 'active'
    `,
    [start, end],
  ).catch(() => ({}) as any);

  const collections = await getAsync(`
      SELECT COALESCE(SUM(COALESCE(remainingAmount, 0)), 0) AS openCredit,
             COALESCE(SUM(CASE WHEN dueDate IS NOT NULL AND date(substr(dueDate, 1, 10)) < date('now') THEN COALESCE(remainingAmount, 0) ELSE 0 END), 0) AS overdueAmount,
             COALESCE(SUM(CASE WHEN dueDate IS NOT NULL AND date(substr(dueDate, 1, 10)) < date('now') THEN 1 ELSE 0 END), 0) AS overdueCount
      FROM installment_sales
      WHERE COALESCE(status, 'active') = 'active'
    `).catch(() => ({}) as any);

  const stock = await getAsync(`
      SELECT COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) <= COALESCE(threshold, 5) THEN 1 ELSE 0 END), 0) AS lowStockCount,
             COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) < 0 THEN 1 ELSE 0 END), 0) AS negativeStockCount
      FROM products
    `).catch(() => ({}) as any);

  const revenue = n(sales?.totalSales);
  const grossProfit = n(profit?.grossProfit);
  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const missingCosts = n(profit?.missingCostRows);
  const overdueAmount = n(collections?.overdueAmount);
  const lowStockCount = n(stock?.lowStockCount);
  const negativeStockCount = n(stock?.negativeStockCount);
  const risks: FinancialBrainSignal[] = [];
  const opportunities: FinancialBrainSignal[] = [];
  const actions: FinancialBrainAction[] = [];

  if (missingCosts > 0)
    risks.push({
      id: "missing-cost",
      severity: "high",
      title: "بهای تمام‌شده ناقص",
      summary: `${formatExactNumberText(missingCosts)} ردیف فروش قیمت خرید/قیمت خرید روز کامل ندارد.`,
      to: "/reports/financial-audit",
    });
  if (marginPct > 0 && marginPct < 12)
    risks.push({
      id: "low-margin",
      severity: "medium",
      title: "حاشیه سود پایین",
      summary: `حاشیه سود بازه حدود ${formatReadablePercentText(marginPct, 1)} است.`,
      to: "/reports/product-profit-real",
    });
  if (overdueAmount > 0)
    risks.push({
      id: "collection-pressure",
      severity: "high",
      title: "فشار وصول",
      summary: `وصول معوق حدود ${formatFinancialBrainMoneyText(overdueAmount)} است.`,
      to: "/reports/aging-receivables",
    });
  if (lowStockCount > 0 || negativeStockCount > 0)
    risks.push({
      id: "stock-risk",
      severity: negativeStockCount > 0 ? "critical" : "medium",
      title: "ریسک موجودی",
      summary: `${formatExactNumberText(lowStockCount)} کالا کم‌موجودی و ${formatExactNumberText(negativeStockCount)} کالا موجودی منفی دارد.`,
      to: "/reports/analysis/inventory",
    });

  if (revenue > 0 && n(sales?.ordersCount) > 0)
    opportunities.push({
      id: "ticket-growth",
      title: "افزایش میانگین فاکتور",
      summary: `میانگین فاکتور فعلی ${formatFinancialBrainMoneyText(n(sales?.avgTicket))} است؛ گزارش اقلام پرفروش را برای باندل بررسی کن.`,
      to: "/reports/product-sales",
    });
  if (marginPct >= 18)
    opportunities.push({
      id: "healthy-margin",
      title: "حاشیه سود قابل اتکا",
      summary: "سود بازه برای توسعه فروش کالاهای مشابه مناسب است.",
      to: "/reports/product-profit-real",
    });

  actions.push(
    ...risks.slice(0, 3).map((r) => ({
      id: "fix-" + r.id,
      title: r.title,
      summary: r.summary,
      actionLabel: "بررسی",
      to: r.to,
      severity: r.severity || "medium",
    })),
  );
  if (!actions.length)
    actions.push({
      id: "grow-profit",
      title: "تمرکز روی رشد سود",
      summary:
        "ریسک بحرانی دیده نشد؛ گزارش سود واقعی و اقلام پرفروش را برای رشد حاشیه بررسی کن.",
      actionLabel: "مشاهده سود واقعی",
      to: "/reports/product-profit-real",
      severity: "positive",
    });

  const riskPenalty = risks.reduce(
    (sum, r) =>
      sum +
      (r.severity === "critical" ? 18 : r.severity === "high" ? 13 : 8),
    0,
  );
  const dataPenalty = missingCosts > 0 ? Math.min(18, missingCosts * 3) : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      86 + Math.min(10, marginPct / 3) - riskPenalty - dataPenalty,
    ),
  );
  const confidence = Math.max(
    55,
    Math.min(
      98,
      96 - dataPenalty - Math.min(18, risks.length * 4),
    ),
  );

  return {
    range: { from: fromJ, to: toJ, fromISO: start, toISO: end },
    currencyBase: FINANCIAL_REPORT_CURRENCY_CONTRACT.currencyBase,
    displayCurrency: FINANCIAL_REPORT_CURRENCY_CONTRACT.displayCurrency,
    moneyDivisor: FINANCIAL_REPORT_CURRENCY_CONTRACT.moneyDivisor,
    summary: {
      totalSales: revenue,
      ordersCount: n(sales?.ordersCount),
      avgTicket: n(sales?.avgTicket),
      grossProfit,
      marginPct,
      invoiceDiscount: n(sales?.invoiceDiscount),
      openCredit: n(collections?.openCredit),
      overdueAmount,
      lowStockCount,
      negativeStockCount,
      missingCostRows: missingCosts,
    },
    executiveBrain: {
      score,
      status:
        score >= 85
          ? "excellent"
          : score >= 70
            ? "healthy"
            : score >= 52
              ? "watch"
              : "risk",
      statusLabel:
        score >= 85
          ? "عالی و قابل اتکا"
          : score >= 70
            ? "سالم"
            : score >= 52
              ? "نیازمند پایش"
              : "پرریسک",
      confidence,
      command: actions[0]?.title || "وضعیت مالی پایدار است",
      narrative:
        actions[0]?.summary || "داده‌ها برای تصمیم مدیریتی آماده است.",
      nextBestActions: actions,
    },
    risks,
    opportunities,
    actions,
    confidence,
  };
};
