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

import { reconcileInstallmentCustomerLedger } from "../installmentLedger.db";

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

export const getInventoryTurnoverReport = async (
  fromISO: string,
  toISO: string,
): Promise<InventoryTurnoverReport> => {
  await getDbInstance();

  const safeNum = (v: any) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const fromMoment = moment(
    String(fromISO),
    ["YYYY-MM-DD", moment.ISO_8601],
    true,
  );
  const toMoment = moment(String(toISO), ["YYYY-MM-DD", moment.ISO_8601], true);
  const fromDate = (
    fromMoment.isValid() ? fromMoment : moment().startOf("jMonth")
  ).format("YYYY-MM-DD");
  const toDate = (toMoment.isValid() ? toMoment : moment().endOf("day")).format(
    "YYYY-MM-DD",
  );
  const fromJalali = moment(fromDate, "YYYY-MM-DD")
    .locale("en")
    .format("jYYYY/jMM/jDD");
  const toJalali = moment(toDate, "YYYY-MM-DD")
    .locale("en")
    .format("jYYYY/jMM/jDD");

  const periodDays = Math.max(
    1,
    moment(toDate).diff(moment(fromDate), "days") + 1,
  );

  // Some project tables store Gregorian ISO dates (YYYY-MM-DD) and some older/local flows store Jalali dates (jYYYY/jMM/jDD).
  // SQLite date() cannot parse Jalali strings, so every date filter accepts BOTH forms.
  const dateClause = (expr: string) => `(
    date(${expr}) BETWEEN date(?) AND date(?)
    OR REPLACE(SUBSTR(COALESCE(${expr}, ''), 1, 10), '-', '/') BETWEEN ? AND ?
  )`;
  const rangeParams = () => [fromDate, toDate, fromJalali, toJalali];

  // A missing purchasePrice should not make the whole report zero. Many installs created inventory with purchasePrice=0.
  // We first use cost, then fallback to sellingPrice as an estimated inventory basis. This keeps the report useful while
  // diagnostics below still reveal that the cost basis is incomplete.
  const productBasis = `COALESCE(NULLIF(p.purchasePrice, 0), NULLIF(p.sellingPrice, 0), 0)`;

  const productStats: any = await getAsync(
    `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithStock,
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 AND COALESCE(purchasePrice, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithCost,
        COALESCE(SUM(CASE WHEN COALESCE(stock_quantity, 0) > 0 AND COALESCE(purchasePrice, 0) = 0 AND COALESCE(sellingPrice, 0) > 0 THEN 1 ELSE 0 END), 0) as productsWithSellingFallback,
        COALESCE(SUM(COALESCE(stock_quantity, 0) * COALESCE(NULLIF(purchasePrice, 0), NULLIF(sellingPrice, 0), 0)), 0) as invValue
       FROM products`,
    [],
  );
  const endValue = safeNum(productStats?.invValue);

  const purchaseRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(NULLIF(pi.lineTotal, 0), COALESCE(pi.quantity, 0) * COALESCE(NULLIF(pi.unitCost, 0), ${productBasis}, 0))
      ), 0) as purchaseValue
       FROM purchase_items pi
       JOIN purchases pu ON pu.id = pi.purchaseId
       LEFT JOIN products p ON p.id = pi.productId
      WHERE ${dateClause("pu.purchaseDate")}`,
    rangeParams(),
  );

  const ledgerInRow: any = await getAsync(
    `SELECT COALESCE(SUM(COALESCE(il.quantity, 0) * COALESCE(NULLIF(il.unitCost, 0), ${productBasis}, 0)), 0) as purchaseValue
       FROM inventory_ledger il
       LEFT JOIN products p ON p.id = il.productId
      WHERE il.entryType = 'in'
        AND ${dateClause("il.entryDate")}`,
    rangeParams(),
  );

  const purchaseValue = Math.max(
    safeNum(purchaseRow?.purchaseValue),
    safeNum(ledgerInRow?.purchaseValue),
  );

  const orderCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(soi.quantity, 0) * COALESCE(
          NULLIF(soi.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(soi.quantity, 0) > 0 THEN COALESCE(soi.totalPrice, 0) / COALESCE(soi.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
      WHERE soi.itemType = 'inventory'
        AND (so.status IS NULL OR so.status = 'active')
        AND ${dateClause("so.transactionDate")}`,
    rangeParams(),
  );

  const installmentCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(isi.quantity, 0) * COALESCE(
          NULLIF(isi.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(isi.quantity, 0) > 0 THEN COALESCE(isi.totalPrice, 0) / COALESCE(isi.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN products p ON p.id = isi.itemId
      WHERE isi.itemType = 'inventory'
        AND COALESCE(ins.status,'active') = 'active'
        AND ${dateClause("COALESCE(ins.saleDateISO, ins.dateCreated)")}`,
    rangeParams(),
  );

  const legacyCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(
        COALESCE(st.quantity, 0) * COALESCE(
          NULLIF(st.buyPrice, 0),
          ${productBasis},
          CASE WHEN COALESCE(st.quantity, 0) > 0 THEN COALESCE(st.totalPrice, 0) / COALESCE(st.quantity, 1) ELSE 0 END,
          0
        )
      ), 0) as cogs
       FROM sales_transactions st
       LEFT JOIN products p ON p.id = st.itemId
      WHERE st.itemType = 'inventory'
        AND ${dateClause("st.transactionDate")}`,
    rangeParams(),
  );

  const ledgerOutCogsRow: any = await getAsync(
    `SELECT COALESCE(SUM(COALESCE(il.quantity, 0) * COALESCE(NULLIF(il.unitCost, 0), ${productBasis}, 0)), 0) as cogs
       FROM inventory_ledger il
       LEFT JOIN products p ON p.id = il.productId
      WHERE il.entryType = 'out'
        AND (il.refType IS NULL OR il.refType IN ('sale', 'adjust'))
        AND ${dateClause("il.entryDate")}`,
    rangeParams(),
  );

  const orderCogs = safeNum(orderCogsRow?.cogs);
  const installmentCogs = safeNum(installmentCogsRow?.cogs);
  const legacyCogs = safeNum(legacyCogsRow?.cogs);
  const ledgerCogs = safeNum(ledgerOutCogsRow?.cogs);
  const salesSourcesCogs = orderCogs + installmentCogs + legacyCogs;
  const cogsSource = salesSourcesCogs > 0
    ? "sales_documents"
    : ledgerCogs > 0
      ? "inventory_ledger"
      : "none";
  const cogs = salesSourcesCogs > 0 ? salesSourcesCogs : ledgerCogs;

  const startValue = Math.max(0, endValue - purchaseValue + cogs);
  let avgInventoryValue = Math.max(0, (startValue + endValue) / 2);

  // Last-resort fallback: if the stock valuation is absent but we do have sales movement, use the COGS basis as
  // an operational denominator so the report does not collapse to all-zero. This is flagged in diagnostics.
  if (avgInventoryValue <= 0 && cogs > 0) avgInventoryValue = cogs;

  const inventoryTurnover =
    avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;
  const daysOfInventory =
    cogs > 0 && avgInventoryValue > 0
      ? (avgInventoryValue / cogs) * periodDays
      : 0;

  return {
    periodDays,
    cogs,
    avgInventoryValue,
    inventoryTurnover,
    daysOfInventory,
    diagnostics: {
      fromDate,
      toDate,
      fromJalali,
      toJalali,
      endValue,
      purchaseValue,
      orderCogs,
      installmentCogs,
      legacyCogs,
      ledgerCogs,
      cogsSource,
      productsWithStock: safeNum(productStats?.productsWithStock),
      productsWithCost: safeNum(productStats?.productsWithCost),
      productsWithSellingFallback: safeNum(
        productStats?.productsWithSellingFallback,
      ),
    },
  };
};

export const getDeadStockReport = async (
  days: number,
): Promise<DeadStockItem[]> => {
  await getDbInstance();
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  // last sale date from inventory_ledger out(sale)
  const rows: any[] = await allAsync(
    `
    SELECT
      p.id as productId,
      p.name,
      c.name as categoryName,
      p.stock_quantity as stock,
      p.purchasePrice,
      (p.stock_quantity * p.purchasePrice) as value,
      (SELECT MAX(entryDate) FROM inventory_ledger il WHERE il.productId = p.id AND il.entryType='out' AND il.refType='sale') as lastSaleDate
    FROM products p
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE p.stock_quantity > 0
    `,
    [],
  );

  return rows
    .map((r) => {
      const last = r.lastSaleDate ? new Date(r.lastSaleDate).getTime() : null;
      const diffDays = last
        ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
        : null;
      return {
        productId: Number(r.productId),
        name: String(r.name),
        categoryName: r.categoryName ?? null,
        stock: Number(r.stock ?? 0),
        purchasePrice: Number(r.purchasePrice ?? 0),
        value: Number(r.value ?? 0),
        lastSaleDate: r.lastSaleDate ?? null,
        daysSinceLastSale: diffDays,
      } as DeadStockItem;
    })
    .filter(
      (r) => !r.lastSaleDate || new Date(r.lastSaleDate).toISOString() < cutoff,
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
};

export const getAbcReport = async (
  fromISO: string,
  toISO: string,
  metric: "sales" | "profit" = "sales",
): Promise<AbcItem[]> => {
  await getDbInstance();

  // Aggregate from sales_order_items (inventory only), join products purchasePrice for cogs approximation
  const rows: any[] = await allAsync(
    `
    SELECT
      x.productId,
      x.name,
      x.categoryName,
      SUM(x.sales) as sales,
      SUM(x.cogs) as cogs
    FROM (
      SELECT
        p.id as productId,
        p.name,
        c.name as categoryName,
        ((COALESCE(soi.quantity,0) * COALESCE(soi.unitPrice,0)) - COALESCE(soi.discountPerItem,0)) as sales,
        (COALESCE(soi.quantity,0) * COALESCE(p.purchasePrice,0)) as cogs
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN products p ON p.id = soi.itemId
      LEFT JOIN categories c ON c.id = p.categoryId
      WHERE soi.itemType = 'inventory'
        AND so.transactionDate BETWEEN ? AND ?

      UNION ALL

      SELECT
        p.id as productId,
        p.name,
        c.name as categoryName,
        COALESCE(isi.totalPrice,0) as sales,
        (COALESCE(isi.quantity,0) * COALESCE(p.purchasePrice,0)) as cogs
      FROM installment_sale_items isi
      JOIN installment_sales ins ON ins.id = isi.saleId
      JOIN products p ON p.id = isi.itemId
      LEFT JOIN categories c ON c.id = p.categoryId
      WHERE isi.itemType = 'inventory'
        AND COALESCE(ins.status,'active') = 'active'
        AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN ? AND ?
    ) x
    GROUP BY x.productId, x.name, x.categoryName
    `,
    [fromISO.slice(0, 10), toISO.slice(0, 10)],
  );

  const items: AbcItem[] = rows.map((r) => {
    const sales = Number(r.sales ?? 0);
    const cogs = Number(r.cogs ?? 0);
    const profit = sales - cogs;
    return {
      productId: Number(r.productId),
      name: String(r.name),
      categoryName: r.categoryName ?? null,
      sales,
      cogs,
      profit,
      share: 0,
      cumShare: 0,
      bucket: "C" as const,
    };
  });

  const total =
    items.reduce(
      (acc, it) => acc + (metric === "sales" ? it.sales : it.profit),
      0,
    ) || 1;

  items.sort((a, b) =>
    metric === "sales" ? b.sales - a.sales : b.profit - a.profit,
  );

  let cum = 0;
  for (const it of items) {
    const v = metric === "sales" ? it.sales : it.profit;
    const share = v / total;
    cum += share;
    it.share = share;
    it.cumShare = cum;
    it.bucket = cum <= 0.8 ? "A" : cum <= 0.95 ? "B" : "C";
  }

  return items;
};

export const getAgingReceivablesReport = async (): Promise<
  AgingReceivableRow[]
> => {
  await getDbInstance();
  await reconcileInstallmentCustomerLedger();

  // Pull ledger entries per customer, then allocate outstanding using FIFO (oldest debits first, credits reduce)
  const customers: any[] = await allAsync(
    `SELECT id, fullName, phoneNumber FROM customers`,
    [],
  );

  const results: AgingReceivableRow[] = [];
  for (const c of customers) {
    const rows: any[] = await allAsync(
      `SELECT transactionDate, description, debit, credit
       FROM customer_ledger
       WHERE customerId = ?
       ORDER BY date(substr(transactionDate, 1, 10)) ASC, id ASC`,
      [c.id],
    );

    let creditPool = 0;
    const openDebits: { date: string; amount: number }[] = [];

    for (const r of rows) {
      const debit = Number(r.debit ?? 0);
      const credit = Number(r.credit ?? 0);
      if (credit > 0) creditPool += credit;

      if (debit > 0) {
        let remaining = debit;
        // Apply existing credit pool
        if (creditPool > 0) {
          const used = Math.min(creditPool, remaining);
          creditPool -= used;
          remaining -= used;
        }
        if (remaining > 0)
          openDebits.push({
            date: String(r.transactionDate),
            amount: remaining,
          });
      }

      // Extra credits can offset existing open debits (in case credits come later)
      while (creditPool > 0 && openDebits.length > 0) {
        const d = openDebits[0];
        const used = Math.min(creditPool, d.amount);
        creditPool -= used;
        d.amount -= used;
        if (d.amount <= 0.00001) openDebits.shift();
      }
    }

    const now = Date.now();
    const buckets: Record<string, number> = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    for (const d of openDebits) {
      const ageDays = Math.floor(
        (now - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24),
      );
      const b =
        ageDays <= 30
          ? "0-30"
          : ageDays <= 60
            ? "31-60"
            : ageDays <= 90
              ? "61-90"
              : "90+";
      buckets[b] += d.amount;
    }

    const totalOutstanding = Object.values(buckets).reduce((a, b) => a + b, 0);

    if (totalOutstanding > 0.00001) {
      results.push({
        customerId: Number(c.id),
        fullName: String(c.fullName),
        phoneNumber: c.phoneNumber ?? null,
        totalOutstanding,
        buckets: (Object.keys(buckets) as any).map((k: any) => ({
          bucket: k,
          amount: buckets[k],
        })) as AgingBucket[],
      });
    }
  }

  results.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return results;
};
