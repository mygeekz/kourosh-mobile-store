import type { Express } from "express";
import {
  buildInventoryStockoutTrainingPackage,
  buildInventoryStockoutTrainingPackageCsv,
  buildMlTrainingPackageCatalogSummary,
  recordInventoryStockoutTrainingPackageExport,
} from "../../intelligence/datasets/inventoryStockoutTrainingPackage.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlTrainingPackageRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-training-packages/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlTrainingPackageCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/training-package",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutTrainingPackage(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/training-package/export",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutTrainingPackageExport({
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
    "/api/brain/ml-datasets/inventory-stockout/training-package/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutTrainingPackage(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.manifest });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/training-package/train.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutTrainingPackageCsv("train", req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=inventory-stockout-training-train-v1.csv");
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/training-package/test.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutTrainingPackageCsv("test", req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=inventory-stockout-training-test-v1.csv");
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
