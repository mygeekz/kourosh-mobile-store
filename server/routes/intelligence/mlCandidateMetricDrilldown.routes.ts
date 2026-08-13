import type { Express } from "express";
import {
  buildInventoryStockoutCandidateMetricDrilldown,
  buildInventoryStockoutCandidateMetricDrilldownContract,
  buildMlCandidateMetricDrilldownCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateMetricDrilldown.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateMetricDrilldownRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-metric-drilldown/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateMetricDrilldownCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-metric-drilldown/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateMetricDrilldownContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-metric-drilldown/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateMetricDrilldown({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9D route anchors: candidate-metric-drilldown/contract, candidate-metric-drilldown/:id, ml-candidate-metric-drilldown/summary, metadata-only read drilldown. */
