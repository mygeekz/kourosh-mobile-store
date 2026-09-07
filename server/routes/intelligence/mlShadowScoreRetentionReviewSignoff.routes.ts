import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreRetentionReviewSignoff,
  buildInventoryStockoutShadowScoreRetentionReviewSignoffContract,
  buildMlShadowScoreRetentionReviewSignoffCatalogSummary,
  exportInventoryStockoutShadowScoreRetentionReviewSignoffCsv,
  exportInventoryStockoutShadowScoreRetentionReviewSignoffJson,
  exportInventoryStockoutShadowScoreRetentionReviewSignoffManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreRetentionReviewSignoff.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreRetentionReviewSignoffRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-retention-review-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreRetentionReviewSignoffCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-retention-review-signoff/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreRetentionReviewSignoffContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-retention-review-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreRetentionReviewSignoff(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-retention-review-signoff/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreRetentionReviewSignoffJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-retention-review-signoff/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreRetentionReviewSignoffManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-retention-review-signoff/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreRetentionReviewSignoffCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
