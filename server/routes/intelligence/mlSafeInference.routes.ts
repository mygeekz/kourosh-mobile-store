import type { Express } from "express";
import {
  buildInventoryStockoutSafeInferenceBoundary,
  buildInventoryStockoutSafeInferenceBoundaryContract,
  buildMlSafeInferenceBoundaryCatalogSummary,
  listInventoryStockoutSafeInferenceBoundaries,
  recordInventoryStockoutSafeInferenceBoundary,
} from "../../intelligence/datasets/inventoryStockoutSafeInferenceBoundary.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlSafeInferenceRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-safe-inference-boundaries/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlSafeInferenceBoundaryCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/safe-inference-boundary/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutSafeInferenceBoundaryContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/safe-inference-boundary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutSafeInferenceBoundary(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/safe-inference-boundaries",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const boundaries = await listInventoryStockoutSafeInferenceBoundaries(req.params.id);
        res.json({ success: true, data: { boundaries, total: boundaries.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/safe-inference-boundary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutSafeInferenceBoundary({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
