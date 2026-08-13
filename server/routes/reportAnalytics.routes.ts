import type { Express, Request, Response, NextFunction } from "express";
import moment from "jalali-moment";
import {
  allAsync,
  getAsync,
  getRfmReport,
  getCohortReport,
  listDebtSnapshotsFromDb,
  upsertDebtSnapshotInDb,
} from "../database";

type AuthorizeRole = (roles: string[]) => any;

type RegisterReportAnalyticsDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerReportRetentionRoutes = (
  app: Express,
  { authorizeRole }: RegisterReportAnalyticsDeps,
): void => {
  // Returns the RFM analysis for all customers. Each item includes recency (days since last
  // purchase), frequency (number of orders), monetary (total spend), scores (1–3) and the
  // composite RFM code. Use this report to identify valuable customer segments.
  app.get(
    "/api/reports/rfm",
    authorizeRole(["Admin", "Manager", "Marketer"]),
    async (_req, res, next) => {
      try {
        const items = await getRfmReport();
        res.json({ success: true, data: items });
      } catch (e) {
        next(e);
      }
    },
  );

  // Cohort analysis groups customers by the month of their first purchase and tracks how many
  // return in subsequent months. The response contains an array of objects where counts[i]
  // represents the number of customers in cohort who purchased again i months after their
  // first purchase. The totals property indicates the size of the cohort. This can be used
  // to visualize retention curves.
  app.get(
    "/api/reports/cohort",
    authorizeRole(["Admin", "Manager", "Marketer"]),
    async (_req, res, next) => {
      try {
        const items = await getCohortReport();
        res.json({ success: true, data: items });
      } catch (e) {
        next(e);
      }
    },
  );
};

export const registerReportAnalyticsDashboardRoutes = (
  app: Express,
  { authorizeRole }: RegisterReportAnalyticsDeps,
): void => {
  app.get(
    "/api/reports/analytics-dashboard",
    authorizeRole(["Admin", "Manager"]),
    async (req: Request, res: Response, next: NextFunction) => {
      const warn = (section: string, error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error || "unknown");
        console.warn(`[analytics-dashboard] ${section} failed:`, message);
      };

      const safeAll = async <T = any>(
        section: string,
        sql: string,
        params: any[] = [],
      ): Promise<T[]> => {
        try {
          return (await allAsync(sql, params)) as T[];
        } catch (error) {
          warn(section, error);
          return [];
        }
      };

      const safeGet = async <T = any>(
        section: string,
        sql: string,
        params: any[] = [],
      ): Promise<T | null> => {
        try {
          return (await getAsync(sql, params)) as T;
        } catch (error) {
          warn(section, error);
          return null;
        }
      };

      const safeRunPart = async <T>(
        section: string,
        fn: () => Promise<T>,
        fallback: T,
      ): Promise<T> => {
        try {
          return await fn();
        } catch (error) {
          warn(section, error);
          return fallback;
        }
      };

      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ
          ? moment(fromQ)
          : moment().startOf("jMonth").startOf("day");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const fromIso = from.toDate().toISOString();
        const toIso = to.toDate().toISOString();

        // Legacy one-shot sales
        const dailySalesRows = await safeAll<any>(
          "daily-sales-transactions",
          `SELECT substr(transactionDate, 1, 10) as day, SUM(totalPrice) as total
           FROM sales_transactions
          WHERE transactionDate >= ? AND transactionDate <= ?
          GROUP BY substr(transactionDate, 1, 10)
          ORDER BY day ASC`,
          [fromIso, toIso],
        );

        // New invoice/order system
        const dailyOrderRows = await safeAll<any>(
          "daily-sales-orders",
          `SELECT substr(transactionDate, 1, 10) as day, SUM(grandTotal) as total
           FROM sales_orders
          WHERE transactionDate >= ? AND transactionDate <= ?
            AND COALESCE(status, 'active') != 'canceled'
          GROUP BY substr(transactionDate, 1, 10)
          ORDER BY day ASC`,
          [fromIso, toIso],
        );

        const dailyDownRows = await safeAll<any>(
          "daily-installment-downpayments",
          `SELECT substr(createdAt, 1, 10) as day, SUM(downPayment) as total
           FROM installment_sales
          WHERE createdAt >= ? AND createdAt <= ?
          GROUP BY substr(createdAt, 1, 10)
          ORDER BY day ASC`,
          [fromIso, toIso],
        );

        const dailyMap: Record<string, number> = {};
        [
          ...(dailySalesRows || []),
          ...(dailyOrderRows || []),
          ...(dailyDownRows || []),
        ].forEach((r: any) => {
          dailyMap[String(r.day)] =
            (dailyMap[String(r.day)] || 0) + Number(r.total || 0);
        });

        const legacyProdRows = await safeAll<any>(
          "product-sales-transactions",
          `SELECT itemId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue
           FROM sales_transactions
          WHERE itemType = 'inventory'
            AND transactionDate >= ? AND transactionDate <= ?
          GROUP BY itemId, itemName
          HAVING SUM(quantity) > 0`,
          [fromIso, toIso],
        );

        const orderProdRows = await safeAll<any>(
          "product-sales-orders",
          `SELECT soi.itemId as itemId,
                COALESCE(p.name, soi.description, 'کالا') as itemName,
                SUM(soi.quantity) as qty,
                SUM(soi.totalPrice) as revenue
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
           LEFT JOIN products p ON p.id = soi.itemId
          WHERE soi.itemType = 'inventory'
            AND so.transactionDate >= ? AND so.transactionDate <= ?
            AND COALESCE(so.status, 'active') != 'canceled'
          GROUP BY soi.itemId, COALESCE(p.name, soi.description, 'کالا')
          HAVING SUM(soi.quantity) > 0`,
          [fromIso, toIso],
        );

        const productMap: Record<string, any> = {};
        [...(legacyProdRows || []), ...(orderProdRows || [])].forEach(
          (r: any) => {
            const id = String(r.itemId);
            if (!productMap[id]) {
              productMap[id] = {
                itemId: Number(r.itemId),
                itemName: String(r.itemName || "کالا"),
                qty: 0,
                revenue: 0,
              };
            }
            productMap[id].qty += Number(r.qty || 0);
            productMap[id].revenue += Number(r.revenue || 0);
          },
        );

        const prodRows = Object.values(productMap).sort(
          (a: any, b: any) => Number(b.revenue || 0) - Number(a.revenue || 0),
        );

        const bestProducts = prodRows.slice(0, 5).map((r: any) => ({
          id: Number(r.itemId),
          name: String(r.itemName || "کالا"),
          qty: Number(r.qty || 0),
          revenue: Number(r.revenue || 0),
        }));

        const worstProducts = prodRows
          .filter((r: any) => Number(r.revenue || 0) > 0)
          .slice(-5)
          .map((r: any) => ({
            id: Number(r.itemId),
            name: String(r.itemName || "کالا"),
            qty: Number(r.qty || 0),
            revenue: Number(r.revenue || 0),
          }))
          .reverse();

        await safeRunPart(
          "debt-snapshot-upsert",
          async () => {
            const today = moment().format("YYYY-MM-DD");
            const debtNowRow = await safeGet<any>(
              "debt-snapshot-current-total",
              `SELECT COALESCE(SUM(
                 MAX(0,
                   COALESCE(s.actualSalePrice,0) - COALESCE(s.downPayment,0)
                   - COALESCE((
                       SELECT SUM(it.amount_paid)
                         FROM installment_payments ip
                         JOIN installment_transactions it ON it.installment_payment_id = ip.id
                        WHERE ip.saleId = s.id
                     ),0)
                   - COALESCE((
                       SELECT SUM(
                         CASE
                           WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
                           THEN MAX(0, COALESCE(ic.amount,0) - COALESCE((
                             SELECT SUM(it.amount_paid)
                               FROM installment_payments rp
                               JOIN installment_transactions it ON it.installment_payment_id = rp.id
                              WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                           ),0))
                           ELSE 0
                         END
                       )
                         FROM installment_checks ic
                        WHERE ic.saleId = s.id
                     ),0)
                 )
               ),0) AS total
               FROM installment_sales s
              WHERE COALESCE(s.status,'active') = 'active'`,
              [],
            );
            const debtNow = Number(debtNowRow?.total || 0);
            await upsertDebtSnapshotInDb(today, debtNow);
            return true;
          },
          false,
        );

        const snapFrom = from.clone().format("YYYY-MM-DD");
        const snapTo = to.clone().format("YYYY-MM-DD");

        const debtDailyTrend = await safeRunPart<any[]>(
          "debt-snapshots-or-derived",
          async () => {
            const snaps = await listDebtSnapshotsFromDb(snapFrom, snapTo);
            const snapshotTrend = (snaps || []).map((r: any) => ({
              date: String(r.snapshotDate),
              debt: Number(r.totalDebt || 0),
              source: "snapshot",
            }));

            const positiveSnapshotCount = snapshotTrend.filter(
              (point: any) => Number(point.debt || 0) > 0,
            ).length;
            if (positiveSnapshotCount >= 2) return snapshotTrend;

            // If there is not enough historical snapshot data yet, build an estimated daily trend
            // from installments and payments. This avoids showing a useless single-point chart
            // while still using real accounting tables, not fake random values.
            const paymentRows = await safeAll<any>(
              "debt-derived-installment-payments",
              `SELECT id, dueDate, amountDue, status
             FROM installment_payments
            WHERE dueDate IS NOT NULL
              AND COALESCE(sourceType,'installment') = 'installment'
            ORDER BY dueDate ASC`,
              [],
            );

            const txRows = await safeAll<any>(
              "debt-derived-installment-transactions",
              `SELECT installment_payment_id as paymentId, amount_paid, payment_date
             FROM installment_transactions
            WHERE payment_date IS NOT NULL
            ORDER BY payment_date ASC`,
              [],
            );

            if (!paymentRows.length) return snapshotTrend;

            const paidByDayAndPayment: Record<
              string,
              Record<string, number>
            > = {};
            (txRows || []).forEach((tx: any) => {
              const paymentId = String(tx.paymentId);
              const day = moment(tx.payment_date).format("YYYY-MM-DD");
              if (!paidByDayAndPayment[paymentId])
                paidByDayAndPayment[paymentId] = {};
              paidByDayAndPayment[paymentId][day] =
                (paidByDayAndPayment[paymentId][day] || 0) +
                Number(tx.amount_paid || 0);
            });

            const derivedTrend: any[] = [];
            const dcur = from.clone().startOf("day");
            const dend = to.clone().startOf("day");
            let dguard = 0;
            while (dcur.isSameOrBefore(dend) && dguard < 370) {
              const day = dcur.format("YYYY-MM-DD");
              let totalDebt = 0;

              (paymentRows || []).forEach((payment: any) => {
                const dueDay = moment(payment.dueDate).format("YYYY-MM-DD");
                if (dueDay > day) return;

                const paymentId = String(payment.id);
                const scheduled = Number(payment.amountDue || 0);
                const paidMap = paidByDayAndPayment[paymentId] || {};
                const paidUntilDay = Object.entries(paidMap).reduce(
                  (sum, [paidDay, amount]) => {
                    return paidDay <= day ? sum + Number(amount || 0) : sum;
                  },
                  0,
                );

                const remaining = Math.max(0, scheduled - paidUntilDay);
                totalDebt += remaining;
              });

              derivedTrend.push({
                date: day,
                debt: totalDebt,
                source: "derived",
              });
              dcur.add(1, "day");
              dguard += 1;
            }

            const derivedPositiveCount = derivedTrend.filter(
              (point) => Number(point.debt || 0) > 0,
            ).length;
            return derivedPositiveCount >= 2 ? derivedTrend : snapshotTrend;
          },
          [],
        );

        const costMapRows = await safeAll<any>(
          "purchase-cost-map",
          `SELECT productId, SUM(lineTotal) as totalCost, SUM(quantity) as qty
           FROM purchase_items
          GROUP BY productId`,
          [],
        );

        const avgCostById: Record<string, number> = {};
        (costMapRows || []).forEach((r: any) => {
          const q = Number(r.qty || 0);
          const tc = Number(r.totalCost || 0);
          if (q > 0) avgCostById[String(r.productId)] = tc / q;
        });

        const productPriceRows = await safeAll<any>(
          "product-fallback-cost",
          `SELECT id, purchasePrice FROM products`,
          [],
        );
        const fallbackCost: Record<string, number> = {};
        (productPriceRows || []).forEach((r: any) => {
          fallbackCost[String(r.id)] = Number(r.purchasePrice || 0);
        });

        const orderProfitRows = await safeAll<any>(
          "product-profit-sales-orders",
          `SELECT soi.itemId as itemId,
                COALESCE(p.name, soi.description, 'کالا') as itemName,
                SUM(soi.quantity) as qty,
                SUM(soi.totalPrice) as revenue,
                SUM(COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0) * soi.quantity) as cogs
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
           LEFT JOIN products p ON p.id = soi.itemId
          WHERE soi.itemType = 'inventory'
            AND so.transactionDate >= ? AND so.transactionDate <= ?
            AND COALESCE(so.status, 'active') != 'canceled'
          GROUP BY soi.itemId, COALESCE(p.name, soi.description, 'کالا')`,
          [fromIso, toIso],
        );

        const profitMap: Record<string, any> = {};
        (prodRows || []).forEach((r: any) => {
          const id = String(r.itemId);
          const qty = Number(r.qty || 0);
          const revenue = Number(r.revenue || 0);
          const unitCost = Number(avgCostById[id] ?? fallbackCost[id] ?? 0);
          profitMap[id] = {
            id: Number(r.itemId),
            name: String(r.itemName || "کالا"),
            qty,
            revenue,
            unitCost,
            cogs: unitCost * qty,
          };
        });

        (orderProfitRows || []).forEach((r: any) => {
          const id = String(r.itemId);
          if (!profitMap[id]) {
            profitMap[id] = {
              id: Number(r.itemId),
              name: String(r.itemName || "کالا"),
              qty: 0,
              revenue: 0,
              unitCost: 0,
              cogs: 0,
            };
          }
          // Replace/strengthen cogs for order rows because sales_order_items keeps buyPrice snapshot.
          profitMap[id].cogs = Number(r.cogs || profitMap[id].cogs || 0);
          profitMap[id].unitCost =
            Number(r.qty || 0) > 0
              ? Number(profitMap[id].cogs || 0) / Number(r.qty || 1)
              : Number(profitMap[id].unitCost || 0);
        });

        const profitRows = Object.values(profitMap)
          .map((r: any) => ({
            ...r,
            profit: Number(r.revenue || 0) - Number(r.cogs || 0),
          }))
          .sort(
            (a: any, b: any) => Number(b.profit || 0) - Number(a.profit || 0),
          );

        const bestProductsByProfit = profitRows.slice(0, 5);
        const worstProductsByProfit = profitRows.slice(-5).reverse();

        const salesTrend: any[] = [];
        const cursor = from.clone().startOf("day");
        const endDay = to.clone().startOf("day");
        let guard = 0;
        while (cursor.isSameOrBefore(endDay) && guard < 370) {
          const d = cursor.format("YYYY-MM-DD");
          salesTrend.push({ date: d, revenue: Number(dailyMap[d] || 0) });
          cursor.add(1, "day");
          guard += 1;
        }

        const months: string[] = [];
        const mcur = moment().startOf("month").subtract(5, "month");
        for (let i = 0; i < 6; i++) {
          months.push(mcur.format("YYYY-MM"));
          mcur.add(1, "month");
        }

        const monthComparison: any[] = [];
        for (const m of months) {
          const mStart = moment(m + "-01")
            .startOf("month")
            .toDate()
            .toISOString();
          const mEnd = moment(m + "-01")
            .endOf("month")
            .toDate()
            .toISOString();
          const sRow = await safeGet<any>(
            "month-sales-transactions",
            `SELECT SUM(totalPrice) as total FROM sales_transactions WHERE transactionDate >= ? AND transactionDate <= ?`,
            [mStart, mEnd],
          );
          const soRow = await safeGet<any>(
            "month-sales-orders",
            `SELECT SUM(grandTotal) as total
             FROM sales_orders
            WHERE transactionDate >= ? AND transactionDate <= ?
              AND COALESCE(status, 'active') != 'canceled'`,
            [mStart, mEnd],
          );
          const dRow = await safeGet<any>(
            "month-downpayments",
            `SELECT SUM(downPayment) as total FROM installment_sales WHERE createdAt >= ? AND createdAt <= ?`,
            [mStart, mEnd],
          );
          const revenue =
            Number(sRow?.total || 0) +
            Number(soRow?.total || 0) +
            Number(dRow?.total || 0);
          monthComparison.push({ month: m, revenue });
        }

        const debtRows = await safeAll<any>(
          "debt-by-due-month",
          `SELECT substr(dueDate, 1, 7) as month, SUM(amountDue) as total
           FROM installment_payments
          WHERE status != 'پرداخت شده'
          GROUP BY substr(dueDate, 1, 7)
          ORDER BY month ASC
          LIMIT 24`,
          [],
        );

        const debtByDueMonth = (debtRows || []).map((r: any) => ({
          month: String(r.month),
          debt: Number(r.total || 0),
        }));

        res.json({
          success: true,
          data: {
            range: {
              from: from.format("YYYY-MM-DD"),
              to: to.format("YYYY-MM-DD"),
            },
            salesTrend,
            debtDailyTrend,
            debtByDueMonth,
            debtTrend: debtByDueMonth,
            monthComparison,
            bestProductsByProfit,
            worstProductsByProfit,
            bestProducts,
            worstProducts,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
