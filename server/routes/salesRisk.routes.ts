import type { Express } from "express";
import { buildSalesRiskDecisionsReport } from "../reporting/salesRiskDecisions/salesRiskDecisionsReport.service";

type AuthorizeRole = (roles: string[]) => any;

type SalesAdvisorResult = {
  insights: any[];
  meta: Record<string, any>;
};

export type SalesRiskRoutesDeps = {
  authorizeRole: AuthorizeRole;
  getCustomerByIdFromDb: (customerId: number) => Promise<any>;
  getCustomerSalesTrustProfileFromDb: (
    customerId: number,
    customer?: any,
  ) => Promise<any>;
  buildSalesAdvisorAnalysis: (
    payload: any,
    customer?: any | null,
    customerTrustProfile?: any | null,
  ) => SalesAdvisorResult;
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
  addAuditLog: (
    userId: number | null,
    username: string | null,
    role: string | null,
    action: string,
    entityType: string,
    entityId: number | null,
    description: string,
  ) => Promise<any>;
};

export const registerSalesRiskRoutes = (
  app: Express,
  {
    authorizeRole,
    getCustomerByIdFromDb,
    getCustomerSalesTrustProfileFromDb,
    buildSalesAdvisorAnalysis,
    allAsync,
    addAuditLog,
  }: SalesRiskRoutesDeps,
): void => {
  app.post(
    "/api/sales-orders/smart-advisor",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req, res, next) => {
      try {
        const payload = req.body || {};
        const customerId = Number(payload.customerId || 0);
        let customer: any | null = null;
        if (customerId > 0) {
          try {
            customer = await getCustomerByIdFromDb(customerId);
          } catch {
            customer = null;
          }
        }
        const customerTrustProfile =
          customerId > 0
            ? await getCustomerSalesTrustProfileFromDb(
                customerId,
                customer,
              ).catch(() => null)
            : null;
        const result = buildSalesAdvisorAnalysis(
          payload,
          customer,
          customerTrustProfile,
        );
        res.json({
          success: true,
          data: result.insights,
          meta: {
            ...result.meta,
            customerTrustProfile,
            suggestedCreditLimit:
              customerTrustProfile?.suggestedCreditLimit ?? null,
            remainingSuggestedCredit:
              customerTrustProfile?.remainingSuggestedCredit ?? null,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/sales-risk-decisions",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const report = await buildSalesRiskDecisionsReport(req.query, { allAsync });
        res.json({ success: true, ...report });
      } catch (error) {
        next(error);
      }
    },
  );

  // Internal sales risk log: records important operator decisions around risky customer payment method changes.
  app.post(
    "/api/sales-orders/risk-payment-log",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const body = req.body || {};
        const user = (req as any).user || {};
        const customerId = Number(body.customerId || 0);
        const customerName = String(body.customerName || "").trim();
        const fromMethod = String(body.fromMethod || "").trim();
        const toMethod = String(body.toMethod || "").trim();
        const score = Number(body.score || 0);
        const tierLabel = String(body.tierLabel || "").trim();
        const reason = String(body.reason || "").trim();
        const grandTotal = Number(body.grandTotal || 0);
        const suggestedCreditLimit = Number(body.suggestedCreditLimit || 0);
        const projectedCreditExposure = Number(body.projectedCreditExposure || 0);

        if (!customerId || !fromMethod || !toMethod) {
          return res.status(400).json({
            success: false,
            message: "اطلاعات ثبت لاگ ریسک پرداخت کامل نیست.",
          });
        }

        const description = [
          `تغییر روش پرداخت مشتری پرریسک از ${fromMethod === "credit" ? "اعتباری" : "نقدی"} به ${toMethod === "credit" ? "اعتباری" : "نقدی"}`,
          customerName ? `مشتری: ${customerName}` : `شناسه مشتری: ${customerId}`,
          score ? `امتیاز اعتماد: ${score}` : "",
          tierLabel ? `سطح اعتماد: ${tierLabel}` : "",
          grandTotal
            ? `مبلغ فاکتور جاری: ${grandTotal.toLocaleString("fa-IR")}`
            : "",
          suggestedCreditLimit
            ? `سقف اعتبار پیشنهادی: ${suggestedCreditLimit.toLocaleString("fa-IR")}`
            : "",
          projectedCreditExposure
            ? `تعهد بعد از فروش: ${projectedCreditExposure.toLocaleString("fa-IR")}`
            : "",
          reason ? `علت: ${reason}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        await addAuditLog(
          Number(user.id || 0) || null,
          user.username || null,
          user.roleName || null,
          "sales-risk-payment-method-change",
          "customer",
          customerId,
          description,
        );

        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    },
  );
};

// Backward-compatible type aliases for older imports.
export type RegisterSalesRiskRoutesDeps = SalesRiskRoutesDeps;
