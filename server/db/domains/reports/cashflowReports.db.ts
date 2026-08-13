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
import { normalizeInstallmentAccountingDate } from "../installmentAccounting.db";

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

export const getCashflowReport = async (
  fromISO: string,
  toISO: string,
  forecastDays: number = 30,
): Promise<CashflowReport> => {
  await getDbInstance();

  const from = fromISO.slice(0, 10);
  const to = toISO.slice(0, 10);

  // In some installs, not all modules/tables exist yet. Prefer returning an empty report
  // instead of throwing 500 for missing tables.
  const safeAll = async (sql: string, params: any[]) => {
    try {
      return await allAsync(sql, params);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("no such table")) return [] as any[];
      throw e;
    }
  };

  const hasColumn = async (table: string, col: string) => {
    try {
      const rows: any[] = await allAsync(`PRAGMA table_info(${table});`);
      return (
        Array.isArray(rows) && rows.some((r: any) => String(r?.name) === col)
      );
    } catch {
      return false;
    }
  };

  // Inflow: only actual collected money.
  // Credit invoices create receivables, not cashflow. Cash orders and balanced cash sales are counted here;
  // credit/installment collections are counted from customer_ledger and installment_transactions.
  const salesRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(grandTotal) as amount
       FROM sales_orders
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND (status IS NULL OR status = 'active')
        AND LOWER(COALESCE(paymentMethod, 'cash')) = 'cash'
      GROUP BY substr(transactionDate,1,10)`,
    [from, to],
  );

  const legacyCashSalesRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(totalPrice) as amount
       FROM sales_transactions
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND LOWER(COALESCE(paymentMethod, 'cash')) = 'cash'
      GROUP BY substr(transactionDate,1,10)`,
    [from, to],
  );

  const customerReceiptRows: any[] = await safeAll(
    `SELECT substr(transactionDate,1,10) as date, SUM(COALESCE(credit,0)) as amount
       FROM customer_ledger
      WHERE substr(transactionDate,1,10) BETWEEN ? AND ?
        AND COALESCE(credit,0) > 0
        AND COALESCE(debit,0) = 0
        AND LOWER(COALESCE(referenceType, '')) NOT IN (
          'installment_payment_tx',
          'installment_cancellation_reversal',
          'installment_cancellation_downpayment_refund_due'
        ) 
      GROUP BY substr(transactionDate,1,10)`,
    [from, to],
  );

  const instRows: any[] = await safeAll(
    `SELECT substr(it.payment_date,1,10) as date, SUM(COALESCE(it.amount_paid,0)) as amount
       FROM installment_transactions it
      WHERE substr(it.payment_date,1,10) BETWEEN ? AND ?
      GROUP BY substr(it.payment_date,1,10)`,
    [from, to],
  );

  // پیش‌پرداخت فروش اقساطی یک وصول نقدی واقعی در روز فروش است؛
  // در customer_ledger فقط بدهی خالص پس از پیش‌پرداخت نگهداری می‌شود، پس این جریان باید جداگانه وارد Cashflow شود.
  const installmentDownPaymentSourceRows: any[] = await safeAll(
    `SELECT id, saleDateISO, saleDate, dateCreated, COALESCE(downPayment, 0) AS amount
       FROM installment_sales
      WHERE COALESCE(downPayment, 0) > 0`,
    [],
  );
  const installmentDownPaymentRows = installmentDownPaymentSourceRows
    .map((row: any) => ({
      date:
        String(row?.saleDateISO || "").trim() ||
        normalizeInstallmentAccountingDate(row?.saleDate, row?.dateCreated),
      amount: Number(row?.amount || 0),
    }))
    .filter((row: any) => row.date && row.date >= from && row.date <= to && row.amount > 0);

  // Outflow: expenses + inventory_ledger in(purchase/adjust) cost
  const expRows: any[] = await safeAll(
    `SELECT substr(expenseDate,1,10) as date, SUM(amount) as amount
     FROM expenses
     WHERE substr(expenseDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(expenseDate,1,10)`,
    [from, to],
  );

  const invInRows: any[] = await safeAll(
    `SELECT substr(entryDate,1,10) as date,
            SUM(CASE WHEN entryType='in' THEN quantity * COALESCE(unitCost,0) ELSE 0 END) as amount
     FROM inventory_ledger
     WHERE substr(entryDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(entryDate,1,10)`,
    [from, to],
  );

  // بازپرداخت واقعی فسخ، خروج وجه است. سند refund_due فقط تعهد حسابداری است و اینجا شمرده نمی‌شود.
  const installmentCancellationRefundRows: any[] = await safeAll(
    `SELECT substr(paymentDate,1,10) AS date, SUM(COALESCE(amount,0)) AS amount
       FROM installment_cancellation_refunds
      WHERE substr(paymentDate,1,10) BETWEEN ? AND ?
      GROUP BY substr(paymentDate,1,10)`,
    [from, to],
  );

  const map: Record<string, { inflow: number; outflow: number }> = {};
  const add = (date: string, inflow: number, outflow: number) => {
    const d = String(date).slice(0, 10);
    if (!map[d]) map[d] = { inflow: 0, outflow: 0 };
    map[d].inflow += inflow;
    map[d].outflow += outflow;
  };

  for (const r of salesRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of legacyCashSalesRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of customerReceiptRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of instRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of installmentDownPaymentRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of expRows) add(r.date, 0, Number(r.amount ?? 0));
  for (const r of invInRows) add(r.date, 0, Number(r.amount ?? 0));
  for (const r of installmentCancellationRefundRows) add(r.date, 0, Number(r.amount ?? 0));

  // Build date range days
  const days: CashflowDay[] = [];
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const inflow = map[key]?.inflow ?? 0;
    const outflow = map[key]?.outflow ?? 0;
    days.push({ date: key, inflow, outflow, net: inflow - outflow });
  }

  const totals = days.reduce(
    (acc, x) => {
      acc.inflow += x.inflow;
      acc.outflow += x.outflow;
      acc.net += x.net;
      return acc;
    },
    { inflow: 0, outflow: 0, net: 0 },
  );

  // Forecast: simple moving average of last 30 days
  const tail = days.slice(-30);
  const avgIn = tail.length
    ? tail.reduce((a, x) => a + x.inflow, 0) / tail.length
    : 0;
  const avgOut = tail.length
    ? tail.reduce((a, x) => a + x.outflow, 0) / tail.length
    : 0;

  const forecast: CashflowDay[] = [];
  const lastDate = new Date((days[days.length - 1]?.date ?? to) + "T00:00:00Z");
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    forecast.push({
      date: key,
      inflow: avgIn,
      outflow: avgOut,
      net: avgIn - avgOut,
    });
  }

  return { days, totals, forecast };
};
