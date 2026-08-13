import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../database";
import { fetchMobileAnalyticsCashRows } from "../reporting/mobileSalesAnalytics/mobileSalesAnalyticsCash.service";
import {
  fetchMobileAnalyticsInstallmentBaseRows,
  fetchMobileAnalyticsInstallmentPaymentMaps,
} from "../reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallments.service";
import { buildMobileAnalyticsInstallmentRows } from "../reporting/mobileSalesAnalytics/mobileSalesAnalyticsInstallmentRows.service";
import { buildMobileAnalyticsPartnerCapital } from "../reporting/mobileSalesAnalytics/mobileSalesAnalyticsPartnerCapital.service";
import { buildMobileAnalyticsReportPayload } from "../reporting/mobileSalesAnalytics/mobileSalesAnalyticsReportAssembly.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ReportMobileSalesAnalyticsRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerReportMobileSalesAnalyticsRoutes = (
  app: Express,
  { authorizeRole }: ReportMobileSalesAnalyticsRouteDeps,
): void => {
app.get(
  "/api/reports/mobile-sales-analytics",
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const nowJ = moment().locale("fa");
      const fromJ = String(
        req.query.fromDate ||
          req.query.from ||
          nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
      );
      const toJ = String(
        req.query.toDate ||
          req.query.to ||
          nowJ.clone().format("jYYYY/jMM/jDD"),
      );
      const fromISO = fromShamsiStringToISO(fromJ);
      const toISO = fromShamsiStringToISO(toJ);
      if (!fromISO || !toISO)
        return res
          .status(400)
          .json({ success: false, message: "بازه زمانی نامعتبر است." });

      const cashRows = await fetchMobileAnalyticsCashRows(fromISO, toISO);

      const installmentBaseRows = await fetchMobileAnalyticsInstallmentBaseRows(
        fromISO,
        toISO,
      );
      const { paymentsBySale, checksBySale } =
        await fetchMobileAnalyticsInstallmentPaymentMaps(installmentBaseRows);

      const installmentRows = buildMobileAnalyticsInstallmentRows({
        installmentBaseRows,
        paymentsBySale,
        checksBySale,
      });

      const { partnerCapitalRows, partnerCapitalSummary } =
        await buildMobileAnalyticsPartnerCapital({
          cashRows,
          installmentRows,
        });

      const data = buildMobileAnalyticsReportPayload({
        fromJ,
        toJ,
        cashRows,
        installmentRows,
        partnerCapitalRows,
        partnerCapitalSummary,
      });

      res.json({
        success: true,
        data: {
          ...data,
          generatedAt: new Date().toISOString(),
          dataSource: "sqlite-business-records",
          sourceTables: [
            "sales_orders",
            "sales_order_items",
            "sales_transactions",
            "phones",
            "installment_sales",
            "installment_sale_items",
            "installment_payments",
            "installment_checks",
          ],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

};
