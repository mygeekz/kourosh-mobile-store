import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationReviewDashboard,
  buildInventoryStockoutShadowObservationReviewDashboardContract,
  buildMlShadowObservationReviewDashboardCatalogSummary,
  exportInventoryStockoutShadowObservationReviewDashboardCsv,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationReviewDashboard.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationReviewDashboardRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-review-dashboard/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationReviewDashboardCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-review-dashboard/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationReviewDashboardContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-dashboard",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationReviewDashboard(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-dashboard/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationReviewDashboard(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { exportManifest: data.exportManifest, baselineComparison: data.baselineComparison, reviewRows: data.reviewRows } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-review-dashboard/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationReviewDashboardCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${data.filename}\"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
