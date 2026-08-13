import { formatExactNumberText } from "../../../../utils/exactNumber";
import moment from "jalali-moment";
import { getDbInstance } from "../../core/runtimeBindings";
import { allAsync, getAsync, runAsync } from "../../query";
import { fromShamsiStringToISO } from "../../date";
import {
  buildDateRangeSql,
  mapActiveStorePartners,
  type PartnerReportRange,
} from "../../../repositories/partnerOwnershipReportBoundary.repo";
import { getLatestCustomerLedgerSourceForReport } from "../../../repositories/customerLedgerReads.repo";
import { getLatestPartnerLedgerSourceForReport } from "../../../repositories/partnerLedgerReads.repo";
import { ensureReportSavedFiltersTable } from "../reportSavedFilters.db";
import type {
  ActivityItem as FrontendActivityItem,
  DashboardKPIs as FrontendDashboardKPIs,
  DailySalesPoint,
  SalesSummaryData as FrontendSalesSummaryData,
  TopSellingItem,
  DebtorReportItem as FrontendDebtorReportItem,
  CreditorReportItem as FrontendCreditorReportItem,
  TopCustomerReportItem as FrontendTopCustomerReportItem,
  TopSupplierReportItem as FrontendTopSupplierReportItem,
  PhoneSaleProfitReportItem,
  PhoneInstallmentSaleProfitReportItem,
  ProfitabilityAnalysisItem,
  VelocityItem,
  PurchaseSuggestionItem,
} from "../../../../types";
import { SOLD_PHONE_DAILY_BUY_PRICE_SQL, PHONE_SETTLEMENT_LEDGER_TYPES_SQL, tableExists, hasStoreOwnershipCoreTables, listPartnerSettlementTransactionsFromDb } from "../partners.db";
import { normalizeShareLines, getDefaultProfitShareProfileFromDb, getProfitShareLinesByProfileId, getPartnerProfitReportFromDb, buildLegacyAccessoriesReportFromDb, buildLegacyPhonesReportFromDb, buildLegacySettlementReportFromDb } from "../profitSnapshots.db";
import { getRepairFinancialSummary } from "../repairs.db";
import { getDashboardSalesChartData } from "../dashboardReports.db";
import { safeJsonStringify, safeJsonParse, normalizeMoney } from "../../core/json";

import type {
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
  PhoneInventoryEventPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  OldMobilePhonePayload,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
  UserUpdatePayload,
  UserForDb,
  RfmItem,
  CohortRow,
  LedgerChangeHistoryEntry,
  RepairFinancialSummary,
  DashboardLayoutsPayload,
  OverallStatus,
  SavedFilterRow,
  InventoryTurnoverReport,
  DeadStockItem,
  AbcItem,
  AgingBucket,
  AgingReceivableRow,
  CashflowDay,
  CashflowReport,
  ShareInput,
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "../../core/types";

export const getDashboardKPIs = async (): Promise<FrontendDashboardKPIs> => {
  await getDbInstance();

  // تاریخ‌ها با جلالی و مقایسه‌ی ایمن در SQLite
  const todayISO = moment().format("YYYY-MM-DD");
  const firstDayOfMonthISO = moment().startOf("jMonth").format("YYYY-MM-DD");
  const lastDayOfMonthISO = moment().endOf("jMonth").format("YYYY-MM-DD");

  // فروش ماهانه: تراکنش‌های نقدی + سفارش‌ها
  // برای اطمینان از اینکه گوشی‌های مرجوعی از مبلغ کل کسر می‌شوند، تراکنش‌های مربوط به گوشی‌هایی که وضعیت‌شان
  // دیگر فروخته شده نیست را در محاسبه لحاظ نمی‌کنیم و از مبلغ فاکتورها، مجموع قیمت اقلام بازگشتی را کم می‌کنیم.
  const monthCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );
  const monthOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );

  // درآمد فروش نقدی گوشی ماه جاری: فقط فروش‌های نقدی گوشی‌ها
  // معیار: اقلام موبایل با وضعیت «فروخته شده»
  const monthCashOnly = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND st.itemType = 'phone' AND ph.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );

  const monthOrdersCash = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND soi.itemType = 'phone' AND p2.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );

  // درآمد فروش اقساطی ماه جاری (جدول installment_sales)
  const monthInstallmentSales = await getAsync(
    `SELECT COALESCE(SUM(actualSalePrice),0) AS total
       FROM installment_sales
      WHERE COALESCE(status,'active') = 'active'
        AND date(COALESCE(saleDateISO, dateCreated)) BETWEEN date(?) AND date(?)`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );

  // درآمد فروش اقساطی از مسیر «sales_orders» (برای فروش‌های اقساطیِ لوازم/خدمات یا فروش‌های غیر-گوشی)
  // معیار: paymentMethod='installment'
  // و برای اقلام موبایل فقط اگر وضعیت «فروخته شده (قسطی)» باشد.
  const monthOrdersInstallment = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND so.paymentMethod = 'installment'
        AND (soi.itemType <> 'phone' OR p2.status = 'فروخته شده (قسطی)')`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );

  // فروش امروز: تراکنش‌های نقدی + سفارش‌ها با لحاظ کردن بازگشتی‌ها
  const todayCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate)=date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [todayISO],
  );
  const todayOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate)=date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [todayISO],
  );

  const monthLegacyInvoices = await getAsync(
    `SELECT COALESCE(SUM(i.grandTotal),0) AS total
       FROM invoices i
      WHERE date(i.date) BETWEEN date(?) AND date(?)
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = i.id)`,
    [firstDayOfMonthISO, lastDayOfMonthISO],
  );
  const todayLegacyInvoices = await getAsync(
    `SELECT COALESCE(SUM(i.grandTotal),0) AS total
       FROM invoices i
      WHERE date(i.date)=date(?)
        AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = i.id)`,
    [todayISO],
  );

  // شمارش‌ها
  const activeProductsCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM products WHERE stock_quantity > 0",
  );
  const activePhonesCountRes = await getAsync(
    // در شمارش گوشی‌های فعال (قابل فروش) وضعیت‌های موجود در انبار و مرجوعی (اقساطی یا نقدی) را لحاظ می‌کنیم
    "SELECT COALESCE(COUNT(id),0) AS count FROM phones WHERE status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی')",
  );
  const totalCustomersCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM customers",
  );

  // تعمیرات ماه جاری (فروش / هزینه / سود)
  const repairSummaryMonth = await getRepairFinancialSummary(
    firstDayOfMonthISO,
    lastDayOfMonthISO,
  );

  // مجموع کل تاریخ (نقد + اقساط + سفارش‌ها)
  const totalCashSalesRes = await getAsync(
    "SELECT COALESCE(SUM(totalPrice),0) AS total FROM sales_transactions",
  );
  const totalInstallmentSalesRes = await getAsync(
    "SELECT COALESCE(SUM(actualSalePrice),0) AS total FROM installment_sales WHERE COALESCE(status,'active') = 'active'",
  );
  const totalOrdersRes = await getAsync(
    "SELECT COALESCE(SUM(grandTotal),0) AS total FROM sales_orders WHERE (status IS NULL OR status = 'active')",
  );
  const totalSalesAllTime =
    (totalCashSalesRes?.total || 0) +
    (totalInstallmentSalesRes?.total || 0) +
    (totalOrdersRes?.total || 0);

  return {
    totalSalesMonth:
      (monthCash?.total || 0) +
      (monthOrders?.total || 0) +
      (monthLegacyInvoices?.total || 0),
    revenueToday:
      (todayCash?.total || 0) +
      (todayOrders?.total || 0) +
      (todayLegacyInvoices?.total || 0),

    // KPIهای اختصاصی داشبورد
    phoneSalesRevenueMonth:
      (monthCashOnly?.total || 0) + (monthOrdersCash?.total || 0),
    installmentSalesRevenueMonth:
      (monthInstallmentSales?.total || 0) +
      (monthOrdersInstallment?.total || 0),
    repairRevenueMonth: repairSummaryMonth.revenue,
    repairCostsMonth: repairSummaryMonth.costs,
    repairProfitMonth: repairSummaryMonth.profit,
    repairCountMonth: repairSummaryMonth.count,

    activeProductsCount:
      (activeProductsCountRes?.count || 0) + (activePhonesCountRes?.count || 0),
    totalCustomersCount: totalCustomersCountRes?.count || 0,
    totalSalesAllTime,
  };
};

export const getDashboardRecentActivities = async (): Promise<
  FrontendActivityItem[]
> => {
  await getDbInstance();
  const sales = await allAsync(
    `SELECT st.id, st.itemName, st.totalPrice, st.transactionDate, c.fullName as customerName 
         FROM sales_transactions st 
         LEFT JOIN customers c ON st.customerId = c.id
         ORDER BY st.id DESC LIMIT 3`,
  );
  const newProducts = await allAsync(
    "SELECT id, name, date_added FROM products ORDER BY id DESC LIMIT 2",
  );
  const newPhones = await allAsync(
    "SELECT id, model, registerDate FROM phones ORDER BY id DESC LIMIT 2",
  );

  const activities: FrontendActivityItem[] = [];
  sales.forEach((s) =>
    activities.push({
      id: `sale-${s.id}`,
      typeDescription: "فروش جدید",
      details: `${s.itemName} به ${s.customerName || "مهمان"} به ارزش ${formatExactNumberText(s.totalPrice)} تومان`,
      timestamp: moment(s.transactionDate).toISOString(),
      icon: "fa-solid fa-cash-register",
      color: "bg-green-500",
      link: `/invoices/${s.id}`,
    }),
  );
  newProducts.forEach((p) =>
    activities.push({
      id: `product-${p.id}`,
      typeDescription: "محصول جدید",
      details: `${p.name} اضافه شد`,
      timestamp: p.date_added,
      icon: "fa-solid fa-box",
      color: "bg-blue-500",
      link: `/products`,
    }),
  );
  newPhones.forEach((ph) =>
    activities.push({
      id: `phone-${ph.id}`,
      typeDescription: "گوشی جدید",
      details: `${ph.model} اضافه شد`,
      timestamp: ph.registerDate,
      icon: "fa-solid fa-mobile-screen",
      color: "bg-purple-500",
      link: `/mobile-phones`,
    }),
  );

  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 5);
};

export const getUserDashboardLayoutFromDb = async (
  userId: number,
): Promise<DashboardLayoutsPayload | null> => {
  await getDbInstance();
  const row = (await getAsync(
    "SELECT layoutJson FROM user_dashboard_layouts WHERE userId = ?",
    [userId],
  )) as { layoutJson?: string } | null;

  if (!row?.layoutJson) return null;

  try {
    return JSON.parse(row.layoutJson);
  } catch {
    return null;
  }
};

export const upsertUserDashboardLayoutInDb = async (
  userId: number,
  layouts: DashboardLayoutsPayload,
): Promise<void> => {
  await getDbInstance();
  const layoutJson = JSON.stringify(layouts ?? {});
  // Basic safety limit to avoid storing huge payloads
  if (layoutJson.length > 200_000)
    throw new Error("Layout payload is too large.");

  await runAsync(
    `INSERT INTO user_dashboard_layouts (userId, layoutJson, updatedAt)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
     ON CONFLICT(userId) DO UPDATE SET
       layoutJson = excluded.layoutJson,
       updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`,
    [userId, layoutJson],
  );
};

export const deleteUserDashboardLayoutFromDb = async (
  userId: number,
): Promise<void> => {
  await getDbInstance();
  await runAsync("DELETE FROM user_dashboard_layouts WHERE userId = ?", [
    userId,
  ]);
};
