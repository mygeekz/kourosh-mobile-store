import type { Express } from "express";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../database";

type AuthorizeRole = (roles: string[]) => any;

type ReportCurrencyContract = {
  currencyBase: string;
  displayCurrency: string;
  moneyDivisor: number;
};

export type CompareSalesReportRoutesDeps = {
  authorizeRole: AuthorizeRole;
  sanitizeJalali: (input: unknown) => string;
  getSalesSummaryAndProfit: (fromDate: string, toDate: string) => Promise<any>;
};

export type ProductSalesSummaryReportRoutesDeps = {
  authorizeRole: AuthorizeRole;
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
  buildRealizedProfitRecognitionReport: (
    fromISO: string,
    toISO: string,
  ) => Promise<any>;
  buildProductSalesCollectionsReport: (
    fromISO: string,
    toISO: string,
  ) => Promise<any>;
  reportCurrencyContract: ReportCurrencyContract;
};

export type ProductSalesDetailsReportRoutesDeps = {
  authorizeRole: AuthorizeRole;
  buildProductSalesCollectionsReport: (
    fromISO: string,
    toISO: string,
  ) => Promise<any>;
  matchesProductSalesDetailsQuery: (row: any, query: string) => boolean;
  getProductSalesDetailsDiscountAudit: (row: any) => any;
  summarizeProductSalesDetailsRows: (rows: any[]) => any;
  buildProductSalesDetailsTopProducts: (rows: any[]) => any[];
  buildProductSalesCalculationHealth: (
    rows: any[],
    docs: any[],
    allRowsForCompleteness?: any[],
  ) => any;
  buildProductSalesCollectionRisk: (
    rows: any[],
    docs: any[],
  ) => Promise<any>;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];
const SALES_REPORT_ROLES = ["Admin", "Manager", "Salesperson"];


const SALES_LEDGER_CUMULATIVE_START = "1900-01-01T00:00:00.000Z";

const normalizeReportDateOnly = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const converted = raw.includes("/") ? fromShamsiStringToISO(raw) : raw;
  const parsed = moment(String(converted || raw));
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const isReportDateInsideRange = (value: unknown, fromISO: string, toISO: string): boolean => {
  const date = normalizeReportDateOnly(value);
  const from = normalizeReportDateOnly(fromISO);
  const to = normalizeReportDateOnly(toISO);
  return Boolean(date && from && to && date >= from && date <= to);
};

const classifySalesLedgerItemGroup = (rows: any[]): "phone" | "accessories" | "service" | "mixed" => {
  const types = new Set(
    rows
      .map((row) => String(row?.itemType || "").trim())
      .filter(Boolean),
  );
  if (types.size !== 1) return "mixed";
  const [onlyType] = Array.from(types);
  if (onlyType === "phone") return "phone";
  if (onlyType === "service") return "service";
  return "accessories";
};

const normalizeLegacySalesPaymentType = (value: unknown): "cash" | "credit" =>
  String(value || "").trim().toLowerCase() === "credit" ? "credit" : "cash";

const parseLegacySaleReceiptReference = (row: any): number => {
  const referenceType = String(row?.referenceType || "").trim().toLowerCase();
  const referenceId = Number(row?.referenceId || 0);
  if (
    referenceId > 0 &&
    (referenceType.includes("sales_transaction") ||
      referenceType.includes("legacy_sale") ||
      referenceType.includes("direct_sale"))
  ) {
    return referenceId;
  }
  if (referenceType) return 0;
  const description = String(row?.description || "");
  // A receipt that explicitly names an invoice belongs to sales_orders and must
  // not be allocated again to a legacy sale even when both numeric IDs collide.
  if (/(?:فاکتور(?:\s*فروش)?|invoice)\s*(?:شماره|#)?\s*\d+/i.test(description)) {
    return 0;
  }
  return Number(
    description.match(/شناسه\s*فروش(?:\s*مستقیم)?\s*[:：]?\s*(\d+)/i)?.[1] ||
      description.match(/(?:legacy|direct)\s*sale\s*(?:id|#)?\s*[:：]?\s*(\d+)/i)?.[1] ||
      0,
  );
};

type ExactSalesLedgerRecognition = {
  received: number;
  fullProfit: number;
  realizedProfit: number;
  unrealizedProfit: number;
};

/**
 * Exact cash-basis recognition for the comprehensive sales ledger.
 * Collected money first recovers the recorded purchase cost; only the excess is
 * recognized as collected profit. This avoids artificial proportional values
 * such as 5,333,333 when every source amount is stored as an exact toman value.
 */
export const calculateExactSalesLedgerProfitRecognition = (
  saleTotalValue: unknown,
  purchaseTotalValue: unknown,
  collectedAmountValue: unknown,
): ExactSalesLedgerRecognition => {
  const saleTotal = Math.max(0, Number(saleTotalValue || 0));
  const purchaseTotal = Math.max(0, Number(purchaseTotalValue || 0));
  const received = Math.min(
    saleTotal,
    Math.max(0, Number(collectedAmountValue || 0)),
  );
  const fullProfit = saleTotal - purchaseTotal;

  if (fullProfit < 0) {
    // The loss is fixed at the sale date; collection timing must not hide it.
    return {
      received,
      fullProfit,
      realizedProfit: fullProfit,
      unrealizedProfit: 0,
    };
  }

  const realizedProfit = Math.min(
    fullProfit,
    Math.max(0, received - purchaseTotal),
  );
  return {
    received,
    fullProfit,
    realizedProfit,
    unrealizedProfit: fullProfit - realizedProfit,
  };
};

export const allocateSequentialAmount = (
  totalValue: unknown,
  capacities: unknown[],
): number[] => {
  let remaining = Math.max(0, Number(totalValue || 0));
  return capacities.map((capacityValue) => {
    const capacity = Math.max(0, Number(capacityValue || 0));
    const allocated = Math.min(capacity, remaining);
    remaining -= allocated;
    return allocated;
  });
};

const summarizeSalesLedgerRows = (rows: any[]) => {
  const emptyPaymentBucket = () => ({
    documentsCount: 0,
    totalPurchase: 0,
    totalSales: 0,
    totalProfit: 0,
    collectedSales: 0,
    outstandingSales: 0,
    realizedProfit: 0,
    unrealizedProfit: 0,
  });
  const summary: any = {
    documentsCount: 0,
    totalPurchase: 0,
    totalSales: 0,
    totalProfit: 0,
    collectedSales: 0,
    outstandingSales: 0,
    realizedProfit: 0,
    unrealizedProfit: 0,
    byPaymentType: {
      cash: emptyPaymentBucket(),
      credit: emptyPaymentBucket(),
      installment: emptyPaymentBucket(),
    },
  };

  for (const row of rows) {
    const paymentType = ["cash", "credit", "installment"].includes(String(row.paymentType))
      ? String(row.paymentType)
      : "cash";
    const bucket = summary.byPaymentType[paymentType];
    const values = {
      totalPurchase: Number(row.purchaseTotal || 0),
      totalSales: Number(row.saleTotal || 0),
      totalProfit: Number(row.totalProfit || 0),
      collectedSales: Number(row.collectedAmount || 0),
      outstandingSales: Number(row.outstandingAmount || 0),
      realizedProfit: Number(row.realizedProfit || 0),
      unrealizedProfit: Number(row.unrealizedProfit || 0),
    };
    summary.documentsCount += 1;
    bucket.documentsCount += 1;
    for (const [key, value] of Object.entries(values)) {
      summary[key] += Number(value || 0);
      bucket[key] += Number(value || 0);
    }
  }

  return summary;
};

export const registerCompareSalesReportRoutes = (
  app: Express,
  {
    authorizeRole,
    sanitizeJalali,
    getSalesSummaryAndProfit,
  }: CompareSalesReportRoutesDeps,
): void => {
  app.get(
    "/api/reports/compare-sales",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const mFrom = moment(
          sanitizeJalali((req.query as any)?.fromDate),
          "jYYYY/jMM/jDD",
          true,
        );
        const mTo = moment(
          sanitizeJalali((req.query as any)?.toDate),
          "jYYYY/jMM/jDD",
          true,
        );
        if (!mFrom.isValid() || !mTo.isValid() || mTo.isBefore(mFrom, "day")) {
          return res
            .status(400)
            .json({ success: false, message: "فرمت تاریخ نامعتبر است." });
        }
        const baseline = (req.query as any)?.baseline as
          | "prev"
          | "last_year"
          | undefined;
        let prevFrom = mFrom.clone();
        let prevTo = mTo.clone();
        if (baseline === "last_year") {
          // مقایسه با همین بازه در سال قبل (سال شمسی)
          prevFrom = mFrom.clone().subtract(1, "jYear");
          prevTo = mTo.clone().subtract(1, "jYear");
        } else {
          // مقایسه با بازه‌ی قبلی مشابه از لحاظ تعداد روز
          const days = mTo.diff(mFrom, "days") + 1; // طول بازه جاری
          prevTo = mFrom.clone().subtract(1, "day");
          prevFrom = prevTo.clone().subtract(days - 1, "days");
        }
        const currentSummary = await getSalesSummaryAndProfit(
          mFrom.format("jYYYY/jMM/jDD"),
          mTo.format("jYYYY/jMM/jDD"),
        );
        const previousSummary = await getSalesSummaryAndProfit(
          prevFrom.format("jYYYY/jMM/jDD"),
          prevTo.format("jYYYY/jMM/jDD"),
        );
        const pickAmount = (obj: any): number => {
          const keys = [
            "totalRevenue",
            "revenue",
            "totalSales",
            "salesAmount",
            "total",
            "sum",
          ];
          if (!obj) return 0;
          for (const k of keys) {
            if (typeof obj?.[k] === "number") return obj[k];
          }
          if (Array.isArray(obj) && obj.length) {
            for (const k of keys) {
              if (typeof obj[0]?.[k] === "number") return obj[0][k];
            }
          }
          return 0;
        };
        const currentProfit =
          typeof (currentSummary as any)?.grossProfit === "number"
            ? (currentSummary as any).grossProfit
            : 0;
        const previousProfit =
          typeof (previousSummary as any)?.grossProfit === "number"
            ? (previousSummary as any).grossProfit
            : 0;
        const profitChange =
          previousProfit === 0
            ? null
            : ((currentProfit - previousProfit) / previousProfit) * 100;
        const currentAmount = pickAmount(currentSummary);
        const previousAmount = pickAmount(previousSummary);
        const percentageChange =
          previousAmount === 0
            ? null
            : ((currentAmount - previousAmount) / previousAmount) * 100;
        res.json({
          success: true,
          data: {
            currentAmount,
            previousAmount,
            percentageChange,
            currentProfit,
            previousProfit,
            profitChange,
            currentRange: {
              from: mFrom.format("jYYYY/jMM/jDD"),
              to: mTo.format("jYYYY/jMM/jDD"),
            },
            previousRange: {
              from: prevFrom.format("jYYYY/jMM/jDD"),
              to: prevTo.format("jYYYY/jMM/jDD"),
            },
            baseline: baseline === "last_year" ? "last_year" : "prev",
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};

export const registerProductSalesSummaryReportRoutes = (
  app: Express,
  {
    authorizeRole,
    allAsync,
    buildRealizedProfitRecognitionReport,
    buildProductSalesCollectionsReport,
    reportCurrencyContract,
  }: ProductSalesSummaryReportRoutesDeps,
): void => {
  app.get(
    "/api/reports/realized-profit",
    authorizeRole(SALES_REPORT_ROLES),
    async (req, res, next) => {
      try {
        const nowJ = moment().locale("fa");
        const rawFrom = String(
          req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const rawTo = String(
          req.query.to || nowJ.clone().endOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const fromISO = rawFrom.includes("/")
          ? fromShamsiStringToISO(rawFrom)
          : moment(rawFrom).toDate().toISOString();
        const toISO = rawTo.includes("/")
          ? fromShamsiStringToISO(rawTo)
          : moment(rawTo).toDate().toISOString();
        if (
          !fromISO ||
          !toISO ||
          !moment(fromISO).isValid() ||
          !moment(toISO).isValid()
        ) {
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        }
        const data = await buildRealizedProfitRecognitionReport(fromISO, toISO);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/all-sales-ledger",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const nowJ = moment().locale("fa");
        const fromJ = String(
          req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const toJ = String(
          req.query.to || nowJ.clone().endOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const fromISO = fromShamsiStringToISO(fromJ);
        const toISO = fromShamsiStringToISO(toJ);
        if (!fromISO || !toISO || moment(toISO).isBefore(moment(fromISO), "day")) {
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        }

        // بازه انتخابی فقط تاریخ فروش را محدود می‌کند. وضعیت وصول هر فروش
        // به‌صورت تجمعی تا پایان بازه محاسبه می‌شود تا فروش اعتباری و اقساطی
        // با سود وصول‌شده و وصول‌نشده واقعی نمایش داده شود.
        const recognitionReport = await buildRealizedProfitRecognitionReport(
          SALES_LEDGER_CUMULATIVE_START,
          toISO,
        );
        const allDocs = Array.isArray(recognitionReport?.docs)
          ? recognitionReport.docs
          : [];
        const allLines = Array.isArray(recognitionReport?.rows)
          ? recognitionReport.rows
          : [];
        const installmentDateRows = await allAsync(
          `SELECT id, saleDate, dateCreated, installmentsStartDate
             FROM installment_sales`,
          [],
        ).catch(() => []);
        const installmentSaleDateById = new Map(
          installmentDateRows.map((row: any) => [
            Number(row?.id || 0),
            normalizeReportDateOnly(
              row?.saleDate || row?.dateCreated || row?.installmentsStartDate,
            ),
          ]),
        );
        const normalizedDocs = allDocs.map((doc: any) => {
          const sourceType = String(doc?.sourceType || "invoice");
          const actualTransactionDate =
            sourceType === "installment"
              ? installmentSaleDateById.get(Number(doc?.orderId || 0)) ||
                normalizeReportDateOnly(doc?.transactionDate)
              : normalizeReportDateOnly(doc?.transactionDate);
          return {
            ...doc,
            transactionDate: actualTransactionDate || String(doc?.transactionDate || ""),
          };
        });
        const selectedDocs = normalizedDocs.filter((doc: any) =>
          isReportDateInsideRange(doc?.transactionDate, fromISO, toISO),
        );
        const selectedDocKeys = new Set(
          selectedDocs.map((doc: any) => String(doc?.docKey || "")),
        );
        const linesByDocKey = new Map<string, any[]>();
        for (const line of allLines) {
          const docKey = String(line?.docKey || "");
          if (!docKey || !selectedDocKeys.has(docKey)) continue;
          const rows = linesByDocKey.get(docKey) || [];
          rows.push(line);
          linesByDocKey.set(docKey, rows);
        }

        const documentRows = selectedDocs.map((doc: any) => {
          const docKey = String(doc?.docKey || "");
          const itemRows = linesByDocKey.get(docKey) || [];
          const saleTotal = Number(doc?.contractualTotal || 0);
          const purchaseTotal = Number(doc?.contractualCost || 0);
          const totalProfit = saleTotal - purchaseTotal;
          const collectedAmount = Math.min(
            Math.max(0, saleTotal),
            Math.max(0, Number(doc?.receivedInRange || 0)),
          );
          const outstandingAmount = Math.max(0, saleTotal - collectedAmount);
          const recognition = calculateExactSalesLedgerProfitRecognition(
            saleTotal,
            purchaseTotal,
            collectedAmount,
          );
          const realizedProfit = recognition.realizedProfit;
          const unrealizedProfit = recognition.unrealizedProfit;
          const itemSaleTotals = itemRows.map((line: any) =>
            Math.max(0, Number(line?.lineTotal || 0)),
          );
          const itemCollectedAmounts = allocateSequentialAmount(
            collectedAmount,
            itemSaleTotals,
          );
          const positiveItemProfits = itemRows.map((line: any) =>
            Math.max(
              0,
              Number(line?.lineTotal || 0) - Number(line?.lineCost || 0),
            ),
          );
          const itemRealizedProfits = allocateSequentialAmount(
            Math.max(0, realizedProfit),
            positiveItemProfits,
          );
          const negativeItemLosses = itemRows.map((line: any) =>
            Math.abs(
              Math.min(
                0,
                Number(line?.lineTotal || 0) - Number(line?.lineCost || 0),
              ),
            ),
          );
          const itemRealizedLosses = allocateSequentialAmount(
            Math.abs(Math.min(0, realizedProfit)),
            negativeItemLosses,
          );
          const collectionStatus =
            saleTotal <= 0 || collectedAmount <= 0
              ? "uncollected"
              : outstandingAmount <= 0.000001
                ? "collected"
                : "partial";
          const missingCostItems = itemRows.filter((line: any) =>
            String(line?.itemType || "") !== "service" &&
            Number(line?.lineTotal || 0) > 0 &&
            Number(line?.lineCost || 0) <= 0,
          ).length;

          return {
            docKey,
            sourceType: String(doc?.sourceType || "invoice"),
            orderId: Number(doc?.orderId || 0),
            transactionDate: String(doc?.transactionDate || ""),
            customerName: doc?.customerName ? String(doc.customerName) : null,
            paymentType: ["cash", "credit", "installment"].includes(
              String(doc?.paymentType || ""),
            )
              ? String(doc.paymentType)
              : "cash",
            itemGroup: classifySalesLedgerItemGroup(itemRows),
            itemsSummary: String(
              doc?.itemsSummary || doc?.primaryItemName || "سند فروش",
            ),
            itemsCount: Number(doc?.itemsCount || itemRows.length || 0),
            purchaseTotal,
            saleTotal,
            totalProfit,
            collectedAmount,
            outstandingAmount,
            collectionRate:
              saleTotal > 0 ? (collectedAmount / saleTotal) * 100 : 0,
            realizedProfit,
            unrealizedProfit,
            collectionStatus,
            missingCostItems,
            detailHref:
              doc?.detailHref ||
              (String(doc?.sourceType || "") === "installment"
                ? `/installment-sales/${Number(doc?.orderId || 0)}`
                : `/invoices/${Number(doc?.orderId || 0)}`),
            items: itemRows.map((line: any, lineIndex: number) => {
              const lineSaleTotal = Number(line?.lineTotal || 0);
              const linePurchaseTotal = Number(line?.lineCost || 0);
              const lineProfit = lineSaleTotal - linePurchaseTotal;
              const lineRealizedProfit = lineProfit < 0
                ? -Number(itemRealizedLosses[lineIndex] || 0)
                : Number(itemRealizedProfits[lineIndex] || 0);
              return {
                rowId: String(line?.rowId || ""),
                itemType: String(line?.itemType || "inventory"),
                productName: String(line?.productName || "—"),
                quantity: Number(line?.quantity || 0),
                purchaseTotal: linePurchaseTotal,
                saleTotal: lineSaleTotal,
                totalProfit: lineProfit,
                collectedAmount: Number(itemCollectedAmounts[lineIndex] || 0),
                realizedProfit: lineRealizedProfit,
                unrealizedProfit: lineProfit - lineRealizedProfit,
              };
            }),
          };
        });

        // فروش‌های ثبت‌شده در مسیر قدیمی /api/sales در جدول مستقل
        // sales_transactions نگهداری می‌شوند و در sales_orders وجود ندارند.
        // این بخش آن فروش‌ها را نیز بدون حدس‌زدن وصول‌های عمومی وارد گزارش می‌کند.
        const legacySales = await allAsync(
          `SELECT st.id, st.transactionDate, st.itemType, st.itemId, st.itemName,
                  st.quantity, st.pricePerItem, st.totalPrice, st.buyPrice,
                  st.discount, st.paymentMethod, st.customerId,
                  c.fullName AS customerName
             FROM sales_transactions st
             LEFT JOIN customers c ON c.id = st.customerId
            WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
            ORDER BY datetime(st.transactionDate) DESC, st.id DESC`,
          [fromISO, toISO],
        ).catch(() => []);

        const selectedLegacyCreditSales = new Map<number, any>();
        for (const sale of legacySales) {
          if (normalizeLegacySalesPaymentType(sale?.paymentMethod) === "credit") {
            selectedLegacyCreditSales.set(Number(sale?.id || 0), sale);
          }
        }

        const legacyReceiptRows = selectedLegacyCreditSales.size > 0
          ? await allAsync(
              `SELECT id, customerId, transactionDate, COALESCE(credit,0) AS amount,
                      description, referenceType, referenceId
                 FROM customer_ledger
                WHERE customerId IS NOT NULL
                  AND COALESCE(credit,0) > 0
                  AND COALESCE(debit,0) = 0
                  AND date(transactionDate) <= date(?)
                ORDER BY datetime(transactionDate) ASC, id ASC`,
              [toISO],
            ).catch(() => [])
          : [];

        const legacyCollectedBySaleId = new Map<number, number>();
        let allocatedLegacyReceiptAmount = 0;
        for (const receipt of legacyReceiptRows) {
          const saleId = parseLegacySaleReceiptReference(receipt);
          const sale = selectedLegacyCreditSales.get(saleId);
          const amount = Math.max(0, Number(receipt?.amount || 0));
          if (
            !sale ||
            amount <= 0 ||
            Number(sale?.customerId || 0) !== Number(receipt?.customerId || 0)
          ) {
            continue;
          }
          const saleTotal = Math.max(0, Number(sale?.totalPrice || 0));
          const alreadyAllocated = Math.max(0, Number(legacyCollectedBySaleId.get(saleId) || 0));
          const allocated = Math.min(Math.max(0, saleTotal - alreadyAllocated), amount);
          if (allocated <= 0) continue;
          legacyCollectedBySaleId.set(saleId, alreadyAllocated + allocated);
          allocatedLegacyReceiptAmount += allocated;
        }

        const legacyRows = legacySales.map((sale: any) => {
          const orderId = Number(sale?.id || 0);
          const paymentType = normalizeLegacySalesPaymentType(sale?.paymentMethod);
          const quantity = Math.max(0, Number(sale?.quantity || 0));
          const saleTotal = Math.max(0, Number(sale?.totalPrice || 0));
          const unitPurchase = Math.max(0, Number(sale?.buyPrice || 0));
          const purchaseTotal = unitPurchase * quantity;
          const totalProfit = saleTotal - purchaseTotal;
          const collectedAmount = paymentType === "cash"
            ? saleTotal
            : Math.min(saleTotal, Math.max(0, Number(legacyCollectedBySaleId.get(orderId) || 0)));
          const outstandingAmount = Math.max(0, saleTotal - collectedAmount);
          const recognition = calculateExactSalesLedgerProfitRecognition(
            saleTotal,
            purchaseTotal,
            collectedAmount,
          );
          const realizedProfit = recognition.realizedProfit;
          const unrealizedProfit = recognition.unrealizedProfit;
          const collectionStatus =
            saleTotal <= 0 || collectedAmount <= 0
              ? "uncollected"
              : outstandingAmount <= 0.000001
                ? "collected"
                : "partial";
          const itemType = String(sale?.itemType || "inventory");
          const missingCostItems =
            itemType !== "service" && saleTotal > 0 && purchaseTotal <= 0 ? 1 : 0;
          return {
            docKey: `legacy:${orderId}`,
            sourceType: "legacy",
            orderId,
            transactionDate: normalizeReportDateOnly(sale?.transactionDate),
            customerName: sale?.customerName ? String(sale.customerName) : null,
            paymentType,
            itemGroup: classifySalesLedgerItemGroup([{ itemType }]),
            itemsSummary: String(sale?.itemName || "فروش مستقیم"),
            itemsCount: 1,
            purchaseTotal,
            saleTotal,
            totalProfit,
            collectedAmount,
            outstandingAmount,
            collectionRate: saleTotal > 0 ? (collectedAmount / saleTotal) * 100 : 0,
            realizedProfit,
            unrealizedProfit,
            collectionStatus,
            missingCostItems,
            detailHref: null,
            items: [{
              rowId: `legacy:${orderId}`,
              itemType,
              productName: String(sale?.itemName || "—"),
              quantity,
              purchaseTotal,
              saleTotal,
              totalProfit,
              collectedAmount,
              realizedProfit,
              unrealizedProfit,
            }],
          };
        });

        const rows = [...documentRows, ...legacyRows].sort((a: any, b: any) =>
          String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
          Number(b.orderId) - Number(a.orderId),
        );

        const summary = summarizeSalesLedgerRows(rows);
        const missingCostDocuments = rows.filter(
          (row: any) => Number(row.missingCostItems || 0) > 0,
        ).length;

        res.json({
          success: true,
          data: {
            range: { from: fromJ, to: toJ, fromISO, toISO },
            currencyBase: reportCurrencyContract.currencyBase,
            displayCurrency: reportCurrencyContract.displayCurrency,
            moneyDivisor: reportCurrencyContract.moneyDivisor,
            summary,
            rows,
            dataQuality: {
              missingCostDocuments,
              unlinkedCreditReceipts: Math.max(
                0,
                Number(recognitionReport?.summary?.unlinkedCreditReceipts || 0) -
                  allocatedLegacyReceiptAmount,
              ),
            },
            audit: {
              salesScope: "documents-created-in-selected-range",
              collectionScope: "cumulative-receipts-through-selected-end-date",
              profitRecognition: "exact-cost-recovery-from-collected-revenue",
              sourceTables: Array.from(new Set([
                ...(Array.isArray(recognitionReport?.sourceTables)
                  ? recognitionReport.sourceTables
                  : []),
                "sales_transactions",
                "customer_ledger",
              ])),
              generatedAt: new Date().toISOString(),
            },
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/product-sales",
    authorizeRole(SALES_REPORT_ROLES),
    async (req, res, next) => {
      try {
        const nowJ = moment().locale("fa");
        const fromJ = String(
          req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const toJ = String(
          req.query.to || nowJ.clone().endOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const fromISO = fromShamsiStringToISO(fromJ);
        const toISO = fromShamsiStringToISO(toJ);
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        const report = await buildProductSalesCollectionsReport(fromISO, toISO);
        res.json({
          success: true,
          data: {
            from: fromJ,
            to: toJ,
            currencyBase: reportCurrencyContract.currencyBase,
            displayCurrency: reportCurrencyContract.displayCurrency,
            moneyDivisor: reportCurrencyContract.moneyDivisor,
            total: Number(report.summary.contractualTotal || 0),
            receivedTotal: Number(report.summary.receivedTotal || 0),
            realizedProfit: Number(report.summary.realizedProfit || 0),
            breakdown: {
              cashSales: Number(report.summary.cashSales || 0),
              creditSales: Number(report.summary.creditSales || 0),
              installmentSales: Number(report.summary.installmentSales || 0),
              cashReceived: Number(report.summary.cashReceived || 0),
              creditReceived: Number(report.summary.creditReceived || 0),
              installmentReceived: Number(
                report.summary.installmentReceived || 0,
              ),
            },
            byDay: report.byDay,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );
};

export const registerProductSalesDetailsReportRoutes = (
  app: Express,
  {
    authorizeRole,
    buildProductSalesCollectionsReport,
    matchesProductSalesDetailsQuery,
    getProductSalesDetailsDiscountAudit,
    summarizeProductSalesDetailsRows,
    buildProductSalesDetailsTopProducts,
    buildProductSalesCalculationHealth,
    buildProductSalesCollectionRisk,
  }: ProductSalesDetailsReportRoutesDeps,
): void => {
  app.get(
    "/api/reports/product-sales/details",
    authorizeRole(SALES_REPORT_ROLES),
    async (req, res, next) => {
      try {
        const nowJ = moment().locale("fa");
        const fromJ = String(
          req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const toJ = String(
          req.query.to || nowJ.clone().endOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const fromISO = fromShamsiStringToISO(fromJ);
        const toISO = fromShamsiStringToISO(toJ);
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });

        const page = Math.max(
          1,
          parseInt(String(req.query.page || "1"), 10) || 1,
        );
        const pageSize = Math.min(
          200,
          Math.max(10, parseInt(String(req.query.pageSize || "50"), 10) || 50),
        );
        const exportAll =
          String(req.query.all || "").trim() === "1" ||
          String(req.query.export || "").trim() === "1";
        const auditMode = ["item", "invoice"].includes(
          String(req.query.auditMode || ""),
        )
          ? String(req.query.auditMode)
          : "all";
        const query = String(req.query.q || req.query.query || "").trim();

        const report = await buildProductSalesCollectionsReport(fromISO, toISO);
        const queryRows = (report.rows || []).filter((row: any) =>
          matchesProductSalesDetailsQuery(row, query),
        );
        const auditCounts = queryRows.reduce(
          (acc: any, row: any) => {
            const audit = getProductSalesDetailsDiscountAudit(row);
            acc.all += 1;
            if (audit.hasAnyDiscount) acc.discounted += 1;
            if (audit.hasItemDiscount) acc.itemDiscounted += 1;
            if (audit.hasInvoiceDiscount) acc.invoiceDiscounted += 1;
            return acc;
          },
          { all: 0, discounted: 0, itemDiscounted: 0, invoiceDiscounted: 0 },
        );

        const filteredRows = queryRows.filter((row: any) => {
          const audit = getProductSalesDetailsDiscountAudit(row);
          if (auditMode === "item") return audit.hasItemDiscount;
          if (auditMode === "invoice") return audit.hasInvoiceDiscount;
          return true;
        });

        const totalRows = filteredRows.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        const safePage = Math.min(page, totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const paginatedRows = exportAll
          ? filteredRows
          : filteredRows.slice(startIndex, startIndex + pageSize);
        const startRow = totalRows > 0 ? startIndex + 1 : 0;
        const endRow = exportAll
          ? totalRows
          : Math.min(totalRows, startIndex + pageSize);

        res.json({
          success: true,
          data: {
            from: fromJ,
            to: toJ,
            rows: paginatedRows,
            summary: report.summary,
            docs: report.docs,
            filteredSummary: summarizeProductSalesDetailsRows(filteredRows),
            auditCounts,
            topProducts: buildProductSalesDetailsTopProducts(filteredRows),
            calculationHealth: buildProductSalesCalculationHealth(
              queryRows,
              report.docs,
              report.rows,
            ),
            collectionRisk: await buildProductSalesCollectionRisk(
              filteredRows,
              report.docs,
            ),
            pagination: {
              page: exportAll ? 1 : safePage,
              pageSize: exportAll ? totalRows : pageSize,
              totalRows,
              totalPages: exportAll ? 1 : totalPages,
              startRow: exportAll ? (totalRows > 0 ? 1 : 0) : startRow,
              endRow,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );
};

// Backward-compatible type aliases for older imports.
export type RegisterCompareSalesReportRoutesDeps = CompareSalesReportRoutesDeps;
export type RegisterProductSalesSummaryReportRoutesDeps = ProductSalesSummaryReportRoutesDeps;
export type RegisterProductSalesDetailsReportRoutesDeps = ProductSalesDetailsReportRoutesDeps;
