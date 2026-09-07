import type { Express, RequestHandler } from "express";
import {
  fromShamsiStringToISO,
  getCreditorsList,
  getDebtorsList,
  getPhoneInstallmentSalesDateBounds,
  getPhoneInstallmentSalesReport,
  getPhoneSalesDateBounds,
  getPhoneSalesReport,
  getSalesSummaryAndProfit,
  getTopCustomersBySales,
  getTopSuppliersByPurchaseValue,
} from "../database";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ReportSalesCoreRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

const requireDateRange = (reqQuery: any, res: any) => {
  const { fromDate, toDate } = reqQuery;
  if (!fromDate || !toDate) {
    res.status(400).json({ success: false, message: "بازه زمانی الزامی است." });
    return null;
  }
  return { fromDate: fromDate as string, toDate: toDate as string };
};

const requireIsoDateRange = (reqQuery: any, res: any) => {
  const range = requireDateRange(reqQuery, res);
  if (!range) return null;

  const fromIso = fromShamsiStringToISO(range.fromDate);
  const toIso = fromShamsiStringToISO(range.toDate);
  if (!fromIso || !toIso) {
    res.status(400).json({ success: false, message: "فرمت تاریخ نامعتبر است." });
    return null;
  }

  return { fromIso, toIso };
};

export const registerReportSalesCoreRoutes = (
  app: Express,
  { authorizeRole }: ReportSalesCoreRouteDeps,
): void => {
  app.get(
    "/api/reports/sales-summary",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const range = requireDateRange(req.query, res);
        if (!range) return;
        const data = await getSalesSummaryAndProfit(range.fromDate, range.toDate);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/debtors",
    authorizeRole(REPORT_ROLES),
    async (_req, res, next) => {
      try {
        const data = await getDebtorsList();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/creditors",
    authorizeRole(REPORT_ROLES),
    async (_req, res, next) => {
      try {
        const data = await getCreditorsList();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/top-customers",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const range = requireDateRange(req.query, res);
        if (!range) return;
        const data = await getTopCustomersBySales(range.fromDate, range.toDate);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/top-suppliers",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const range = requireIsoDateRange(req.query, res);
        if (!range) return;
        const data = await getTopSuppliersByPurchaseValue(range.fromIso, range.toIso);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/phone-sales",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const range = requireIsoDateRange(req.query, res);
        if (!range) return;
        const data = await getPhoneSalesReport(range.fromIso, range.toIso);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/phone-sales/bounds",
    authorizeRole(REPORT_ROLES),
    async (_req, res, next) => {
      try {
        const data = await getPhoneSalesDateBounds();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/phone-installment-sales/bounds",
    authorizeRole(REPORT_ROLES),
    async (_req, res, next) => {
      try {
        const data = await getPhoneInstallmentSalesDateBounds();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/phone-installment-sales",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const range = requireIsoDateRange(req.query, res);
        if (!range) return;
        const data = await getPhoneInstallmentSalesReport(range.fromIso, range.toIso);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
