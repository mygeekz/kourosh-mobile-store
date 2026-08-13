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

export const getSalesSummaryAndProfit = async (
  fromDateShamsi: string,
  toDateShamsi: string,
): Promise<FrontendSalesSummaryData> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error("فرمت تاریخ نامعتبر است.");

  // NOTE: سیستم فروش از P0 به بعد «فاکتور» (sales_orders) را به‌عنوان منبع اصلی فروش دارد.
  // برای سازگاری با داده‌های قدیمی، هنوز sales_transactions را هم در گزارش‌ها لحاظ می‌کنیم.

  // 1) درآمد (فاکتورهای جدید + تراکنش‌های قدیمی)
  const ordersAgg = await getAsync(
    `SELECT
        COALESCE(SUM(grandTotal), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as ordersCount
     FROM sales_orders
     WHERE date(transactionDate) BETWEEN date(?) AND date(?)
       AND (status IS NULL OR status = 'active')`,
    [fromDateISO, toDateISO],
  );

  const legacyAgg = await getAsync(
    `SELECT
        COALESCE(SUM(totalPrice), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as txCount
     FROM sales_transactions
     WHERE date(transactionDate) BETWEEN date(?) AND date(?)`,
    [fromDateISO, toDateISO],
  );

  const totalRevenue =
    Number(ordersAgg?.totalRevenue || 0) + Number(legacyAgg?.totalRevenue || 0);
  const totalTransactions =
    Number(ordersAgg?.ordersCount || 0) + Number(legacyAgg?.txCount || 0);

  // 2) COGS (فاکتورهای جدید + تراکنش‌های قدیمی)
  // حساس: برای گوشی فروخته‌شده، قیمت خرید روز/جایگزینی باید مبنای سود باشد؛ نه قیمت ثبت اولیه.
  // برای کالا نیز اگر ردیف فروش buyPrice ذخیره کرده باشد، همان قیمت لحظه فروش معتبرتر از قیمت فعلی کارت کالا است.
  const ordersCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0) * COALESCE(soi.quantity, 0)
          WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(soi.quantity, 0)
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_order_items soi
     JOIN sales_orders so ON so.id = soi.orderId
     LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
     LEFT JOIN phones   ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
     WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
       AND (so.status IS NULL OR so.status = 'active')`,
    [fromDateISO, toDateISO],
  );

  const legacyCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * COALESCE(st.quantity, 0)
          WHEN st.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(st.quantity, 0)
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_transactions st
     LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
     LEFT JOIN phones   ph ON st.itemType = 'phone' AND st.itemId = ph.id
     WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)`,
    [fromDateISO, toDateISO],
  );

  const totalCostOfGoodsSold =
    Number(ordersCogs?.cogs || 0) + Number(legacyCogs?.cogs || 0);
  const grossProfit = totalRevenue - totalCostOfGoodsSold;
  const averageSaleValue =
    totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // 3) Daily sales (order grandTotal + legacy totalPrice)
  // گروه‌بندی باید روی روز انجام شود، نه timestamp کامل؛ وگرنه هدر/نمودار فروش امروز صفر یا چندتکه می‌شود.
  const dailySalesQuery = `
    SELECT saleDate as date, SUM(amount) as totalSales
    FROM (
      SELECT date(transactionDate) as saleDate, grandTotal as amount
      FROM sales_orders
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
        AND (status IS NULL OR status = 'active')
      UNION ALL
      SELECT date(transactionDate) as saleDate, totalPrice as amount
      FROM sales_transactions
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
    )
    GROUP BY saleDate
    ORDER BY saleDate ASC
  `;
  const dailySales: DailySalesPoint[] = await allAsync(dailySalesQuery, [
    fromDateISO,
    toDateISO,
    fromDateISO,
    toDateISO,
  ]);

  // 4) Top selling items (by revenue) from unified line items
  // تخفیف کلی فاکتور به نسبت سهم هر ردیف پخش می‌شود تا پرفروش‌ها با مبلغ ناخالص/غلط نمایش داده نشوند.
  const topItemsQuery = `
    WITH invoice_lines AS (
      SELECT
        so.id AS orderId,
        soi.itemId,
        soi.itemType,
        COALESCE(soi.description, p.name, ph.model, '—') AS itemName,
        COALESCE(soi.quantity, 0) AS quantity,
        MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
        COALESCE(so.discount, 0) AS orderDiscount
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
      LEFT JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
    ),
    order_bases AS (
      SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
    ),
    lines AS (
      SELECT itemId, itemType, itemName, quantity, totalPrice
      FROM sales_transactions
      WHERE date(transactionDate) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT il.itemId, il.itemType, il.itemName, il.quantity,
             MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS totalPrice
      FROM invoice_lines il
      LEFT JOIN order_bases ob ON ob.orderId = il.orderId
    )
    SELECT itemId, itemType, itemName,
           SUM(totalPrice) as totalRevenue,
           SUM(quantity) as quantitySold
    FROM lines
    GROUP BY itemId, itemType, itemName
    ORDER BY totalRevenue DESC
    LIMIT 20
  `;
  const topItemsRaw = await allAsync(topItemsQuery, [
    fromDateISO,
    toDateISO,
    fromDateISO,
    toDateISO,
  ]);
  const topSellingItems: TopSellingItem[] = (topItemsRaw || []).map(
    (item: any) => ({
      id: item.itemId,
      itemType: item.itemType,
      itemName: item.itemName,
      totalRevenue: Number(item.totalRevenue || 0),
      quantitySold: Number(item.quantitySold || 0),
    }),
  );

  return {
    totalRevenue,
    grossProfit,
    totalTransactions,
    averageSaleValue,
    dailySales,
    topSellingItems,
  };
};
