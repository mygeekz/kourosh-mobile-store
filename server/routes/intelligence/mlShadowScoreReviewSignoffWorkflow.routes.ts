import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreReviewSignoffWorkflow,
  buildInventoryStockoutShadowScoreReviewSignoffWorkflowContract,
  buildMlShadowScoreReviewSignoffWorkflowCatalogSummary,
  exportInventoryStockoutShadowScoreReviewSignoffWorkflowCsv,
  exportInventoryStockoutShadowScoreReviewSignoffWorkflowJson,
  exportInventoryStockoutShadowScoreReviewSignoffWorkflowManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreReviewSignoffWorkflow.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreReviewSignoffWorkflowRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-review-signoff-workflows/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreReviewSignoffWorkflowCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-review-signoff-workflow/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreReviewSignoffWorkflowContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-signoff-workflow",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreReviewSignoffWorkflow(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-signoff-workflow/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewSignoffWorkflowJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-signoff-workflow/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewSignoffWorkflowManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-signoff-workflow/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewSignoffWorkflowCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
