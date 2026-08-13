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

export const getPartnerAccessoriesReportFromDb = async (
  range: PartnerReportRange & { partnerId: number },
): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacyAccessoriesReportFromDb(range);
  const partnerId = Number(range.partnerId) || 0;
  const partner = await getAsync(
    `SELECT id, name, colorTag, notes FROM store_partners WHERE id = ?`,
    [partnerId],
  );
  if (!partner) return buildLegacyAccessoriesReportFromDb(range);

  const purchaseFilter = buildDateRangeSql("p.purchaseDate", range);
  const purchaseRows = await allAsync(
    `SELECT p.id as purchaseId, pi.id as purchaseItemId, p.purchaseDate, pr.id as productId, pr.name as itemName,
            pi.quantity, pi.unitCost, pi.lineTotal, opi.sharePercent
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchaseId
       JOIN products pr ON pr.id = pi.productId
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId AND opi.storePartnerId = ?
      WHERE 1 = 1${purchaseFilter.sql}
      ORDER BY p.purchaseDate DESC, p.id DESC, pi.id DESC`,
    [partnerId].concat(purchaseFilter.params as any),
  );

  const purchases = (purchaseRows as any[]).map((row) => {
    const sharePercent = Number(row.sharePercent) || 0;
    const quantity = Number(row.quantity) || 0;
    const lineTotal = Number(row.lineTotal) || 0;
    const unitCost = Number(row.unitCost) || 0;
    return {
      purchaseId: Number(row.purchaseId),
      purchaseItemId: Number(row.purchaseItemId),
      purchaseDate: row.purchaseDate,
      itemName: row.itemName,
      quantity,
      unitCost,
      grossAmount: lineTotal,
      sharePercent,
      attributedQuantity: quantity * (sharePercent / 100),
      attributedAmount: lineTotal * (sharePercent / 100),
      documentKey: `PUR-${row.purchaseId}`,
    };
  });

  const salesFilter = buildDateRangeSql("sps.saleDate", range);
  const salesRows = await allAsync(
    `SELECT sps.id as snapshotId, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId,
            sps.itemDescription, sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.ownerGainAmount as snapshotOwnerGainAmount,
            sps.sharedProfitAmount as snapshotSharedProfitAmount, sps.totalProfitAmount,
            COALESCE(opi.sharePercent, 0) as ownershipSharePercent,
            SUM(CASE WHEN spa.allocationType = 'owner_gain' THEN spa.amount ELSE 0 END) as partnerOwnerGainAmount,
            SUM(CASE WHEN spa.allocationType = 'shared_profit' THEN spa.amount ELSE 0 END) as partnerSharedProfitAmount,
            SUM(spa.amount) as partnerTotalProfitAmount
       FROM sale_profit_snapshots sps
       JOIN sale_profit_allocations spa ON spa.snapshotId = sps.id AND spa.storePartnerId = ? AND spa.sourceStatus = 'active'
       LEFT JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId AND opi.storePartnerId = ?
      WHERE sps.sourceStatus = 'active'
        AND sps.itemType = 'inventory'${salesFilter.sql}
      GROUP BY sps.id, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId, sps.itemDescription,
               sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.ownerGainAmount, sps.sharedProfitAmount, sps.totalProfitAmount, opi.sharePercent
      ORDER BY sps.saleDate DESC, sps.id DESC`,
    [partnerId, partnerId].concat(salesFilter.params as any),
  );

  const sales = (salesRows as any[]).map((row) => {
    const quantity = Number(row.quantity) || 0;
    const saleAmount = Number(row.saleAmount) || 0;
    const ownershipSharePercent = Number(row.ownershipSharePercent) || 0;
    return {
      snapshotId: Number(row.snapshotId),
      saleDate: row.saleDate,
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      itemName: row.itemDescription,
      quantity,
      grossSaleAmount: saleAmount,
      ownershipSharePercent,
      attributedSaleAmount: saleAmount * (ownershipSharePercent / 100),
      capitalReturnAmount:
        (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100),
      ownerGainAmount: Number(row.partnerOwnerGainAmount) || 0,
      sharedProfitAmount: Number(row.partnerSharedProfitAmount) || 0,
      totalProfitAmount: Number(row.partnerTotalProfitAmount) || 0,
      settlementEntitlementAmount:
        (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100) +
        (Number(row.partnerTotalProfitAmount) || 0),
      documentKey:
        row.sourceKind === "sales_order"
          ? `INV-${row.sourceId}`
          : `INS-${row.sourceId}`,
    };
  });

  const inventoryRows = await allAsync(
    `SELECT pr.id as productId, pr.name as itemName, pr.stock_quantity, pr.purchasePrice, opi.sharePercent
       FROM products pr
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId AND opi.storePartnerId = ?
      WHERE COALESCE(pr.stock_quantity, 0) > 0
      ORDER BY pr.name COLLATE NOCASE ASC`,
    [partnerId],
  );

  const currentInventory = (inventoryRows as any[]).map((row) => {
    const stockQuantity = Number(row.stock_quantity) || 0;
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      productId: Number(row.productId),
      itemName: row.itemName,
      stockQuantity,
      purchasePrice,
      sharePercent,
      attributedQuantity: stockQuantity * (sharePercent / 100),
      attributedValue: stockQuantity * purchasePrice * (sharePercent / 100),
    };
  });

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.grossAmount) || 0),
      0,
    ),
    purchasesAttributedAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.attributedAmount) || 0),
      0,
    ),
    purchasesAttributedQuantity: purchases.reduce(
      (sum, row) => sum + (Number(row.attributedQuantity) || 0),
      0,
    ),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce(
      (sum, row) => sum + (Number(row.grossSaleAmount) || 0),
      0,
    ),
    salesAttributedAmount: sales.reduce(
      (sum, row) => sum + (Number(row.attributedSaleAmount) || 0),
      0,
    ),
    capitalReturnAmount: sales.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    salesProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.totalProfitAmount) || 0),
      0,
    ),
    settlementEntitlementAmount: sales.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0),
      0,
    ),
    salesQuantity: sales.reduce(
      (sum, row) => sum + (Number(row.quantity) || 0),
      0,
    ),
    currentInventoryQuantity: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedQuantity) || 0),
      0,
    ),
    currentInventoryValue: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedValue) || 0),
      0,
    ),
  };

  const shouldFallback =
    !purchases.length && !sales.length && !currentInventory.length;
  if (shouldFallback) return buildLegacyAccessoriesReportFromDb(range);
  return {
    partner: {
      storePartnerId: Number(partner.id),
      partnerName: partner.name,
      colorTag: partner.colorTag || null,
    },
    summary,
    purchases,
    sales,
    currentInventory,
  };
};

export const getPartnerSettlementReportFromDb = async (
  range: PartnerReportRange = {},
): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacySettlementReportFromDb(range);
  const partners = await mapActiveStorePartners();
  const profitData = await getPartnerProfitReportFromDb(range);

  const phoneInventoryRows = await allAsync(
    `SELECT opi.storePartnerId, SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) * (COALESCE(opi.sharePercent, 0) / 100.0)) as attributedValue
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId
      WHERE ph.status IN ('in_stock', 'pending', 'reserved')
      GROUP BY opi.storePartnerId`,
  );
  const accessoryInventoryRows = await allAsync(
    `SELECT opi.storePartnerId, SUM(COALESCE(pr.stock_quantity, 0) * COALESCE(pr.purchasePrice, 0) * (COALESCE(opi.sharePercent, 0) / 100.0)) as attributedValue
       FROM products pr
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = pr.ownershipProfileId
      WHERE COALESCE(pr.stock_quantity, 0) > 0
      GROUP BY opi.storePartnerId`,
  );

  const phoneMap = new Map(
    (phoneInventoryRows as any[]).map((row) => [
      Number(row.storePartnerId),
      Number(row.attributedValue) || 0,
    ]),
  );
  const accessoryMap = new Map(
    (accessoryInventoryRows as any[]).map((row) => [
      Number(row.storePartnerId),
      Number(row.attributedValue) || 0,
    ]),
  );
  const profitMap = new Map(
    ((profitData?.summaries || []) as any[]).map((row) => [
      Number(row.storePartnerId),
      row,
    ]),
  );

  const defaultProfile = await getDefaultProfitShareProfileFromDb();
  let shareLines = normalizeShareLines(
    await getProfitShareLinesByProfileId(Number(defaultProfile?.id || 0)),
  );
  if (!shareLines.length && partners.length) {
    const equal = 100 / partners.length;
    shareLines = partners.map((partner: any) => ({
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      sharePercent: equal,
    }));
  }

  const rows: any[] = partners.map((partner: any) => {
    const storePartnerId = Number(partner.storePartnerId);
    const profitRow = profitMap.get(storePartnerId) || {};
    const phoneInventoryValue = phoneMap.get(storePartnerId) || 0;
    const accessoryInventoryValue = accessoryMap.get(storePartnerId) || 0;
    const inventoryValue = phoneInventoryValue + accessoryInventoryValue;
    const capitalReturnAmount =
      Number((profitRow as any).capitalReturnAmount) || 0;
    const ownerGainAmount = Number((profitRow as any).ownerGainAmount) || 0;
    const sharedProfitAmount =
      Number((profitRow as any).sharedProfitAmount) || 0;
    const recognizedProfit = Number((profitRow as any).totalAmount) || 0;
    const settlementEntitlement =
      capitalReturnAmount + ownerGainAmount + sharedProfitAmount;
    return {
      storePartnerId,
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      phoneInventoryValue,
      accessoryInventoryValue,
      inventoryValue,
      capitalReturnAmount,
      ownerGainAmount,
      sharedProfitAmount,
      recognizedProfit,
      settlementEntitlement,
      targetPercent:
        shareLines.find(
          (line) => Number(line.storePartnerId) === storePartnerId,
        )?.sharePercent || 0,
      settlementBalance: settlementEntitlement,
      settlementStatus:
        settlementEntitlement > 0.5
          ? "creditor"
          : settlementEntitlement < -0.5
            ? "debtor"
            : "settled",
    };
  });

  const transactions = await listPartnerSettlementTransactionsFromDb(range);
  type SettlementAggregation = {
    paidAmount: number;
    receivedAmount: number;
    netSettledAmount: number;
    phoneSpecificReceivedAmount: number;
    phoneSpecificSettlementCount: number;
  };
  const emptySettlementAggregation = (): SettlementAggregation => ({
    paidAmount: 0,
    receivedAmount: 0,
    netSettledAmount: 0,
    phoneSpecificReceivedAmount: 0,
    phoneSpecificSettlementCount: 0,
  });
  const recalcSettlementNet = (item: SettlementAggregation) => {
    item.netSettledAmount = item.receivedAmount - item.paidAmount;
  };
  const transactionMap = new Map<number, SettlementAggregation>();
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.fromStorePartnerId) {
      const prev =
        transactionMap.get(Number(tx.fromStorePartnerId)) ||
        emptySettlementAggregation();
      prev.paidAmount += amount;
      recalcSettlementNet(prev);
      transactionMap.set(Number(tx.fromStorePartnerId), prev);
    }
    if (tx.destinationKind === "partner" && tx.toStorePartnerId) {
      const prev =
        transactionMap.get(Number(tx.toStorePartnerId)) ||
        emptySettlementAggregation();
      prev.receivedAmount += amount;
      recalcSettlementNet(prev);
      transactionMap.set(Number(tx.toStorePartnerId), prev);
    }
  }

  // Existing phone-based partner settlements are stored in partner_ledger because PartnerDetail
  // attaches each payment to the sold phone. Reconcile those entries into the central partner
  // settlement report instead of creating a second, disconnected settlement source.
  try {
    if (
      (await tableExists("partner_ledger")) &&
      (await tableExists("store_partner_legacy_links"))
    ) {
      const ledgerDateFilter = buildDateRangeSql("pl.transactionDate", range);
      const phoneLedgerRows = await allAsync(
        `SELECT spl.storePartnerId,
                SUM(COALESCE(pl.debit, 0)) as receivedAmount,
                COUNT(*) as settlementCount
           FROM partner_ledger pl
           JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
          WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
            AND COALESCE(pl.debit, 0) > 0${ledgerDateFilter.sql}
          GROUP BY spl.storePartnerId`,
        ledgerDateFilter.params,
      );
      for (const entry of phoneLedgerRows as any[]) {
        const storePartnerId = Number(entry.storePartnerId || 0);
        if (!storePartnerId) continue;
        const amount = Number(entry.receivedAmount) || 0;
        const count = Number(entry.settlementCount) || 0;
        const prev =
          transactionMap.get(storePartnerId) || emptySettlementAggregation();
        prev.receivedAmount += amount;
        prev.phoneSpecificReceivedAmount += amount;
        prev.phoneSpecificSettlementCount += count;
        recalcSettlementNet(prev);
        transactionMap.set(storePartnerId, prev);
      }
    }
  } catch (error) {
    console.warn(
      "Phone-specific partner settlement reconciliation skipped:",
      (error as any)?.message || error,
    );
  }

  for (const row of rows) {
    const tx =
      transactionMap.get(Number(row.storePartnerId)) ||
      emptySettlementAggregation();
    row.paidSettlementAmount = tx.paidAmount;
    row.receivedSettlementAmount = tx.receivedAmount;
    row.netSettledAmount = tx.netSettledAmount;
    row.phoneSpecificSettlementAmount = tx.phoneSpecificReceivedAmount;
    row.phoneSpecificSettlementCount = tx.phoneSpecificSettlementCount;
    row.remainingSettlementBalance =
      row.settlementEntitlement + tx.paidAmount - tx.receivedAmount;
    row.remainingSettlementStatus =
      row.remainingSettlementBalance > 0.5
        ? "creditor"
        : row.remainingSettlementBalance < -0.5
          ? "debtor"
          : "settled";
  }

  const reconciliationTolerance = 1;
  const settlementAuditIssues: any[] = [];
  const settlementAuditChecks: any[] = [];
  const settlementAuditActionMap: Record<
    string,
    {
      recommendedAction: string;
      actionPath: string;
      actionLabel: string;
      affectedArea: string;
    }
  > = {
    missing_legacy_link: {
      recommendedAction:
        "این شریک را در ساختار شرکا به همکار قدیمی دارای سوابق گوشی یا لوازم وصل کن تا PartnerDetail و گزارش مرکزی از یک منبع بخوانند.",
      actionPath: "/settings/store-ownership?tab=partners#partners-bootstrap",
      actionLabel: "رفتن به اتصال شرکا",
      affectedArea: "Settings → ساختار شرکا",
    },
    orphan_phone_settlement_ledger: {
      recommendedAction:
        "پرداخت گوشی‌محور در ledger به همکار قدیمی وصل است، اما آن همکار هنوز در ساختار شرکا لینک نشده؛ از بخش اتصال شرکا همان همکار را به شریک فروشگاه وصل کن.",
      actionPath: "/settings/store-ownership?tab=partners#partners-bootstrap",
      actionLabel: "رفع لینک همکار قدیمی",
      affectedArea: "Settings → شرکا",
    },
    phone_ledger_delta: {
      recommendedAction:
        "لینک همکارهای قدیمی و پرداخت‌های گوشی‌محور همین شریک را کنترل کن؛ اختلاف معمولاً از لینک اشتباه، پرداخت خارج از بازه یا ثبت دوباره پرداخت ایجاد می‌شود.",
      actionPath: "/settings/store-ownership?tab=partners#partners-list",
      actionLabel: "بررسی لینک‌های شریک",
      affectedArea: "PartnerDetail / partner_ledger",
    },
    remaining_formula_delta: {
      recommendedAction:
        "گزارش را بازخوانی کن و سپس تسویه‌های ثبت‌شده، دریافتی‌ها و پرداخت‌های گوشی‌محور این شریک را کنترل کن؛ مانده باید از فرمول استحقاق + پرداختی - دریافتی به‌دست بیاید.",
      actionPath: "/reports/partners-performance?tab=settlement",
      actionLabel: "بازگشت به گزارش تسویه",
      affectedArea: "گزارش تسویه شرکا",
    },
    reconciliation_audit_skipped: {
      recommendedAction:
        "ابتدا جدول‌های ساختار شرکا و partner_ledger را بررسی کن و گزارش را دوباره بازخوانی کن؛ این هشدار یعنی Audit کامل اجرا نشده است.",
      actionPath: "/settings/store-ownership?tab=overview",
      actionLabel: "بررسی سلامت ساختار",
      affectedArea: "Audit سیستم شرکا",
    },
  };

  const pushSettlementAuditIssue = (
    storePartnerId: number | null,
    partnerName: string,
    severity: "ok" | "warning" | "error",
    code: string,
    title: string,
    expectedAmount?: number,
    actualAmount?: number,
  ) => {
    const diffAmount = Math.abs(
      (Number(expectedAmount) || 0) - (Number(actualAmount) || 0),
    );
    const action = settlementAuditActionMap[code] || {
      recommendedAction:
        "این مورد را در همان بخش ثبت اطلاعات‌شده بررسی کن و پس از اصلاح، گزارش شرکا را دوباره بازخوانی کن.",
      actionPath: "/reports/partners-performance?tab=settlement",
      actionLabel: "بررسی گزارش",
      affectedArea: "سیستم شرکا",
    };
    settlementAuditIssues.push({
      storePartnerId,
      partnerName,
      severity,
      code,
      title,
      expectedAmount: Number(expectedAmount) || 0,
      actualAmount: Number(actualAmount) || 0,
      diffAmount,
      recommendedAction: action.recommendedAction,
      actionPath: action.actionPath,
      actionLabel: action.actionLabel,
      affectedArea: action.affectedArea,
    });
  };

  try {
    const linkedLegacyRows = await allAsync(
      `SELECT sp.id as storePartnerId,
              sp.name as partnerName,
              COUNT(DISTINCT spl.legacyPartnerId) as linkedLegacyPartnersCount,
              GROUP_CONCAT(DISTINCT p.partnerName) as linkedLegacyPartnerNames
         FROM store_partners sp
         LEFT JOIN store_partner_legacy_links spl ON spl.storePartnerId = sp.id AND spl.linkType = 'owner'
         LEFT JOIN partners p ON p.id = spl.legacyPartnerId
        WHERE sp.isActive = 1
        GROUP BY sp.id, sp.name`,
      [],
    ).catch(() => [] as any[]);

    const rangePhoneLedgerFilter = buildDateRangeSql(
      "pl.transactionDate",
      range,
    );
    const rangePhoneLedgerRows = await allAsync(
      `SELECT spl.storePartnerId,
              SUM(COALESCE(pl.debit, 0)) as phoneSpecificSettlementAmount,
              COUNT(*) as phoneSpecificSettlementCount
         FROM partner_ledger pl
         JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
        WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          AND COALESCE(pl.debit, 0) > 0${rangePhoneLedgerFilter.sql}
        GROUP BY spl.storePartnerId`,
      rangePhoneLedgerFilter.params,
    ).catch(() => [] as any[]);

    const lifetimeLedgerRows = await allAsync(
      `SELECT spl.storePartnerId,
              SUM(COALESCE(pl.credit, 0) - COALESCE(pl.debit, 0)) as partnerDetailCurrentBalance,
              SUM(CASE WHEN pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL} THEN COALESCE(pl.debit, 0) ELSE 0 END) as partnerDetailPhonePaidAmount,
              COUNT(CASE WHEN pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL} AND COALESCE(pl.debit, 0) > 0 THEN 1 END) as partnerDetailPhonePaymentCount
         FROM store_partner_legacy_links spl
         LEFT JOIN partner_ledger pl ON pl.partnerId = spl.legacyPartnerId
        WHERE spl.linkType = 'owner'
        GROUP BY spl.storePartnerId`,
      [],
    ).catch(() => [] as any[]);

    const lifetimePhoneRows = await allAsync(
      `SELECT spl.storePartnerId,
              COUNT(ph.id) as soldPhonesCount,
              SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) as soldPhonesCurrentPurchaseAmount,
              SUM(COALESCE(ph.purchasePrice, 0)) as soldPhonesInitialPurchaseAmount
         FROM store_partner_legacy_links spl
         JOIN phones ph ON ph.supplierId = spl.legacyPartnerId
        WHERE spl.linkType = 'owner'
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        GROUP BY spl.storePartnerId`,
      [],
    ).catch(() => [] as any[]);

    const orphanPhoneLedgerRow = await getAsync(
      `SELECT COUNT(*) as count,
              SUM(COALESCE(pl.debit, 0)) as amount
         FROM partner_ledger pl
         LEFT JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = pl.partnerId AND spl.linkType = 'owner'
        WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          AND COALESCE(pl.debit, 0) > 0
          AND spl.storePartnerId IS NULL`,
      [],
    ).catch(() => ({ count: 0, amount: 0 }) as any);

    const linkedMap = new Map(
      (linkedLegacyRows as any[]).map((entry) => [
        Number(entry.storePartnerId),
        entry,
      ]),
    );
    const rangeLedgerMap = new Map(
      (rangePhoneLedgerRows as any[]).map((entry) => [
        Number(entry.storePartnerId),
        entry,
      ]),
    );
    const lifetimeLedgerMap = new Map(
      (lifetimeLedgerRows as any[]).map((entry) => [
        Number(entry.storePartnerId),
        entry,
      ]),
    );
    const lifetimePhoneMap = new Map(
      (lifetimePhoneRows as any[]).map((entry) => [
        Number(entry.storePartnerId),
        entry,
      ]),
    );

    for (const row of rows) {
      const storePartnerId = Number(row.storePartnerId || 0);
      const partnerName = String(row.partnerName || "شریک");
      const linked = linkedMap.get(storePartnerId) || {};
      const rangeLedger = rangeLedgerMap.get(storePartnerId) || {};
      const lifetimeLedger = lifetimeLedgerMap.get(storePartnerId) || {};
      const lifetimePhones = lifetimePhoneMap.get(storePartnerId) || {};
      const centralPhoneAmount = Number(row.phoneSpecificSettlementAmount) || 0;
      const rangeLedgerPhoneAmount =
        Number((rangeLedger as any).phoneSpecificSettlementAmount) || 0;
      const formulaRemaining =
        (Number(row.settlementEntitlement) || 0) +
        (Number(row.paidSettlementAmount) || 0) -
        (Number(row.receivedSettlementAmount) || 0);
      const remainingDelta = Math.abs(
        formulaRemaining - (Number(row.remainingSettlementBalance) || 0),
      );
      const phoneLedgerDelta = Math.abs(
        centralPhoneAmount - rangeLedgerPhoneAmount,
      );
      const lifetimeSoldPhoneCurrentPurchase =
        Number((lifetimePhones as any).soldPhonesCurrentPurchaseAmount) || 0;
      const lifetimePhonePaid =
        Number((lifetimeLedger as any).partnerDetailPhonePaidAmount) || 0;
      const lifetimePhoneBalance =
        lifetimeSoldPhoneCurrentPurchase - lifetimePhonePaid;

      const check = {
        storePartnerId,
        partnerName,
        linkedLegacyPartnersCount:
          Number((linked as any).linkedLegacyPartnersCount) || 0,
        linkedLegacyPartnerNames: String(
          (linked as any).linkedLegacyPartnerNames || "",
        )
          .split(",")
          .filter(Boolean),
        rangeCentralPhoneSettlementAmount: centralPhoneAmount,
        rangeLedgerPhoneSettlementAmount: rangeLedgerPhoneAmount,
        rangePhoneSettlementDelta: centralPhoneAmount - rangeLedgerPhoneAmount,
        formulaRemainingBalance: formulaRemaining,
        reportedRemainingBalance: Number(row.remainingSettlementBalance) || 0,
        remainingBalanceDelta:
          formulaRemaining - (Number(row.remainingSettlementBalance) || 0),
        partnerDetailLifetime: {
          soldPhonesCount: Number((lifetimePhones as any).soldPhonesCount) || 0,
          soldPhonesCurrentPurchaseAmount: lifetimeSoldPhoneCurrentPurchase,
          soldPhonesInitialPurchaseAmount:
            Number((lifetimePhones as any).soldPhonesInitialPurchaseAmount) ||
            0,
          phoneSettlementPaidAmount: lifetimePhonePaid,
          phoneSettlementPaymentCount:
            Number((lifetimeLedger as any).partnerDetailPhonePaymentCount) || 0,
          phoneSettlementBalance: lifetimePhoneBalance,
          currentLedgerBalance:
            Number((lifetimeLedger as any).partnerDetailCurrentBalance) || 0,
        },
        status: "ok",
        notes: [] as string[],
      };

      if (!check.linkedLegacyPartnersCount) {
        check.status = "warning";
        check.notes.push(
          "این شریک به همکار قدیمی وصل نیست؛ بنابراین PartnerDetail و گزارش مرکزی نمی‌توانند کامل با هم reconcile شوند.",
        );
        pushSettlementAuditIssue(
          storePartnerId,
          partnerName,
          "warning",
          "missing_legacy_link",
          "لینک همکار قدیمی برای این شریک تعریف نشده است.",
        );
      }
      if (phoneLedgerDelta > reconciliationTolerance) {
        check.status = "error";
        check.notes.push(
          "مبلغ تسویه گوشی‌محور در گزارش مرکزی با دفتر partner_ledger یکسان نیست.",
        );
        pushSettlementAuditIssue(
          storePartnerId,
          partnerName,
          "error",
          "phone_ledger_delta",
          "اختلاف بین گزارش مرکزی و ledger در تسویه گوشی‌محور",
          rangeLedgerPhoneAmount,
          centralPhoneAmount,
        );
      }
      if (remainingDelta > reconciliationTolerance) {
        check.status = "error";
        check.notes.push("فرمول مانده نهایی با مقدار گزارش‌شده یکسان نیست.");
        pushSettlementAuditIssue(
          storePartnerId,
          partnerName,
          "error",
          "remaining_formula_delta",
          "اختلاف فرمول مانده نهایی تسویه",
          formulaRemaining,
          Number(row.remainingSettlementBalance) || 0,
        );
      }
      settlementAuditChecks.push(check);
    }

    const orphanPhoneSettlementCount =
      Number((orphanPhoneLedgerRow as any)?.count) || 0;
    const orphanPhoneSettlementAmount =
      Number((orphanPhoneLedgerRow as any)?.amount) || 0;
    if (orphanPhoneSettlementCount > 0) {
      pushSettlementAuditIssue(
        null,
        "بدون لینک شریک",
        "warning",
        "orphan_phone_settlement_ledger",
        "پرداخت گوشی‌محور در ledger وجود دارد اما به ساختار شرکای فروشگاه وصل نیست.",
        orphanPhoneSettlementAmount,
        0,
      );
    }
  } catch (error) {
    pushSettlementAuditIssue(
      null,
      "سیستم",
      "warning",
      "reconciliation_audit_skipped",
      `کنترل عددی شرکا کامل اجرا نشد: ${(error as any)?.message || error}`,
    );
  }

  if (
    !rows.length ||
    rows.every(
      (row) =>
        !(Number(row.settlementEntitlement) || 0) &&
        !(Number(row.inventoryValue) || 0) &&
        !(Number(row.capitalReturnAmount) || 0) &&
        !(Number(row.recognizedProfit) || 0),
    )
  ) {
    return buildLegacySettlementReportFromDb(range);
  }

  const totals = {
    totalSettlementEntitlement: rows.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlement) || 0),
      0,
    ),
    totalCapitalReturnAmount: rows.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    totalOwnerGainAmount: rows.reduce(
      (sum, row) => sum + (Number(row.ownerGainAmount) || 0),
      0,
    ),
    totalSharedProfitAmount: rows.reduce(
      (sum, row) => sum + (Number(row.sharedProfitAmount) || 0),
      0,
    ),
    totalRecognizedProfit: rows.reduce(
      (sum, row) => sum + (Number(row.recognizedProfit) || 0),
      0,
    ),
    totalInventoryValue: rows.reduce(
      (sum, row) => sum + (Number(row.inventoryValue) || 0),
      0,
    ),
    totalPhoneInventoryValue: rows.reduce(
      (sum, row) => sum + (Number(row.phoneInventoryValue) || 0),
      0,
    ),
    totalAccessoryInventoryValue: rows.reduce(
      (sum, row) => sum + (Number(row.accessoryInventoryValue) || 0),
      0,
    ),
    totalPaidSettlements: rows.reduce(
      (sum, row) => sum + (Number(row.paidSettlementAmount) || 0),
      0,
    ),
    totalReceivedSettlements: rows.reduce(
      (sum, row) => sum + (Number(row.receivedSettlementAmount) || 0),
      0,
    ),
    totalPhoneSpecificSettlements: rows.reduce(
      (sum, row) => sum + (Number(row.phoneSpecificSettlementAmount) || 0),
      0,
    ),
  };

  const reconciliation = {
    status: settlementAuditIssues.some((issue) => issue.severity === "error")
      ? "error"
      : settlementAuditIssues.some((issue) => issue.severity === "warning")
        ? "warning"
        : "ok",
    tolerance: reconciliationTolerance,
    checkedPartnersCount: settlementAuditChecks.length,
    issueCount: settlementAuditIssues.length,
    warningCount: settlementAuditIssues.filter(
      (issue) => issue.severity === "warning",
    ).length,
    errorCount: settlementAuditIssues.filter(
      (issue) => issue.severity === "error",
    ).length,
    phoneLedgerRangeAmount: settlementAuditChecks.reduce(
      (sum, row) => sum + (Number(row.rangeLedgerPhoneSettlementAmount) || 0),
      0,
    ),
    phoneLedgerCentralAmount: settlementAuditChecks.reduce(
      (sum, row) => sum + (Number(row.rangeCentralPhoneSettlementAmount) || 0),
      0,
    ),
    phoneLedgerDeltaAmount: settlementAuditChecks.reduce(
      (sum, row) => sum + Math.abs(Number(row.rangePhoneSettlementDelta) || 0),
      0,
    ),
    checks: settlementAuditChecks,
    issues: settlementAuditIssues,
  };

  const settlements = rows
    .sort(
      (a, b) =>
        Math.abs(Number(b.remainingSettlementBalance) || 0) -
        Math.abs(Number(a.remainingSettlementBalance) || 0),
    )
    .map((row) => ({
      ...row,
      settlementBalance: Number(row.settlementBalance) || 0,
      paidSettlementAmount: Number(row.paidSettlementAmount) || 0,
      receivedSettlementAmount: Number(row.receivedSettlementAmount) || 0,
      netSettledAmount: Number(row.netSettledAmount) || 0,
      remainingSettlementBalance: Number(row.remainingSettlementBalance) || 0,
    }));

  return {
    profile: defaultProfile
      ? { id: Number(defaultProfile.id), title: defaultProfile.title }
      : { id: null, title: "تقسیم مساوی بین شرکای فعال" },
    partners,
    settlements,
    transactions,
    totals,
    reconciliation,
  };
};

export const getPartnerPhonesReportFromDb = async (
  range: PartnerReportRange & { partnerId: number },
): Promise<any> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return buildLegacyPhonesReportFromDb(range);
  const partnerId = Number(range.partnerId) || 0;
  const partner = await getAsync(
    `SELECT id, name, colorTag, notes FROM store_partners WHERE id = ?`,
    [partnerId],
  );
  if (!partner) return buildLegacyPhonesReportFromDb(range);

  const purchaseFilter = buildDateRangeSql("ph.purchaseDate", range);
  const purchaseRows = await allAsync(
    `SELECT ph.id as phoneId, ph.purchaseDate, ph.saleDate, ph.model, ph.imei, ph.purchasePrice, ph.status,
            COALESCE(opi.sharePercent, 0) as sharePercent
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId AND opi.storePartnerId = ?
      WHERE 1 = 1${purchaseFilter.sql}
      ORDER BY ph.purchaseDate DESC, ph.id DESC`,
    [partnerId].concat(purchaseFilter.params as any),
  );

  const purchases = (purchaseRows as any[]).map((row) => {
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      phoneId: Number(row.phoneId),
      purchaseDate: row.purchaseDate,
      saleDate: row.saleDate,
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedPurchaseAmount: purchasePrice * (sharePercent / 100),
      status: row.status,
      documentKey: `PH-${row.phoneId}`,
    };
  });

  const salesFilter = buildDateRangeSql("sps.saleDate", range);
  const salesRows = await allAsync(
    `SELECT sps.id as snapshotId, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId,
            sps.itemId as phoneId, sps.itemDescription, sps.quantity, sps.saleAmount,
            sps.initialCostAmount, sps.marketCostAmount, sps.ownerGainAmount as snapshotOwnerGainAmount,
            sps.sharedProfitAmount as snapshotSharedProfitAmount, sps.totalProfitAmount,
            ph.model, ph.imei,
            COALESCE(opi.sharePercent, 0) as ownershipSharePercent,
            SUM(CASE WHEN spa.allocationType = 'owner_gain' THEN spa.amount ELSE 0 END) as partnerOwnerGainAmount,
            SUM(CASE WHEN spa.allocationType = 'shared_profit' THEN spa.amount ELSE 0 END) as partnerSharedProfitAmount,
            SUM(spa.amount) as partnerTotalProfitAmount
       FROM sale_profit_snapshots sps
       JOIN sale_profit_allocations spa ON spa.snapshotId = sps.id AND spa.storePartnerId = ? AND spa.sourceStatus = 'active'
       LEFT JOIN phones ph ON ph.id = sps.itemId
       LEFT JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId AND opi.storePartnerId = ?
      WHERE sps.sourceStatus = 'active'
        AND sps.itemType = 'phone'${salesFilter.sql}
      GROUP BY sps.id, sps.saleDate, sps.sourceKind, sps.sourceId, sps.sourceItemId, sps.itemId, sps.itemDescription,
               sps.quantity, sps.saleAmount, sps.initialCostAmount, sps.marketCostAmount, sps.ownerGainAmount,
               sps.sharedProfitAmount, sps.totalProfitAmount, ph.model, ph.imei, opi.sharePercent
      ORDER BY sps.saleDate DESC, sps.id DESC`,
    [partnerId, partnerId].concat(salesFilter.params as any),
  );

  const sales = (salesRows as any[]).map((row) => {
    const saleAmount = Number(row.saleAmount) || 0;
    const ownershipSharePercent = Number(row.ownershipSharePercent) || 0;
    return {
      snapshotId: Number(row.snapshotId),
      saleDate: row.saleDate,
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      phoneId: Number(row.phoneId) || null,
      model: row.model || row.itemDescription,
      imei: row.imei || "-",
      grossSaleAmount: saleAmount,
      initialCostAmount: Number(row.initialCostAmount) || 0,
      marketCostAmount: Number(row.marketCostAmount) || 0,
      ownershipSharePercent,
      attributedSaleAmount: saleAmount * (ownershipSharePercent / 100),
      capitalReturnAmount:
        (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100),
      ownerGainAmount: Number(row.partnerOwnerGainAmount) || 0,
      sharedProfitAmount: Number(row.partnerSharedProfitAmount) || 0,
      totalProfitAmount: Number(row.partnerTotalProfitAmount) || 0,
      settlementEntitlementAmount:
        (Number(row.initialCostAmount) || 0) * (ownershipSharePercent / 100) +
        (Number(row.partnerTotalProfitAmount) || 0),
      documentKey:
        row.sourceKind === "sales_order"
          ? `INV-${row.sourceId}`
          : `INS-${row.sourceId}`,
    };
  });

  const currentInventoryRows = await allAsync(
    `SELECT ph.id as phoneId, ph.model, ph.imei, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as purchasePrice, ph.status, COALESCE(opi.sharePercent, 0) as sharePercent
       FROM phones ph
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId AND opi.storePartnerId = ?
      WHERE ph.status IN ('in_stock', 'pending', 'reserved')
      ORDER BY ph.registerDate DESC, ph.id DESC`,
    [partnerId],
  );

  const currentInventory = (currentInventoryRows as any[]).map((row) => {
    const purchasePrice = Number(row.purchasePrice) || 0;
    const sharePercent = Number(row.sharePercent) || 0;
    return {
      phoneId: Number(row.phoneId),
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedValue: purchasePrice * (sharePercent / 100),
      status: row.status,
    };
  });

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.purchasePrice) || 0),
      0,
    ),
    purchasesAttributedAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.attributedPurchaseAmount) || 0),
      0,
    ),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce(
      (sum, row) => sum + (Number(row.grossSaleAmount) || 0),
      0,
    ),
    salesAttributedAmount: sales.reduce(
      (sum, row) => sum + (Number(row.attributedSaleAmount) || 0),
      0,
    ),
    capitalReturnAmount: sales.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    ownerGainAmount: sales.reduce(
      (sum, row) => sum + (Number(row.ownerGainAmount) || 0),
      0,
    ),
    sharedProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.sharedProfitAmount) || 0),
      0,
    ),
    totalProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.totalProfitAmount) || 0),
      0,
    ),
    settlementEntitlementAmount: sales.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0),
      0,
    ),
    currentInventoryCount: currentInventory.length,
    currentInventoryValue: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedValue) || 0),
      0,
    ),
  };

  const shouldFallback =
    !purchases.length && !sales.length && !currentInventory.length;
  if (shouldFallback) return buildLegacyPhonesReportFromDb(range);
  return {
    partner: {
      storePartnerId: Number(partner.id),
      partnerName: partner.name,
      colorTag: partner.colorTag || null,
    },
    summary,
    purchases,
    sales,
    currentInventory,
  };
};

export { getDashboardSalesChartData } from "../dashboardReports.db";
export { getPartnerProfitReportFromDb } from "../profitSnapshots.db";
