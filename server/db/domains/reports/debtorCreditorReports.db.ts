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
import { reconcileInstallmentCustomerLedger } from "../installmentLedger.db";
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

export const getDebtorsList = async (): Promise<FrontendDebtorReportItem[]> => {
  await getDbInstance();
  await reconcileInstallmentCustomerLedger();
  // Source of truth is the ledger movement sum, not the last row's cached balance.
  // This avoids stale balances after legacy imports, manual edits, or failed recalculation jobs.
  const rows = await allAsync(`
    SELECT c.id, c.fullName, c.phoneNumber,
           COALESCE(SUM(COALESCE(cl.debit, 0) - COALESCE(cl.credit, 0)), 0) AS balance
      FROM customers c
      LEFT JOIN customer_ledger cl ON cl.customerId = c.id
     GROUP BY c.id, c.fullName, c.phoneNumber
    HAVING balance > 0.00001
     ORDER BY balance DESC, c.fullName ASC
  `);

  return await Promise.all(
    (rows || []).map(async (row: any) => {
      const source = await getLatestCustomerLedgerSourceForReport(
        Number(row.id || 0),
      );
      return { ...row, ...source };
    }),
  );
};

export const getCreditorsList = async (): Promise<
  FrontendCreditorReportItem[]
> => {
  await getDbInstance();
  // Partner ledger direction: credit increases payable to partner, debit reduces it.
  // Use movement sum for reports so the payable list never shows only the last transaction.
  const rows = await allAsync(`
    SELECT p.id, p.partnerName, p.partnerType,
           ROUND(COALESCE(SUM(COALESCE(pl.credit, 0) - COALESCE(pl.debit, 0)), 0), 2) AS balance
      FROM partners p
      LEFT JOIN partner_ledger pl ON pl.partnerId = p.id
     GROUP BY p.id, p.partnerName, p.partnerType
    HAVING balance > 0.00001
     ORDER BY balance DESC, p.partnerName ASC
  `);

  return await Promise.all(
    (rows || []).map(async (row: any) => {
      const source = await getLatestPartnerLedgerSourceForReport(
        Number(row.id || 0),
      );
      return { ...row, ...source };
    }),
  );
};

export const getTopCustomersBySales = async (
  fromDateShamsi: string,
  toDateShamsi: string,
): Promise<FrontendTopCustomerReportItem[]> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error("فرمت تاریخ نامعتبر است.");
  // منبع اصلی: sales_orders (فاکتورها). برای داده‌های قدیمی، sales_transactions هم لحاظ می‌شود.
  const query = `
    SELECT x.customerId, c.fullName,
           SUM(x.amount) as totalSpent,
           COUNT(x.txId) as transactionCount
    FROM (
      SELECT so.customerId as customerId, so.grandTotal as amount, so.id as txId
      FROM sales_orders so
      WHERE so.transactionDate BETWEEN ? AND ?
        AND so.customerId IS NOT NULL
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT st.customerId as customerId, st.totalPrice as amount, st.id as txId
      FROM sales_transactions st
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND st.customerId IS NOT NULL
    ) x
    JOIN customers c ON c.id = x.customerId
    GROUP BY x.customerId, c.fullName
    ORDER BY totalSpent DESC
    LIMIT 20
  `;
  return await allAsync(query, [
    fromDateISO,
    toDateISO,
    fromDateISO,
    toDateISO,
  ]);
};

export const getTopSuppliersByPurchaseValue = async (
  fromDateISO: string,
  toDateISO: string,
): Promise<FrontendTopSupplierReportItem[]> => {
  await getDbInstance();
  // This query sums purchase prices from 'products' and 'phones' tables based on date_added/purchaseDate.
  // It's a simplified approach. A more accurate way would be to sum actual ledger entries (credits to supplier)
  // for purchases, but that requires ledger entries to consistently reference product/phone IDs.
  // The current ledger entry system for purchases is good, so we can leverage that.

  const query = `
    SELECT
        p.id as partnerId,
        p.partnerName,
        SUM(pl.credit) as totalPurchaseValue,
        COUNT(DISTINCT pl.id) as transactionCount -- Count ledger entries representing purchases
    FROM partners p
    JOIN partner_ledger pl ON p.id = pl.partnerId
    WHERE p.partnerType = 'Supplier'
      AND pl.credit > 0 -- Considering credit entries as value received from supplier
      AND pl.referenceType IN ('product_purchase', 'phone_purchase')
      AND DATE(pl.transactionDate) BETWEEN DATE(?) AND DATE(?)
    GROUP BY p.id, p.partnerName
    ORDER BY totalPurchaseValue DESC
    LIMIT 20;
  `;
  return await allAsync(query, [fromDateISO, toDateISO]);
};
