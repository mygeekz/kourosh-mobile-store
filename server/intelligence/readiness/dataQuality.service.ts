import { getAsync } from "../../database";
import type { SqliteBindParams } from "../../db/query";
import type { DataQualityCheck, DataQualitySummary } from "./readinessTypes";

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeGet = async (sql: string, params: SqliteBindParams = []): Promise<Record<string, unknown>> => {
  return getAsync(sql, params).catch(() => ({}));
};

const checkScore = (status: DataQualityCheck["status"]): number => {
  if (status === "pass") return 100;
  if (status === "warning") return 55;
  return 0;
};

export const buildDataQualitySummary = async (): Promise<DataQualitySummary> => {
  const sales = await safeGet(`
    SELECT COUNT(*) AS orders,
           COUNT(DISTINCT substr(transactionDate, 1, 10)) AS salesDays
    FROM sales_orders
    WHERE COALESCE(status, 'active') = 'active'
  `);
  const inventoryHistory = await safeGet(`SELECT COUNT(*) AS inventoryEvents FROM inventory_ledger`);
  const customerPayments = await safeGet(`SELECT COUNT(*) AS paymentRows FROM installment_payments`);
  const repairs = await safeGet(`SELECT COUNT(*) AS repairRows FROM repairs`);
  const missingProductCosts = await safeGet(`SELECT COUNT(*) AS missingCosts FROM products WHERE COALESCE(purchasePrice, 0) <= 0`);
  const missingProductPrices = await safeGet(`SELECT COUNT(*) AS missingPrices FROM products WHERE COALESCE(sellingPrice, 0) <= 0`);
  const negativeStockRows = await safeGet(`SELECT COUNT(*) AS negativeRows FROM products WHERE COALESCE(stock_quantity, 0) < 0`);
  const invalidSalesDates = await safeGet(`
    SELECT COUNT(*) AS invalidRows
    FROM sales_orders
    WHERE transactionDate IS NULL
       OR TRIM(transactionDate) = ''
       OR date(substr(transactionDate, 1, 10)) IS NULL
  `);
  const invalidInstallmentDates = await safeGet(`
    SELECT COUNT(*) AS invalidRows
    FROM installment_payments
    WHERE dueDate IS NULL OR TRIM(dueDate) = ''
  `);
  const orphanOrderItems = await safeGet(`
    SELECT COUNT(*) AS orphanRows
    FROM sales_order_items soi
    LEFT JOIN sales_orders so ON so.id = soi.orderId
    WHERE so.id IS NULL
  `);

  const checks: DataQualityCheck[] = [
    {
      key: "sales_history_available",
      label: "Sales History Available",
      status: num(sales.orders) >= 30 && num(sales.salesDays) >= 7 ? "pass" : num(sales.orders) > 0 ? "warning" : "fail",
      value: `${num(sales.orders)} orders / ${num(sales.salesDays)} days`,
      message: num(sales.orders) > 0 ? "سابقه فروش برای baseline موجود است." : "هیچ سابقه فروشی برای ارزیابی پیش‌بینی وجود ندارد.",
    },
    {
      key: "inventory_history_available",
      label: "Inventory History Available",
      status: num(inventoryHistory.inventoryEvents) >= 20 ? "pass" : num(inventoryHistory.inventoryEvents) > 0 ? "warning" : "fail",
      value: num(inventoryHistory.inventoryEvents),
      message: "گردش انبار برای تحلیل ریسک اتمام موجودی بررسی شد.",
    },
    {
      key: "customer_payment_history_available",
      label: "Customer Payment History Available",
      status: num(customerPayments.paymentRows) >= 20 ? "pass" : num(customerPayments.paymentRows) > 0 ? "warning" : "fail",
      value: num(customerPayments.paymentRows),
      message: "تاریخچه پرداخت اقساط برای تحلیل فشار وصول بررسی شد.",
    },
    {
      key: "repair_history_available",
      label: "Repair History Available",
      status: num(repairs.repairRows) >= 20 ? "pass" : num(repairs.repairRows) > 0 ? "warning" : "fail",
      value: num(repairs.repairRows),
      message: "سابقه تعمیرات برای readiness مدل تقاضای تعمیر بررسی شد.",
    },
    {
      key: "missing_product_costs",
      label: "Missing Product Costs",
      status: num(missingProductCosts.missingCosts) === 0 ? "pass" : num(missingProductCosts.missingCosts) <= 5 ? "warning" : "fail",
      value: num(missingProductCosts.missingCosts),
      message: "کالاهای بدون قیمت خرید می‌توانند کیفیت قیمت‌گذاری و سود را پایین بیاورند.",
    },
    {
      key: "missing_product_prices",
      label: "Missing Product Prices",
      status: num(missingProductPrices.missingPrices) === 0 ? "pass" : num(missingProductPrices.missingPrices) <= 5 ? "warning" : "fail",
      value: num(missingProductPrices.missingPrices),
      message: "کالاهای بدون قیمت فروش برای مدل قیمت‌گذاری ناقص هستند.",
    },
    {
      key: "negative_stock_rows",
      label: "Negative Stock Rows",
      status: num(negativeStockRows.negativeRows) === 0 ? "pass" : "fail",
      value: num(negativeStockRows.negativeRows),
      message: "موجودی منفی باید قبل از dataset ML اصلاح یا توضیح داده شود.",
    },
    {
      key: "invalid_dates",
      label: "Invalid Dates",
      status: num(invalidSalesDates.invalidRows) + num(invalidInstallmentDates.invalidRows) === 0 ? "pass" : "fail",
      value: num(invalidSalesDates.invalidRows) + num(invalidInstallmentDates.invalidRows),
      message: "تاریخ‌های نامعتبر روی horizon و evaluation اثر مستقیم دارند.",
    },
    {
      key: "orphan_order_items",
      label: "Orphan Order Items",
      status: num(orphanOrderItems.orphanRows) === 0 ? "pass" : "fail",
      value: num(orphanOrderItems.orphanRows),
      message: "آیتم فروش بدون فاکتور مادر نباید در dataset آموزشی باقی بماند.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    overallScore: Math.round(checks.reduce((sum, item) => sum + checkScore(item.status), 0) / Math.max(1, checks.length)),
    checks,
  };
};
