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

export const listReportSavedFilters = async (
  userId: number,
  reportKey: string,
) => {
  await ensureReportSavedFiltersTable();
  return (await allAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ?
     ORDER BY createdAt DESC`,
    [userId, reportKey],
  )) as SavedFilterRow[];
};

export const createOrReplaceReportSavedFilter = async (
  userId: number,
  reportKey: string,
  name: string,
  filters: any,
) => {
  await ensureReportSavedFiltersTable();
  const filtersJson = JSON.stringify(filters ?? {});
  // Upsert by UNIQUE(userId, reportKey, name)
  await runAsync(
    `INSERT INTO report_saved_filters (userId, reportKey, name, filtersJson)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId, reportKey, name) DO UPDATE SET
       filtersJson = excluded.filtersJson,
       updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))`,
    [userId, reportKey, name, filtersJson],
  );
  const row = await getAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ? AND name = ?`,
    [userId, reportKey, name],
  );
  return row as SavedFilterRow;
};

export const deleteReportSavedFilter = async (userId: number, id: number) => {
  await ensureReportSavedFiltersTable();
  await runAsync(
    `DELETE FROM report_saved_filters WHERE id = ? AND userId = ?`,
    [id, userId],
  );
  return { success: true };
};
