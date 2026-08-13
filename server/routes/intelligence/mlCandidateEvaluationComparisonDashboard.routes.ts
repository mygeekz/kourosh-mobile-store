import type { Express } from "express";
import {
  buildInventoryStockoutEvaluationComparisonDashboard,
  buildInventoryStockoutEvaluationComparisonDashboardContract,
  buildMlCandidateEvaluationComparisonDashboardCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutEvaluationComparisonDashboard.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateEvaluationComparisonDashboardRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-evaluation-comparison-dashboard/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateEvaluationComparisonDashboardCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/evaluation-comparison-dashboard/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutEvaluationComparisonDashboardContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/evaluation-comparison-dashboard",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutEvaluationComparisonDashboard(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9C route anchors: evaluation-comparison-dashboard/contract, evaluation-comparison-dashboard, ml-candidate-evaluation-comparison-dashboard/summary, metadata-only read dashboard. */
