import type { Express } from "express";
import {
  buildInventoryStockoutReadOnlyShadowScoringRuntime,
  buildInventoryStockoutReadOnlyShadowScoringRuntimeContract,
  buildMlReadOnlyShadowScoringRuntimeCatalogSummary,
  exportInventoryStockoutReadOnlyShadowScoringRuntimeCsv,
  exportInventoryStockoutReadOnlyShadowScoringRuntimeManifest,
} from "../../intelligence/datasets/inventoryStockoutReadOnlyShadowScoringRuntime.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlReadOnlyShadowScoringRuntimeRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-read-only-shadow-scoring-runtimes/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlReadOnlyShadowScoringRuntimeCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/read-only-shadow-scoring-runtime/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutReadOnlyShadowScoringRuntimeContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/read-only-shadow-scoring-runtime",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutReadOnlyShadowScoringRuntime(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/read-only-shadow-scoring-runtime/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutReadOnlyShadowScoringRuntimeManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/read-only-shadow-scoring-runtime/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutReadOnlyShadowScoringRuntimeCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
