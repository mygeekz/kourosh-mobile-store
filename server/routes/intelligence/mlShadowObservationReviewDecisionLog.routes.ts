import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationReviewDecisionLog,
  buildInventoryStockoutShadowObservationReviewDecisionLogContract,
  buildMlShadowObservationReviewDecisionLogCatalogSummary,
  exportInventoryStockoutShadowObservationReviewDecisionLogCsv,
  listInventoryStockoutShadowObservationReviewDecisions,
  recordInventoryStockoutShadowObservationReviewDecision,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationReviewDecisionLog.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationReviewDecisionLogRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-review-decisions/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationReviewDecisionLogCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-review-decision-log/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationReviewDecisionLogContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-decision-log",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationReviewDecisionLog(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-decisions",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const decisions = await listInventoryStockoutShadowObservationReviewDecisions(req.params.id, req.query.limit);
        res.json({ success: true, data: { decisions, total: decisions.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-decisions",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowObservationReviewDecision({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-decision-log/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationReviewDecisionLog(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { auditExport: data.auditExport, decisionRows: data.decisionRows, summary: data.summary } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-decision-log/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationReviewDecisionLogCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${data.filename}\"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
