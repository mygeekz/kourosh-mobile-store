import { getAsync } from "../../database";
import type { SqliteBindParams } from "../../db/query";
import type {
  ModelReadinessItem,
  ModelReadinessSignal,
  ModelReadinessStatus,
  ModelReadinessSummary,
  ReadinessSignalStatus,
} from "./readinessTypes";

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeGet = async (sql: string, params: SqliteBindParams = []): Promise<Record<string, unknown>> => {
  return getAsync(sql, params).catch(() => ({}));
};

const signal = (
  name: string,
  value: number | string | null,
  status: ReadinessSignalStatus,
  message: string,
): ModelReadinessSignal => ({ name, value, status, message });

const signalScore = (status: ReadinessSignalStatus): number => {
  if (status === "good") return 100;
  if (status === "weak") return 50;
  return 0;
};

const scoreSignals = (signals: ModelReadinessSignal[]): number => {
  if (!signals.length) return 0;
  return Math.round(signals.reduce((sum, item) => sum + signalScore(item.status), 0) / signals.length);
};

const statusFromScore = (score: number): ModelReadinessStatus => {
  if (score >= 80) return "ready";
  if (score >= 60) return "almost_ready";
  if (score >= 30) return "needs_data";
  return "not_ready";
};

const buildItem = (
  key: string,
  label: string,
  signals: ModelReadinessSignal[],
  recommendedNextAction: string,
): ModelReadinessItem => {
  const readinessPct = scoreSignals(signals);
  const blockers = signals
    .filter((item) => item.status !== "good")
    .map((item) => item.message);
  return {
    key,
    label,
    readinessPct,
    status: statusFromScore(readinessPct),
    dataSignals: signals,
    blockers,
    recommendedNextAction,
  };
};

const availabilityStatus = (
  value: number,
  goodAt: number,
  weakAt = 1,
): ReadinessSignalStatus => {
  if (value >= goodAt) return "good";
  if (value >= weakAt) return "weak";
  return "missing";
};

export const buildModelReadinessSummary = async (): Promise<ModelReadinessSummary> => {
  const sales = await safeGet(`
    SELECT COUNT(*) AS salesOrders,
           COUNT(DISTINCT substr(transactionDate, 1, 10)) AS salesDays,
           COALESCE(julianday(MAX(substr(transactionDate, 1, 10))) - julianday(MIN(substr(transactionDate, 1, 10))) + 1, 0) AS salesSpanDays,
           SUM(CASE WHEN COALESCE(discount, 0) > 0 THEN 1 ELSE 0 END) AS discountedOrders
    FROM sales_orders
    WHERE COALESCE(status, 'active') = 'active'
  `);
  const salesItems = await safeGet(`SELECT COUNT(*) AS orderItems FROM sales_order_items`);
  const returns = await safeGet(`SELECT COUNT(*) AS returnRows FROM sales_returns`);
  const inventory = await safeGet(`
    SELECT COUNT(*) AS products,
           SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 THEN 1 ELSE 0 END) AS productsWithStock,
           SUM(CASE WHEN COALESCE(threshold, 0) > 0 THEN 1 ELSE 0 END) AS productsWithThreshold
    FROM products
  `);
  const inventoryEvents = await safeGet(`SELECT COUNT(*) AS inventoryEvents FROM inventory_ledger`);
  const inventorySales = await safeGet(`
    SELECT COUNT(*) AS inventoryOrderItems,
           COUNT(DISTINCT soi.itemId) AS productsWithSalesHistory
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.orderId
    WHERE soi.itemType = 'inventory'
      AND substr(so.transactionDate, 1, 10) >= date('now', '-30 day')
      AND COALESCE(so.status, 'active') = 'active'
  `);
  const customers = await safeGet(`SELECT COUNT(*) AS customers FROM customers`);
  const customerLedger = await safeGet(`SELECT COUNT(*) AS customerLedgerEntries, COUNT(DISTINCT customerId) AS customersWithLedger FROM customer_ledger`);
  const installments = await safeGet(`
    SELECT COUNT(*) AS installmentSales,
           COALESCE(julianday(MAX(REPLACE(dueDate, '/', '-'))) - julianday(MIN(REPLACE(dueDate, '/', '-'))) + 1, 0) AS paymentSpanDays,
           SUM(CASE WHEN COALESCE(status, 'پرداخت نشده') <> 'پرداخت شده' AND REPLACE(dueDate, '/', '-') < date('now') THEN 1 ELSE 0 END) AS overdueRows,
           SUM(CASE WHEN COALESCE(status, 'پرداخت نشده') = 'پرداخت شده' THEN 1 ELSE 0 END) AS paidRows
    FROM installment_payments
  `);
  const installmentSales = await safeGet(`SELECT COUNT(*) AS installmentSalesRows FROM installment_sales`);
  const repairs = await safeGet(`
    SELECT COUNT(*) AS repairs,
           SUM(CASE WHEN dateCompleted IS NOT NULL OR LOWER(COALESCE(status, '')) LIKE '%complete%' OR status LIKE '%تکمیل%' THEN 1 ELSE 0 END) AS completedRepairs,
           COUNT(DISTINCT status) AS repairStatuses,
           COALESCE(julianday(MAX(substr(dateReceived, 1, 10))) - julianday(MIN(substr(dateReceived, 1, 10))) + 1, 0) AS repairSpanDays
    FROM repairs
  `);
  const repairParts = await safeGet(`SELECT COUNT(*) AS repairParts FROM repair_parts`);
  const pricing = await safeGet(`
    SELECT COUNT(*) AS products,
           SUM(CASE WHEN COALESCE(purchasePrice, 0) > 0 THEN 1 ELSE 0 END) AS productsWithCost,
           SUM(CASE WHEN COALESCE(sellingPrice, 0) > 0 THEN 1 ELSE 0 END) AS productsWithPrice
    FROM products
  `);
  const marginHistory = await safeGet(`
    SELECT COUNT(*) AS marginRows,
           SUM(CASE WHEN COALESCE(discountPerItem, 0) > 0 THEN 1 ELSE 0 END) AS discountRows
    FROM sales_order_items
    WHERE COALESCE(buyPrice, 0) > 0 AND COALESCE(unitPrice, 0) > 0
  `);

  const items: ModelReadinessItem[] = [
    buildItem("sales_forecast_model", "Sales Forecast Model", [
      signal("sales_orders", num(sales.salesOrders), availabilityStatus(num(sales.salesOrders), 100, 10), "حداقل ۱۰۰ فاکتور فروش برای مدل فروش قابل اتکاتر نیاز است."),
      signal("sales_days", num(sales.salesDays), availabilityStatus(num(sales.salesDays), 45, 7), "روزهای دارای فروش باید بیشتر شود."),
      signal("sales_date_span", Math.round(num(sales.salesSpanDays)), availabilityStatus(num(sales.salesSpanDays), 60, 14), "بازه تاریخی فروش برای یادگیری فصل/روند کافی نیست."),
      signal("order_items", num(salesItems.orderItems), availabilityStatus(num(salesItems.orderItems), 150, 20), "آیتم‌های فاکتور فروش برای تحلیل سبد کافی نیست."),
      signal("discount_history", num(sales.discountedOrders), availabilityStatus(num(sales.discountedOrders), 20, 1), "داده تخفیف برای سنجش فشار تخفیف کم است."),
      signal("returns", num(returns.returnRows), availabilityStatus(num(returns.returnRows), 5, 1), "داده مرجوعی برای اصلاح کیفیت فروش کم است."),
    ], "ادامه ثبت فاکتورهای فروش، آیتم‌ها، تخفیف و مرجوعی قبل از ساخت dataset ML."),
    buildItem("inventory_stockout_model", "Inventory Stockout Model", [
      signal("products", num(inventory.products), availabilityStatus(num(inventory.products), 50, 5), "تعداد کالاها برای مدل ریسک اتمام موجودی کم است."),
      signal("products_with_stock", num(inventory.productsWithStock), availabilityStatus(num(inventory.productsWithStock), 40, 5), "موجودی اولیه کالاها کامل نیست."),
      signal("inventory_events", num(inventoryEvents.inventoryEvents), availabilityStatus(num(inventoryEvents.inventoryEvents), 100, 10), "گردش انبار/لجر موجودی برای مدل کافی نیست."),
      signal("inventory_sales_items", num(inventorySales.inventoryOrderItems), availabilityStatus(num(inventorySales.inventoryOrderItems), 100, 10), "فروش آیتم‌های انباری برای محاسبه نرخ مصرف کم است."),
      signal("products_with_30d_sales", num(inventorySales.productsWithSalesHistory), availabilityStatus(num(inventorySales.productsWithSalesHistory), 20, 3), "کالاهای دارای سابقه فروش ۳۰ روزه کم هستند."),
      signal("reorder_threshold", num(inventory.productsWithThreshold), availabilityStatus(num(inventory.productsWithThreshold), 30, 3), "حداقل موجودی/threshold برای کالاها کامل نیست."),
    ], "ثبت منظم ورود/خروج انبار و تکمیل threshold کالاها."),
    buildItem("customer_debt_risk_model", "Customer Debt Risk Model", [
      signal("customers", num(customers.customers), availabilityStatus(num(customers.customers), 100, 10), "تعداد مشتریان برای مدل بدهی مشتری کم است."),
      signal("customers_with_ledger", num(customerLedger.customersWithLedger), availabilityStatus(num(customerLedger.customersWithLedger), 50, 5), "مشتریان دارای سابقه دفتر حساب کم هستند."),
      signal("installment_sales", num(installmentSales.installmentSalesRows), availabilityStatus(num(installmentSales.installmentSalesRows), 30, 3), "فروش اقساطی ثبت‌شده برای مدل ریسک بدهی کم است."),
      signal("late_payments", num(installments.overdueRows), availabilityStatus(num(installments.overdueRows), 15, 1), "سابقه دیرکرد برای تفکیک ریسک مشتری کم است."),
      signal("payment_history_span", Math.round(num(installments.paymentSpanDays)), availabilityStatus(num(installments.paymentSpanDays), 60, 14), "بازه تاریخی پرداخت اقساط کوتاه است."),
      signal("overdue_history", num(installments.paidRows) + num(installments.overdueRows), availabilityStatus(num(installments.paidRows) + num(installments.overdueRows), 50, 5), "تاریخچه پرداخت/معوق برای برچسب‌گذاری کافی نیست."),
    ], "ادامه ثبت پرداخت‌ها، پیگیری‌ها و دفتر حساب مشتریان."),
    buildItem("collection_pressure_model", "Collection Pressure Model", [
      signal("installment_payments", num(installments.paidRows) + num(installments.overdueRows), availabilityStatus(num(installments.paidRows) + num(installments.overdueRows), 80, 10), "تعداد ردیف پرداخت اقساط برای پیش‌بینی فشار وصول کم است."),
      signal("overdue_rows", num(installments.overdueRows), availabilityStatus(num(installments.overdueRows), 15, 1), "نمونه معوق برای یادگیری فشار وصول کم است."),
      signal("paid_rows", num(installments.paidRows), availabilityStatus(num(installments.paidRows), 30, 3), "نمونه پرداخت‌شده برای مقایسه رفتار وصول کم است."),
      signal("payment_span_days", Math.round(num(installments.paymentSpanDays)), availabilityStatus(num(installments.paymentSpanDays), 60, 14), "بازه تاریخی پرداخت برای فشار وصول کافی نیست."),
    ], "ثبت دقیق تاریخ سررسید، پرداخت و وضعیت هر قسط."),
    buildItem("repair_demand_model", "Repair Demand Model", [
      signal("repairs", num(repairs.repairs), availabilityStatus(num(repairs.repairs), 80, 10), "تعداد تعمیرات ثبت‌شده برای مدل تقاضای تعمیر کم است."),
      signal("completed_repairs", num(repairs.completedRepairs), availabilityStatus(num(repairs.completedRepairs), 40, 5), "تعمیرات تکمیل‌شده برای برچسب خروجی کم است."),
      signal("repair_parts", num(repairParts.repairParts), availabilityStatus(num(repairParts.repairParts), 30, 3), "مصرف قطعات تعمیر برای تحلیل تقاضا کم است."),
      signal("repair_span_days", Math.round(num(repairs.repairSpanDays)), availabilityStatus(num(repairs.repairSpanDays), 60, 14), "بازه تاریخی تعمیرات کوتاه است."),
      signal("status_coverage", num(repairs.repairStatuses), availabilityStatus(num(repairs.repairStatuses), 3, 1), "تنوع وضعیت‌های تعمیر برای مدل کافی نیست."),
    ], "ثبت وضعیت استاندارد تعمیر، تاریخ تکمیل و قطعات مصرفی."),
    buildItem("pricing_recommendation_model", "Pricing Recommendation Model", [
      signal("products_with_purchase_cost", num(pricing.productsWithCost), availabilityStatus(num(pricing.productsWithCost), 40, 5), "قیمت خرید کالاها کامل نیست."),
      signal("products_with_sale_price", num(pricing.productsWithPrice), availabilityStatus(num(pricing.productsWithPrice), 40, 5), "قیمت فروش کالاها کامل نیست."),
      signal("margin_history", num(marginHistory.marginRows), availabilityStatus(num(marginHistory.marginRows), 100, 10), "سابقه حاشیه سود برای پیشنهاد قیمت کم است."),
      signal("sales_volume", num(salesItems.orderItems), availabilityStatus(num(salesItems.orderItems), 150, 20), "حجم فروش برای تخمین واکنش قیمت کم است."),
      signal("discount_history", num(marginHistory.discountRows), availabilityStatus(num(marginHistory.discountRows), 20, 1), "سابقه تخفیف برای تحلیل حساسیت قیمت کم است."),
      signal("return_data", num(returns.returnRows), availabilityStatus(num(returns.returnRows), 5, 1), "داده مرجوعی برای کنترل کیفیت قیمت‌گذاری کم است."),
    ], "تکمیل قیمت خرید/فروش، buyPrice آیتم‌های فروش، تخفیف و مرجوعی."),
  ];

  const sorted = [...items].sort((a, b) => b.readinessPct - a.readinessPct);

  return {
    generatedAt: new Date().toISOString(),
    items,
    bestReadyModel: sorted[0] || null,
    weakestModel: sorted[sorted.length - 1] || null,
  };
};
