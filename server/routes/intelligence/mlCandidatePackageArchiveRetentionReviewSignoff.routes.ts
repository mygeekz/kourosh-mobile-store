import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff,
  buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract,
  buildMlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary,
  prepareInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageArchiveRetentionReviewSignoff.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageArchiveRetentionReviewSignoffRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-archive-retention-review-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "retention_review_signoff_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8F candidate package archive retention review signoff is not ready; no archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.signoffPacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8F route anchors: /api/brain/ml-candidate-package-archive-retention-review-signoffs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/manifest.json */
