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

export const getProfitabilityReportFromDb = async (
  fromDate?: string | null,
  toDate?: string | null,
): Promise<ProfitabilityAnalysisItem[]> => {
  await getDbInstance();

  const fromIso = fromDate ? fromShamsiStringToISO(fromDate) : undefined;
  const toIso = toDate ? fromShamsiStringToISO(toDate) : undefined;
  if ((fromDate && !fromIso) || (toDate && !toIso)) {
    throw new Error("بازه تاریخ گزارش سودآوری نامعتبر است.");
  }
  if ((fromIso && !toIso) || (!fromIso && toIso)) {
    throw new Error("برای گزارش سودآوری، تاریخ شروع و پایان باید با هم ثبت شوند.");
  }
  if (fromIso && toIso && fromIso > toIso) {
    throw new Error("تاریخ شروع گزارش سودآوری نمی‌تواند بعد از تاریخ پایان باشد.");
  }

  type ProfitabilityLine = {
    itemId: number;
    itemType: ProfitabilityAnalysisItem["itemType"];
    itemName: string;
    quantity: number;
    totalPrice: number;
    saleDate: string | null;
    totalCost: number;
  };

  const query = `
    WITH lines AS (
      SELECT
        st.itemId,
        st.itemType,
        st.itemName,
        st.quantity,
        st.totalPrice,
        st.transactionDate AS saleDate,
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(NULLIF(st.buyPrice, 0), p.purchasePrice, 0) * st.quantity
          WHEN st.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) * st.quantity
          ELSE 0
        END AS totalCost
      FROM sales_transactions st
      LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
      LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id

      UNION ALL

      SELECT
        soi.itemId,
        soi.itemType,
        soi.description AS itemName,
        soi.quantity,
        ((COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0)) AS totalPrice,
        so.transactionDate AS saleDate,
        CASE
          WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0) * soi.quantity
          WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) * soi.quantity
          ELSE 0
        END AS totalCost
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
      LEFT JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      WHERE (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT
        isi.itemId,
        isi.itemType,
        isi.description AS itemName,
        isi.quantity,
        isi.totalPrice,
        COALESCE(ins.saleDateISO, ins.dateCreated) AS saleDate,
        CASE
          WHEN isi.itemType = 'inventory' THEN COALESCE(NULLIF(isi.buyPrice, 0), p.purchasePrice, 0) * isi.quantity
          WHEN isi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) * isi.quantity
          ELSE 0
        END AS totalCost
      FROM installment_sale_items isi
      JOIN installment_sales ins ON ins.id = isi.saleId
      LEFT JOIN products p ON isi.itemType = 'inventory' AND isi.itemId = p.id
      LEFT JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
      WHERE COALESCE(ins.status,'active') = 'active'
    )
    SELECT itemId, itemType, itemName, quantity, totalPrice, saleDate, totalCost
    FROM lines;
  `;

  const lines = await allAsync(query) as ProfitabilityLine[];

  const normalizeSaleDate = (rawValue: unknown): string | undefined => {
    const raw = String(rawValue || "").trim();
    if (!raw) return undefined;

    const normalizedDigits = raw
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const leadingYear = Number(normalizedDigits.match(/^\s*(\d{4})/)?.[1] || 0);
    if (leadingYear >= 1200 && leadingYear < 1700) {
      return fromShamsiStringToISO(normalizedDigits);
    }

    const parsed = moment(normalizedDigits);
    return parsed.isValid() ? parsed.locale("en").format("YYYY-MM-DD") : undefined;
  };

  const aggregate = new Map<string, ProfitabilityAnalysisItem>();
  for (const line of lines) {
    const normalizedDate = normalizeSaleDate(line.saleDate);
    if (fromIso && toIso) {
      if (!normalizedDate || normalizedDate < fromIso || normalizedDate > toIso) continue;
    }

    const itemId = Number(line.itemId || 0);
    const itemType = line.itemType;
    const itemName = String(line.itemName || "بدون عنوان").trim() || "بدون عنوان";
    const quantity = Number(line.quantity || 0);
    const totalRevenue = Number(line.totalPrice || 0);
    const totalCost = Number(line.totalCost || 0);
    const key = `${itemType}:${itemId}:${itemName}`;
    const current = aggregate.get(key) || {
      itemId,
      itemType,
      itemName,
      totalQuantitySold: 0,
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
    };

    current.totalQuantitySold += quantity;
    current.totalRevenue += totalRevenue;
    current.totalCost += totalCost;
    aggregate.set(key, current);
  }

  return Array.from(aggregate.values())
    .map((item) => {
      const grossProfit = item.totalRevenue - item.totalCost;
      return {
        ...item,
        grossProfit,
        profitMargin: item.totalRevenue === 0 ? 0 : (grossProfit * 100) / item.totalRevenue,
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);
};

export const getInventoryVelocityReportFromDb = async (): Promise<
  VelocityItem[]
> => {
  await getDbInstance();
  const query = `
        WITH lines AS (
            SELECT itemId, itemType, quantity
            FROM sales_transactions
            WHERE itemType IN ('inventory','phone')
            UNION ALL
            SELECT soi.itemId, soi.itemType, soi.quantity
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE (so.status IS NULL OR so.status = 'active')
              AND soi.itemType IN ('inventory','phone')
        ),
        ItemSales AS (
            SELECT
                itemId,
                itemType,
                SUM(quantity) as totalQuantitySold
            FROM lines
            GROUP BY itemId, itemType
        ),
        AllItems AS (
            SELECT
                id as itemId,
                'inventory' as itemType,
                name as itemName,
                date_added as registrationDate
            FROM products
            UNION ALL
            SELECT
                id as itemId,
                'phone' as itemType,
                model || ' (IMEI: ' || imei || ')' as itemName,
                registerDate as registrationDate
            FROM phones
        )
        SELECT
            ai.itemId,
            ai.itemType,
            ai.itemName,
            (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay,
            CASE
                WHEN (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) > 0.5 THEN 'پرفروش (داغ)'
                WHEN (COALESCE(s.totalQuantitySold, 0) > 0) OR ((julianday('now') - julianday(ai.registrationDate)) <= 60) THEN 'عادی'
                ELSE 'کم‌فروش (راکد)'
            END as classification
        FROM AllItems ai
        LEFT JOIN ItemSales s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
        ORDER BY salesPerDay DESC;
    `;
  return await allAsync(query);
};

export const getPurchaseSuggestionsReportFromDb = async (): Promise<
  Omit<PurchaseSuggestionItem, "suggestedPurchaseQuantity">[]
> => {
  await getDbInstance();
  const query = `
        WITH ItemVelocity AS (
            SELECT * FROM (
              SELECT
                  ai.itemId,
                  ai.itemType,
                  (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay
              FROM (
                SELECT id as itemId, 'inventory' as itemType, date_added as registrationDate FROM products
                UNION ALL
                SELECT id as itemId, 'phone' as itemType, registerDate as registrationDate FROM phones
              ) ai
              LEFT JOIN (
                WITH lines AS (
                    SELECT itemId, itemType, quantity
                    FROM sales_transactions
                    WHERE itemType IN ('inventory','phone')
                    UNION ALL
                    SELECT soi.itemId, soi.itemType, soi.quantity
                    FROM sales_order_items soi
                    JOIN sales_orders so ON so.id = soi.orderId
                    WHERE (so.status IS NULL OR so.status = 'active')
                      AND soi.itemType IN ('inventory','phone')
                )
                SELECT itemId, itemType, SUM(quantity) as totalQuantitySold
                FROM lines
                GROUP BY itemId, itemType
              ) s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
            ) WHERE salesPerDay > 0
        ),
        StockLevels AS (
            -- IMPORTANT: include items with صفر موجودی as well.
            -- Otherwise the suggestions list becomes empty exactly when it's most needed.
            SELECT id as itemId, 'inventory' as itemType, name as itemName, COALESCE(stock_quantity, 0) as currentStock FROM products
            UNION ALL
            SELECT id as itemId, 'phone' as itemType, model || ' (IMEI: ' || imei || ')' as itemName, 1 as currentStock FROM phones WHERE status = 'موجود در انبار'
        )
        SELECT
            sl.itemId,
            iv.itemType,
            sl.itemName,
            sl.currentStock,
            iv.salesPerDay,
            (sl.currentStock / iv.salesPerDay) as daysOfStockLeft
        FROM StockLevels sl
        JOIN ItemVelocity iv ON sl.itemId = iv.itemId AND sl.itemType = iv.itemType
        WHERE (sl.currentStock / iv.salesPerDay) < 30 -- Reorder threshold: 30 days
        ORDER BY daysOfStockLeft ASC;
    `;
  return await allAsync(query);
};
