import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreEvidenceRetentionReview,
  buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract,
  buildMlShadowScoreEvidenceRetentionReviewCatalogSummary,
  exportInventoryStockoutShadowScoreEvidenceRetentionReviewCsv,
  exportInventoryStockoutShadowScoreEvidenceRetentionReviewJson,
  exportInventoryStockoutShadowScoreEvidenceRetentionReviewManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreEvidenceRetentionReview.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreEvidenceRetentionReviewRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-evidence-retention-reviews/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreEvidenceRetentionReviewCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-evidence-retention-review/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-evidence-retention-review",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreEvidenceRetentionReview(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-evidence-retention-review/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreEvidenceRetentionReviewJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-evidence-retention-review/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreEvidenceRetentionReviewManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-evidence-retention-review/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreEvidenceRetentionReviewCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
