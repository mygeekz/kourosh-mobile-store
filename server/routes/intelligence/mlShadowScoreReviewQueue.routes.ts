import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreReviewQueue,
  buildInventoryStockoutShadowScoreReviewQueueContract,
  buildMlShadowScoreReviewQueueCatalogSummary,
  exportInventoryStockoutShadowScoreReviewQueueCsv,
  exportInventoryStockoutShadowScoreReviewQueueJson,
  exportInventoryStockoutShadowScoreReviewQueueManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreReviewQueue.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreReviewQueueRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-review-queues/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreReviewQueueCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-review-queue/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreReviewQueueContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-queue",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreReviewQueue(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-queue/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewQueueJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-queue/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewQueueManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-review-queue/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreReviewQueueCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
