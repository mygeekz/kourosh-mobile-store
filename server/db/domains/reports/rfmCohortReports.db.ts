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

export const getRfmReport = async (): Promise<RfmItem[]> => {
  // Fetch aggregated order stats per customer. Null customerId rows are ignored.
  const rows: any[] = await allAsync(
    `SELECT c.id as customerId, c.fullName as customerName,
            MAX(o.transactionDate) as lastDate,
            COUNT(o.id) as frequency,
            SUM(o.grandTotal) as monetary
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id
     HAVING COUNT(o.id) > 0`,
  );
  if (!rows || rows.length === 0) return [];

  const now = moment().startOf("day");
  // Compute recency (in days) for each row and collect arrays for scoring.
  const recencies: number[] = [];
  const frequencies: number[] = [];
  const monetaries: number[] = [];
  for (const row of rows) {
    const recencyDays = now.diff(moment(row.lastDate).startOf("day"), "days");
    row.recencyDays = recencyDays;
    recencies.push(recencyDays);
    frequencies.push(Number(row.frequency));
    monetaries.push(Number(row.monetary));
  }
  // Compute tertiles (0-33%, 34-66%, 67-100%) for scoring.
  const tertile = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const len = sorted.length;
    const t1 = sorted[Math.floor(len / 3)];
    const t2 = sorted[Math.floor((2 * len) / 3)];
    return [t1, t2];
  };
  const [recT1, recT2] = tertile(recencies);
  const [freqT1, freqT2] = tertile(frequencies);
  const [monT1, monT2] = tertile(monetaries);
  // Assign scores: for recency, lower days = higher score.
  const getScore = (
    v: number,
    t1: number,
    t2: number,
    invert: boolean = false,
  ) => {
    // invert = true means smaller values give higher score (for recency)
    if (!invert) {
      if (v <= t1) return 1;
      if (v <= t2) return 2;
      return 3;
    } else {
      if (v <= t1) return 3;
      if (v <= t2) return 2;
      return 1;
    }
  };
  const items: RfmItem[] = rows.map((row) => {
    const recScore = getScore(row.recencyDays, recT1, recT2, true);
    const freqScore = getScore(Number(row.frequency), freqT1, freqT2, false);
    const monScore = getScore(Number(row.monetary), monT1, monT2, false);
    return {
      customerId: row.customerId,
      customerName: row.customerName,
      recencyDays: row.recencyDays,
      frequency: Number(row.frequency),
      monetary: Number(row.monetary),
      rScore: recScore,
      fScore: freqScore,
      mScore: monScore,
      rfm: `${recScore}${freqScore}${monScore}`,
    };
  });
  // Sort by customer name for predictable display.
  return items.sort((a, b) =>
    a.customerName.localeCompare(b.customerName, "fa"),
  );
};

export const getCohortReport = async (): Promise<CohortRow[]> => {
  // Step 1: gather first purchase month for each customer
  const firstPurchaseRows: any[] = await allAsync(
    `SELECT c.id as customerId, MIN(o.transactionDate) as firstDate
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id`,
  );
  if (!firstPurchaseRows || firstPurchaseRows.length === 0) return [];
  // Map customer -> first cohort month (YYYY-MM)
  const firstMonthMap: Record<number, string> = {};
  for (const row of firstPurchaseRows) {
    const monthStr = moment(row.firstDate).format("YYYY-MM");
    firstMonthMap[row.customerId] = monthStr;
  }
  // Collect all orders grouped by customer and month
  const orderRows: any[] = await allAsync(
    `SELECT o.customerId, o.transactionDate
     FROM sales_orders o
     WHERE o.customerId IS NOT NULL`,
  );
  // Build a map: cohortMonth -> { customers: Set, counts: Map<offset, Set<customerId>> }
  const cohorts: Record<
    string,
    { customers: Set<number>; offsets: Map<number, Set<number>> }
  > = {};
  for (const row of orderRows) {
    const cid = row.customerId;
    const cohortMonth = firstMonthMap[cid];
    if (!cohortMonth) continue;
    const orderMonth = moment(row.transactionDate).format("YYYY-MM");
    // Compute offset: months difference between orderMonth and cohortMonth
    const offset = moment(orderMonth + "-01").diff(
      moment(cohortMonth + "-01"),
      "months",
    );
    if (offset < 0) continue; // Should not happen
    if (!cohorts[cohortMonth]) {
      cohorts[cohortMonth] = {
        customers: new Set<number>(),
        offsets: new Map<number, Set<number>>(),
      };
    }
    cohorts[cohortMonth].customers.add(cid);
    if (!cohorts[cohortMonth].offsets.has(offset)) {
      cohorts[cohortMonth].offsets.set(offset, new Set<number>());
    }
    cohorts[cohortMonth].offsets.get(offset)!.add(cid);
  }
  // Convert to array of CohortRow
  const result: CohortRow[] = [];
  const sortedCohorts = Object.keys(cohorts).sort();
  for (const month of sortedCohorts) {
    const entry = cohorts[month];
    const maxOffset = Math.max(...Array.from(entry.offsets.keys()));
    const counts: number[] = [];
    for (let i = 0; i <= maxOffset; i++) {
      const set = entry.offsets.get(i);
      counts.push(set ? set.size : 0);
    }
    result.push({ cohortMonth: month, counts, totals: entry.customers.size });
  }
  return result;
};
