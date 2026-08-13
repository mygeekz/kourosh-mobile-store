import type { Express } from "express";
import {
  buildInventoryStockoutExternalModelImportContract,
  buildMlModelImportCatalogSummary,
  recordInventoryStockoutExternalModelResults,
  validateInventoryStockoutExternalModelResults,
} from "../../intelligence/datasets/inventoryStockoutExternalModelImport.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlModelImportRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-model-imports/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlModelImportCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/model-result-import/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutExternalModelImportContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/model-result-import/validate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await validateInventoryStockoutExternalModelResults(req.body || {}, false);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/model-result-import/import",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutExternalModelResults({
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
