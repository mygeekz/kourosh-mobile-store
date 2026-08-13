import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder,
  buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract,
  buildMlCandidatePackageArchiveRetentionReviewBinderCatalogSummary,
  prepareInventoryStockoutCandidatePackageArchiveRetentionReviewBinder,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageArchiveRetentionReviewBinder.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageArchiveRetentionReviewBinderRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-archive-retention-review-binders/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageArchiveRetentionReviewBinderCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageArchiveRetentionReviewBinder({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "retention_review_binder_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8E candidate package archive retention review binder is not ready; no archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.retentionReviewBinder });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8E route anchors: /api/brain/ml-candidate-package-archive-retention-review-binders/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/manifest.json */
