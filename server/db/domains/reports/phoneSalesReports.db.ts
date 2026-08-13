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

export const getPhoneSalesDateBounds = async (): Promise<{
  minDate: string | null;
  maxDate: string | null;
}> => {
  await getDbInstance();
  const q = `
    SELECT
      MIN(d) as minDate,
      MAX(d) as maxDate
    FROM (
      SELECT so.transactionDate as d
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      WHERE soi.itemType = 'phone'
        AND (so.status IS NULL OR so.status = 'active')
      UNION ALL
      SELECT st.transactionDate as d
      FROM sales_transactions st
      WHERE st.itemType = 'phone'
    )
  `;
  const row = await getAsync(q, []);
  return { minDate: row?.minDate ?? null, maxDate: row?.maxDate ?? null };
};

export const getPhoneInstallmentSalesDateBounds = async (): Promise<{
  minDate: string | null;
  maxDate: string | null;
}> => {
  await getDbInstance();
  const q = `
    SELECT
      MIN(DATE(COALESCE(saleDateISO, dateCreated))) as minDate,
      MAX(DATE(COALESCE(saleDateISO, dateCreated))) as maxDate
    FROM installment_sales
    WHERE COALESCE(status,'active') = 'active'
  `;
  const row = await getAsync(q, []);
  return { minDate: row?.minDate ?? null, maxDate: row?.maxDate ?? null };
};

export const getPhoneSalesReport = async (
  fromDateISO: string,
  toDateISO: string,
): Promise<PhoneSaleProfitReportItem[]> => {
  await getDbInstance();
  // گزارش سود فروش گوشی باید قیمت خرید روز ذخیره‌شده در ردیف فروش را ملاک بگیرد؛
  // fallback فقط برای داده‌های قدیمی است که buyPrice ندارند.
  const query = `
    SELECT
      txId as transactionId,
      transactionDate,
      customerFullName,
      phoneModel,
      imei,
      purchasePrice,
      totalPrice,
      profit
    FROM (
      SELECT
          so.id as txId,
          so.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
          soi.totalPrice as totalPrice,
          (soi.totalPrice - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(soi.quantity, 1))) as profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      LEFT JOIN customers c ON so.customerId = c.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT
          st.id as txId,
          st.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
          st.totalPrice as totalPrice,
          (st.totalPrice - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(st.quantity, 1))) as profit
      FROM sales_transactions st
      JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      LEFT JOIN customers c ON st.customerId = c.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
    )
    ORDER BY transactionDate DESC
  `;
  return await allAsync(query, [
    fromDateISO,
    toDateISO,
    fromDateISO,
    toDateISO,
  ]);
};

export const getPhoneInstallmentSalesReport = async (
  fromDateISO: string,
  toDateISO: string,
): Promise<PhoneInstallmentSaleProfitReportItem[]> => {
  await getDbInstance();
  // فروش اقساطی جدید از installment_sale_items.buyPrice استفاده می‌کند؛ داده‌های قدیمی از currentPurchasePrice گوشی fallback می‌گیرند.
  const query = `
    SELECT
      saleId,
      dateCreated,
      customerFullName,
      phoneModel,
      imei,
      purchasePrice,
      actualSalePrice,
      totalProfit
    FROM (
      SELECT
        isale.id as saleId,
        COALESCE(isale.saleDateISO, isale.dateCreated) as dateCreated,
        c.fullName as customerFullName,
        ph.model as phoneModel,
        ph.imei,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) as purchasePrice,
        COALESCE(isi.totalPrice, isale.actualSalePrice, 0) as actualSalePrice,
        (COALESCE(isi.totalPrice, isale.actualSalePrice, 0) - (COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) * COALESCE(isi.quantity, 1))) as totalProfit
      FROM installment_sale_items isi
      JOIN installment_sales isale ON isale.id = isi.saleId
      JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
      JOIN customers c ON isale.customerId = c.id
      WHERE COALESCE(isale.status,'active') = 'active'
        AND DATE(COALESCE(isale.saleDateISO, isale.dateCreated)) BETWEEN DATE(?) AND DATE(?)

      UNION ALL

      SELECT
        isale.id as saleId,
        COALESCE(isale.saleDateISO, isale.dateCreated) as dateCreated,
        c.fullName as customerFullName,
        ph.model as phoneModel,
        ph.imei,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as purchasePrice,
        COALESCE(isale.actualSalePrice, 0) as actualSalePrice,
        (COALESCE(isale.actualSalePrice, 0) - COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) as totalProfit
      FROM installment_sales isale
      JOIN phones ph ON isale.phoneId = ph.id
      JOIN customers c ON isale.customerId = c.id
      WHERE COALESCE(isale.status,'active') = 'active'
        AND DATE(COALESCE(isale.saleDateISO, isale.dateCreated)) BETWEEN DATE(?) AND DATE(?)
        AND NOT EXISTS (SELECT 1 FROM installment_sale_items isi WHERE isi.saleId = isale.id AND isi.itemType = 'phone')
    )
    ORDER BY dateCreated DESC;
  `;
  return await allAsync(query, [
    fromDateISO,
    toDateISO,
    fromDateISO,
    toDateISO,
  ]);
};
