import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageIntakeBinder,
  buildInventoryStockoutCandidatePackageIntakeBinderContract,
  buildMlCandidatePackageIntakeBinderCatalogSummary,
  prepareInventoryStockoutCandidatePackageIntakeBinder,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageIntakeBinder.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageIntakeBinderRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-intake-binders/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageIntakeBinderCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageIntakeBinderContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageIntakeBinder(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageIntakeBinder({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "binder_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8B candidate package intake/quarantine binder readiness is not ready; no package bytes were loaded or persisted and no runtime behavior was enabled.",
            details: data.summary.blockers,
            data,
          });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageIntakeBinder(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.intakeManifest });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8B route anchors: /api/brain/ml-candidate-package-intake-binders/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/manifest.json */
