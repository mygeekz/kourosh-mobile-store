import type { Express } from "express";
import { getAgingReceivablesReport, getCashflowReport } from "../database";

type AuthorizeRole = (roles: string[]) => any;

type RegisterAgingCashflowReportRoutesDeps = {
  authorizeRole: AuthorizeRole;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerAgingCashflowReportRoutes = (
  app: Express,
  { authorizeRole }: RegisterAgingCashflowReportRoutesDeps,
): void => {
  // -----------------------------------------------------
  // Reports: New executive-grade reports
  // -----------------------------------------------------
  app.get(
    "/api/reports/aging-receivables",
    authorizeRole(REPORT_ROLES),
    async (_req, res, next) => {
      try {
        const data = await getAgingReceivablesReport();
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/cashflow",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const { fromISO, toISO, forecastDays } = req.query;
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "fromISO و toISO الزامی است." });
        const fd = forecastDays ? Number(forecastDays) : 30;
        const data = await getCashflowReport(
          String(fromISO),
          String(toISO),
          Math.max(1, Math.min(120, fd)),
        );
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
