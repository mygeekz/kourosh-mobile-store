import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreSignoffArchiveBinder,
  buildInventoryStockoutShadowScoreSignoffArchiveBinderContract,
  buildMlShadowScoreSignoffArchiveBinderCatalogSummary,
  exportInventoryStockoutShadowScoreSignoffArchiveBinderCsv,
  exportInventoryStockoutShadowScoreSignoffArchiveBinderJson,
  exportInventoryStockoutShadowScoreSignoffArchiveBinderManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreSignoffArchiveBinder.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreSignoffArchiveBinderRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-signoff-archive-binders/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreSignoffArchiveBinderCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-signoff-archive-binder/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreSignoffArchiveBinderContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-archive-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreSignoffArchiveBinder(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-archive-binder/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffArchiveBinderJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-archive-binder/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffArchiveBinderManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-archive-binder/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffArchiveBinderCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
