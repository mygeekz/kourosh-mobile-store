import type { Express, RequestHandler } from "express";
import { getAccountingReconciliationCenterReadModel } from "../db/domains/accountingReconciliationCenter.db";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

export const registerAccountingReconciliationRoutes = (
  app: Express,
  { authorizeRole }: { authorizeRole: AuthorizeRole },
): void => {
  app.get(
    "/api/accounting-reconciliation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10) || 25, 1), 100);
        const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
        const statusRaw = String(req.query.status || "needs_review");
        const severityRaw = String(req.query.severity || "ALL");
        const status = ["ALL", "needs_review", "resolved"].includes(statusRaw) ? statusRaw as "ALL" | "needs_review" | "resolved" : "needs_review";
        const severity = ["ALL", "warning", "high"].includes(severityRaw) ? severityRaw as "ALL" | "warning" | "high" : "ALL";
        const data = await getAccountingReconciliationCenterReadModel({
          q: String(req.query.q || ""),
          status,
          severity,
          issueType: String(req.query.issueType || "ALL"),
          limit,
          offset,
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, data: data.rows, meta: {
          pagination: data.pagination,
          summary: data.summary,
          options: data.options,
          generatedAt: data.generatedAt,
          readOnly: data.readOnly,
        } });
      } catch (error) {
        next(error);
      }
    },
  );
};
