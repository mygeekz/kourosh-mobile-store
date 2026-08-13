import type { Express } from "express";
import {
  buildInventoryStockoutCandidateModelPackage,
  buildInventoryStockoutCandidateModelPackageContract,
  buildMlCandidateModelPackageCatalogSummary,
  recordInventoryStockoutCandidateModelPackageExport,
} from "../../intelligence/datasets/inventoryStockoutCandidateModelPackage.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateModelPackageRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-model-packages/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidateModelPackageCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateModelPackageContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateModelPackage(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/export",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutCandidateModelPackageExport({
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateModelPackage(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.packageManifest });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8A route anchors: /api/brain/ml-candidate-model-packages/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/export, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/manifest.json */
