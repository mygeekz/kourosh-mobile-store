import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import {
  getInventoryAgingBucketsFromDb,
  getInventoryFifoAgingForAllProducts,
  getMonthlyProfitByProductFifo,
  getRealProfitPerProductFifo,
  listExpensesFromDb,
  listSalesProfitRowsFifo,
} from "../database";
import { jsonToXlsxBuffer } from "../exporters";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ReportExportRouteDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerReportExportRoutes = (
  app: Express,
  { authorizeRole }: ReportExportRouteDeps,
): void => {
  app.get(
    "/api/reports/inventory-aging-buckets",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await getInventoryAgingBucketsFromDb();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/sales-profit",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ
          ? moment(fromQ)
          : moment().subtract(30, "days").startOf("day");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const fromIso = from.toDate().toISOString();
        const toIso = to.toDate().toISOString();
        const data = await listSalesProfitRowsFifo(fromIso, toIso);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/inventory-fifo",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await getInventoryFifoAgingForAllProducts();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/exports/sales-profit.xlsx",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ
          ? moment(fromQ)
          : moment().subtract(30, "days").startOf("day");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const data = await listSalesProfitRowsFifo(
          from.toDate().toISOString(),
          to.toDate().toISOString(),
        );
        const rows = (data || []).map((r: any) => ({
          تاریخ: r.date,
          محصول: r.name,
          تعداد: r.qty,
          درآمد: r.revenue,
          "COGS (FIFO)": r.cogs,
          سود: r.profit,
          "حاشیه (%)": r.marginPct,
        }));
        const buf = await jsonToXlsxBuffer(rows, "SalesProfit");
        const fileName = `sales_profit_${moment().format("YYYY-MM-DD")}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/exports/product-margins.xlsx",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const monthsBack = Number(req.query.monthsBack || 6);
        const data = await getMonthlyProfitByProductFifo(monthsBack);
        const rows = (data || []).map((r: any) => ({
          ماه: r.month,
          محصول: r.name,
          تعداد: r.qty,
          درآمد: r.revenue,
          "COGS (FIFO)": r.cogs,
          سود: r.profit,
          "حاشیه (%)": r.marginPct,
        }));
        const buf = await jsonToXlsxBuffer(rows, "Margins");
        const fileName = `product_margins_${moment().format("YYYY-MM-DD")}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/exports/inventory-fifo.xlsx",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await getInventoryFifoAgingForAllProducts();
        const flat: any[] = [];
        for (const p of data || []) {
          if (!p.layers || p.layers.length === 0) {
            flat.push({
              محصول: p.name,
              موجودی: p.onHandQty,
              "ارزش موجودی": p.onHandValue,
              "میانگین قیمت": p.avgCost,
              "تاریخ لایه": "",
              "سن (روز)": "",
              "باقی‌مانده لایه": "",
              "قیمت خرید لایه": "",
              "ارزش لایه": "",
            });
          } else {
            for (const l of p.layers) {
              flat.push({
                محصول: p.name,
                موجودی: p.onHandQty,
                "ارزش موجودی": p.onHandValue,
                "میانگین قیمت": p.avgCost,
                "تاریخ لایه": l.entryDate,
                "سن (روز)": l.ageDays,
                "باقی‌مانده لایه": l.remainingQty,
                "قیمت خرید لایه": l.unitCost,
                "ارزش لایه": l.value,
              });
            }
          }
        }
        const buf = await jsonToXlsxBuffer(flat, "InventoryFIFO");
        const fileName = `inventory_fifo_${moment().format("YYYY-MM-DD")}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/exports/expenses.xlsx",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ ? moment(fromQ) : moment().startOf("month");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const category = req.query.category
          ? String(req.query.category)
          : undefined;
        const data = await listExpensesFromDb({
          from: from.toDate().toISOString(),
          to: to.toDate().toISOString(),
          category,
        });
        const categoryLabels: Record<string, string> = {
          rent: "اجاره و ملک",
          salary: "حقوق و دستمزد",
          inventory: "خرید کالا",
          marketing: "بازاریابی",
          logistics: "حمل و نقل",
          utilities: "قبوض و زیرساخت",
          software: "نرم‌افزار و اشتراک",
          repair: "تعمیرات و تجهیزات",
          tax: "مالیات و عوارض",
          loan: "وام و اقساط",
          overhead: "سایر هزینه‌ها",
        };
        const paymentMethodLabels: Record<string, string> = {
          cash: "نقدی",
          card: "کارت",
          transfer: "انتقال",
        };
        const rows = (data || []).map((r: any) => ({
          تاریخ: r.expenseDate
            ? moment(r.expenseDate).locale("fa").format("jYYYY/jMM/jDD")
            : "",
          عنوان: r.title || "",
          دسته‌بندی: categoryLabels[String(r.category || "")] || r.category || "",
          مبلغ: Number(r.amount || 0),
          "طرف حساب": r.vendor || "",
          "روش پرداخت": paymentMethodLabels[String(r.paymentMethod || "cash")] || "نقدی",
          "شماره مرجع": r.referenceNo || "",
          یادداشت: r.notes || "",
          ثبت‌کننده: r.createdByUsername || "",
          "زمان ثبت": r.createdAt || "",
        }));
        const buf = await jsonToXlsxBuffer(rows, "Expenses");
        const fileName = `expenses_${moment().format("YYYY-MM-DD")}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/exports/product-profit-real.xlsx",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ ? moment(fromQ) : moment().startOf("month");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const data = await getRealProfitPerProductFifo(
          from.toDate().toISOString(),
          to.toDate().toISOString(),
        );
        const rows = (data.items || []).map((r: any) => ({
          محصول: r.name,
          "تعداد فروش": r.qty,
          درآمد: r.revenue,
          "COGS (FIFO)": r.cogs,
          سود: r.profit,
          "قیمت خرید (میانگین)": r.avgBuyPrice,
          "قیمت فروش (میانگین)": r.avgSellPrice,
          "سهم از درآمد (%)": r.shareOfRevenue,
          "حاشیه (%)": r.marginPct,
        }));
        const buf = await jsonToXlsxBuffer(rows, "Profit");
        const fileName = `product_profit_real_${moment().format("YYYY-MM-DD")}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/product-profit-real",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fromQ = String(req.query.from || "");
        const toQ = String(req.query.to || "");
        const from = fromQ ? moment(fromQ) : moment().startOf("month");
        const to = toQ ? moment(toQ) : moment().endOf("day");
        const data = await getRealProfitPerProductFifo(
          from.toDate().toISOString(),
          to.toDate().toISOString(),
        );
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/product-margins",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const monthsBack = Number(req.query.monthsBack || 6);
        const data = await getMonthlyProfitByProductFifo(monthsBack);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
