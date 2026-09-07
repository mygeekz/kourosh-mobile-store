import type { Express } from "express";
import {
  buildInventoryStockoutBaselineBenchmark,
  buildInventoryStockoutTrainTestSplit,
  buildMlBenchmarkCatalogSummary,
  recordInventoryStockoutBaselineBenchmark,
} from "../../intelligence/datasets/inventoryStockoutBenchmark.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlBenchmarkRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-benchmarks/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlBenchmarkCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/split",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutTrainTestSplit(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/benchmark",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutBaselineBenchmark(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/benchmark",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutBaselineBenchmark({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
