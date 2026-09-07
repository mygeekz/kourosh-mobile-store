import type { Express } from "express";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../database";

type AuthorizeRole = (roles: string[]) => any;
type SqlAll = <T = any>(sql: string, params?: any[]) => Promise<T[]>;
type SqlGet = <T = any>(sql: string, params?: any[]) => Promise<T | null>;

export type FinancialOverviewReportRoutesDeps = {
  authorizeRole: AuthorizeRole;
  allAsync: SqlAll;
  getAsync: SqlGet;
  getDebtorsList: () => Promise<any[]>;
  getCreditorsList: () => Promise<any[]>;
  buildRealizedProfitRecognitionReport: (
    fromISO: string,
    toISO: string,
  ) => Promise<any>;
  getExpensesSummaryFromDb: (range: { from: string; to: string }) => Promise<any>;
  buildProductSalesCollectionsReport: (
    fromISO: string,
    toISO: string,
  ) => Promise<any>;
  buildDiscountAwareInvoiceLines: (rows: any[]) => any[];
};

export const registerFinancialOverviewReportRoutes = (
  app: Express,
  {
    authorizeRole,
    allAsync,
    getAsync,
    getDebtorsList,
    getCreditorsList,
    buildRealizedProfitRecognitionReport,
    getExpensesSummaryFromDb,
    buildProductSalesCollectionsReport,
    buildDiscountAwareInvoiceLines,
  }: FinancialOverviewReportRoutesDeps,
): void => {
  app.get(
    "/api/reports/financial-overview",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req, res, next) => {
      try {
        // Dates are provided as Shamsi (jYYYY/jMM/jDD) for UI consistency.
        // Defaults: current Shamsi month.
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
        if (!fromISO || !toISO) {
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        }

        // Aggregate sales from sales_orders (invoice system)
        const orders = await allAsync<any>(
          `SELECT so.id, so.transactionDate, so.subtotal, so.discount, so.tax, so.grandTotal,
                COALESCE(SUM(soi.discountPerItem), 0) AS itemsDiscount,
                COALESCE(SUM(CASE
                  WHEN soi.itemType='inventory' THEN COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice,0) * COALESCE(soi.quantity,0)
                  WHEN soi.itemType='phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice,0), NULLIF(soi.buyPrice,0), ph.purchasePrice,0) * COALESCE(soi.quantity,0)
                  ELSE 0 END), 0) AS cogs
           FROM sales_orders so
           LEFT JOIN sales_order_items soi ON so.id = soi.orderId
           LEFT JOIN products p ON soi.itemType='inventory' AND p.id = soi.itemId
           LEFT JOIN phones ph ON soi.itemType='phone' AND ph.id = soi.itemId
          WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
            AND (so.status IS NULL OR so.status = 'active')
          GROUP BY so.id
          ORDER BY so.id DESC`,
          [fromISO, toISO],
        );

        // فروش غیرگوشی (اقلام inventory + service) در بازه
        // این محاسبه از همان موتور گزارش غیرگوشی استفاده می‌کند تا تخفیف ردیفی و سهم تخفیف کلی فاکتور لحاظ شود.
        const productSalesCollections =
          await buildProductSalesCollectionsReport(fromISO, toISO);
        const invSalesTotal = Number(
          (productSalesCollections as any)?.summary?.contractualTotal || 0,
        );
        let ordersCount = 0;
        let subtotal = 0;
        let discounts = 0;
        let netSalesBeforeTax = 0;
        let taxAmount = 0;
        let totalSales = 0;
        let totalCogs = 0;
        let grossProfit = 0;
        const productSalesTotal = invSalesTotal; // مجموع فروش غیرگوشی (اقلام inventory + service)
        for (const o of orders) {
          ordersCount += 1;
          const oSubtotal = Number(o.subtotal) || 0;
          const oGlobalDiscount = Number(o.discount) || 0;
          const oItemsDiscount = Number(o.itemsDiscount) || 0;
          const oCogs = Number(o.cogs) || 0;
          const oGrandTotal = Number(o.grandTotal) || 0;
          const oNet = Math.max(0, oSubtotal - oGlobalDiscount - oItemsDiscount);
          const oTax = Math.max(0, oGrandTotal - oNet);
          const oProfit = oNet - oCogs;
          subtotal += oSubtotal;
          discounts += oGlobalDiscount + oItemsDiscount;
          netSalesBeforeTax += oNet;
          taxAmount += oTax;
          totalSales += oGrandTotal;
          totalCogs += oCogs;
          grossProfit += oProfit;
        }

        // Purchases total cost in range
        const purchasesRow = await getAsync<any>(
          `SELECT COALESCE(SUM(totalCost), 0) AS total FROM purchases
          WHERE substr(purchaseDate, 1, 10) BETWEEN ? AND ?`,
          [fromISO, toISO],
        );
        const purchasesTotal = Number(purchasesRow?.total) || 0;

        // Refunds (sales_returns) in range
        const refundsRow = await getAsync<any>(
          `SELECT COALESCE(SUM(refundAmount), 0) AS total FROM sales_returns
          WHERE substr(createdAt, 1, 10) BETWEEN ? AND ?`,
          [fromISO, toISO],
        );
        const refundsTotal = Number(refundsRow?.total) || 0;

        // Inventory value snapshot
        const invRow = await getAsync<any>(
          `SELECT COALESCE(SUM(stock_quantity * purchasePrice), 0) AS total FROM products`,
          [],
        );
        const phonesRow = await getAsync<any>(
          `SELECT COALESCE(SUM(COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0)), 0) AS total FROM phones
          WHERE status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی')`,
          [],
        );
        const inventoryValue =
          (Number(invRow?.total) || 0) + (Number(phonesRow?.total) || 0);

        // Receivables / Payables (current balances)
        const debtors = await getDebtorsList();
        const creditors = await getCreditorsList();
        const receivables = debtors.reduce(
          (s, d) => s + (Number((d as any).balance) || 0),
          0,
        );
        const payables = creditors.reduce(
          (s, c) => s + (Number((c as any).balance) || 0),
          0,
        );
        const ledgerAudit = {
          receivablesSource: "customer_ledger:sum(debit-credit)",
          payablesSource: "partner_ledger:sum(credit-debit)",
          debtorsCount: debtors.length,
          creditorsCount: creditors.length,
          generatedAt: new Date().toISOString(),
        };

        const realizedProfitReport =
          await buildRealizedProfitRecognitionReport(fromISO, toISO);
        const periodProfitSummary =
          realizedProfitReport?.periodSummary || realizedProfitReport?.summary || {};
        const overviewOrdersCount = Number(periodProfitSummary?.docsCount ?? ordersCount) || 0;
        const overviewTotalSales = Number(periodProfitSummary?.contractualRevenue ?? totalSales) || 0;
        const overviewCogs = Number(periodProfitSummary?.contractualCost ?? totalCogs) || 0;
        const overviewGrossProfit = Number(periodProfitSummary?.fullProfit ?? grossProfit) || 0;
        const expensesSummary = await getExpensesSummaryFromDb({
          from: fromISO,
          to: toISO,
        });
        const totalExpenses = Number(expensesSummary?.total || 0);
        const realProfit = overviewGrossProfit - totalExpenses;

        res.json({
          success: true,
          data: {
            range: { from: fromJ, to: toJ, fromISO, toISO },
            sales: {
              ordersCount: overviewOrdersCount,
              subtotal,
              discounts,
              netSalesBeforeTax,
              taxAmount,
              totalSales: overviewTotalSales,
              refundsTotal,
              productSalesTotal,
            },
            profit: {
              grossProfit: overviewGrossProfit,
              cogs: overviewCogs,
              realizedProfit: Number(periodProfitSummary?.realizedProfit || 0),
              realizedRevenue: Number(periodProfitSummary?.realizedRevenue || 0),
              realizedCost: Number(periodProfitSummary?.realizedCost || 0),
              unrecognizedProfit: Number(periodProfitSummary?.unrecognizedProfit || 0),
              collectionRate: Number(periodProfitSummary?.collectionRate || 0),
              managementBuckets:
                periodProfitSummary?.managementBuckets || {
                  accessories: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
                  cashPhone: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
                  installmentPhone: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
                  credit: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
                },
              recognitionAudit: {
                ...(realizedProfitReport?.audit || {}),
                overviewScope: "contracts-created-in-selected-range",
              },
            },
            expensesSummary,
            totalExpenses,
            realProfit,
            purchases: { total: purchasesTotal },
            workingCapital: { receivables, payables, audit: ledgerAudit },
            inventory: { inventoryValue },
            top: {
              debtors: debtors.slice(0, 10),
              creditors: creditors.slice(0, 10),
            },
          },
        });
      } catch (e) {
        console.error("GET /api/reports/financial-overview error", e);
        res.status(500).json({
          success: false,
          code: "FINANCIAL_OVERVIEW_INCOMPLETE",
          message:
            "گزارش مالی کامل تولید نشد؛ برای جلوگیری از نمایش اعداد ناقص هیچ داده‌ای برگردانده نشد.",
        });
      }
    },
  );
  // -----------------------------------------------------
  // Reports: Financial Overview Drill-down (KPI -> invoices)
  // -----------------------------------------------------
  app.get(
    "/api/reports/financial-overview/drilldown",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
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
        const kpi = String(req.query.kpi || "totalSales");
        const fromISO = fromShamsiStringToISO(fromJ);
        const toISO = fromShamsiStringToISO(toJ);
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        // Base list of orders in range
        const orders = await allAsync(
          `SELECT so.id, so.transactionDate, so.grandTotal, so.subtotal, so.discount, so.tax,
                c.fullName AS customerName, c.phoneNumber AS customerPhone
           FROM sales_orders so
           LEFT JOIN customers c ON c.id = so.customerId
          WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
            AND (so.status IS NULL OR so.status = 'active')
          ORDER BY date(so.transactionDate) DESC, so.id DESC`,
          [fromISO, toISO],
        );
        if (kpi === "totalSales") {
          return res.json({
            success: true,
            data: orders.map((o: any) => ({
              orderId: o.id,
              date: o.transactionDate,
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              amount: Number(o.grandTotal) || 0,
              profit: null,
            })),
          });
        }
        // Fetch items for those orders
        const orderIds = orders.map((o: any) => o.id);
        if (orderIds.length === 0) return res.json({ success: true, data: [] });
        const inClause = orderIds.map(() => "?").join(",");
        const items = await allAsync(
          `SELECT *
           FROM (
             SELECT
               so.id AS orderId,
               'invoice' AS sourceType,
               so.id AS sourceId,
               COALESCE(so.discount, 0) AS orderDiscount,
               soi.itemType,
               soi.itemId,
               soi.quantity,
               soi.unitPrice,
               ((COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0)) AS totalPrice,
               COALESCE(soi.discountPerItem,0) AS discountPerItem
             FROM sales_order_items soi
             JOIN sales_orders so ON so.id = soi.orderId
             WHERE so.id IN (${inClause})

             UNION ALL

             SELECT
               ins.id AS orderId,
               'installment' AS sourceType,
               ins.id AS sourceId,
               0 AS orderDiscount,
               isi.itemType,
               isi.itemId,
               isi.quantity,
               isi.unitPrice,
               COALESCE(isi.totalPrice, 0) AS totalPrice,
               0 AS discountPerItem
             FROM installment_sale_items isi
             JOIN installment_sales ins ON ins.id = isi.saleId
             WHERE COALESCE(ins.status,'active') = 'active'
               AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
           ) x`,
          [...orderIds, fromISO, toISO],
        );
        const invoiceItems = buildDiscountAwareInvoiceLines(
          (items as any[]).filter(
            (i: any) => String(i.sourceType || "invoice") === "invoice",
          ),
        );
        const normalizedItems = [
          ...invoiceItems,
          ...(items as any[]).filter(
            (i: any) => String(i.sourceType || "invoice") === "installment",
          ),
        ];

        // Fetch costs for inventory and phones
        const invIds = Array.from(
          new Set(
            normalizedItems
              .filter((i: any) => i.itemType === "inventory")
              .map((i: any) => i.itemId),
          ),
        );
        const phoneIds = Array.from(
          new Set(
            normalizedItems
              .filter((i: any) => i.itemType === "phone")
              .map((i: any) => i.itemId),
          ),
        );
        const [invRows, phoneRows] = await Promise.all([
          invIds.length
            ? allAsync(
                `SELECT id, purchasePrice FROM products WHERE id IN (${invIds.map(() => "?").join(",")})`,
                invIds,
              )
            : Promise.resolve([]),
          phoneIds.length
            ? allAsync(
                `SELECT id, COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0) AS purchasePrice FROM phones WHERE id IN (${phoneIds.map(() => "?").join(",")})`,
                phoneIds,
              )
            : Promise.resolve([]),
        ]);
        const invCost = new Map<number, number>(
          invRows.map((r: any) => [Number(r.id), Number(r.purchasePrice) || 0]),
        );
        const phoneCost = new Map<number, number>(
          phoneRows.map((r: any) => [Number(r.id), Number(r.purchasePrice) || 0]),
        );
        // Aggregate per order
        const agg = new Map<
          string,
          {
            orderId: number;
            sourceType: "invoice" | "installment";
            productSales: number;
            profit: number;
          }
        >();
        for (const it of normalizedItems as any[]) {
          const oid = Number(it.orderId);
          const sourceType = (
            String(it.sourceType || "invoice") === "installment"
              ? "installment"
              : "invoice"
          ) as "invoice" | "installment";
          const key = `${sourceType}:${oid}`;
          const qty = Number(it.quantity) || 0;
          const revenue = Number(it.totalPrice) || 0;
          let cost = 0;
          if (it.itemType === "inventory")
            cost = (invCost.get(Number(it.itemId)) || 0) * qty;
          else if (it.itemType === "phone")
            cost = (phoneCost.get(Number(it.itemId)) || 0) * qty;
          const cur = agg.get(key) || {
            orderId: oid,
            sourceType,
            productSales: 0,
            profit: 0,
          };
          if (it.itemType === "inventory" || it.itemType === "service")
            cur.productSales += revenue;
          cur.profit += revenue - cost;
          agg.set(key, cur);
        }
        if (kpi === "productSalesTotal") {
          const invoiceRows = orders
            .map((o: any) => {
              const a = agg.get(`invoice:${Number(o.id)}`);
              return a && a.productSales > 0
                ? {
                    orderId: o.id,
                    date: o.transactionDate,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    amount: a.productSales,
                    profit: null,
                    sourceType: "invoice",
                  }
                : null;
            })
            .filter(Boolean);
          const installmentRowsRaw = await allAsync(
            `SELECT ins.id, COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
                  c.fullName AS customerName, c.phoneNumber AS customerPhone
             FROM installment_sales ins
             LEFT JOIN customers c ON c.id = ins.customerId
            WHERE COALESCE(ins.status,'active') = 'active'
               AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
            ORDER BY date(COALESCE(ins.saleDateISO, ins.dateCreated)) DESC, ins.id DESC`,
            [fromISO, toISO],
          );
          const installmentRows = installmentRowsRaw
            .map((o: any) => {
              const a = agg.get(`installment:${Number(o.id)}`);
              return a && a.productSales > 0
                ? {
                    orderId: o.id,
                    date: o.transactionDate,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    amount: a.productSales,
                    profit: null,
                    sourceType: "installment",
                  }
                : null;
            })
            .filter(Boolean);
          return res.json({
            success: true,
            data: [...invoiceRows, ...installmentRows].sort(
              (a: any, b: any) =>
                String(b.date).localeCompare(String(a.date)) ||
                Number(b.orderId) - Number(a.orderId),
            ),
          });
        }
        if (kpi === "grossProfit") {
          const invoiceRows = orders
            .map((o: any) => {
              const a = agg.get(`invoice:${Number(o.id)}`);
              return a
                ? {
                    orderId: o.id,
                    date: o.transactionDate,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    amount: Number(o.grandTotal) || 0,
                    profit: a.profit,
                    sourceType: "invoice",
                  }
                : null;
            })
            .filter(Boolean);
          const installmentRowsRaw = await allAsync(
            `SELECT ins.id, COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
                  c.fullName AS customerName, c.phoneNumber AS customerPhone,
                  COALESCE(ins.actualSalePrice, 0) AS grandTotal
             FROM installment_sales ins
             LEFT JOIN customers c ON c.id = ins.customerId
            WHERE COALESCE(ins.status,'active') = 'active'
               AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
            ORDER BY date(COALESCE(ins.saleDateISO, ins.dateCreated)) DESC, ins.id DESC`,
            [fromISO, toISO],
          );
          const installmentRows = installmentRowsRaw
            .map((o: any) => {
              const a = agg.get(`installment:${Number(o.id)}`);
              return a
                ? {
                    orderId: o.id,
                    date: o.transactionDate,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    amount: Number(o.grandTotal) || 0,
                    profit: a.profit,
                    sourceType: "installment",
                  }
                : null;
            })
            .filter(Boolean);
          return res.json({
            success: true,
            data: [...invoiceRows, ...installmentRows].sort(
              (a: any, b: any) => (b.profit || 0) - (a.profit || 0),
            ),
          });
        }
        return res
          .status(400)
          .json({ success: false, message: "kpi نامعتبر است." });
      } catch (e) {
        next(e);
      }
    },
  );

};

// Backward-compatible type aliases for older imports.
export type RegisterFinancialOverviewReportRoutesDeps = FinancialOverviewReportRoutesDeps;
