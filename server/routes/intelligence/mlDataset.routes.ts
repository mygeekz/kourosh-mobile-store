import type { Express } from "express";
import {
  buildInventoryStockoutDataset,
  buildInventoryStockoutDatasetCsv,
  buildMlDatasetCatalogSummary,
  recordInventoryStockoutJsonExport,
} from "../../intelligence/datasets/inventoryStockoutDataset.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlDatasetRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-datasets/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlDatasetCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutDataset(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/export",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutJsonExport({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutDatasetCsv({
          ...(req.query as Record<string, unknown>),
          userId: (req as any).user?.id || null,
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=inventory-stockout-baseline-v1.csv");
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
