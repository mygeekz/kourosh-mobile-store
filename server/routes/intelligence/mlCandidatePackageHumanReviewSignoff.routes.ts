import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageHumanReviewSignoff,
  buildInventoryStockoutCandidatePackageHumanReviewSignoffContract,
  buildMlCandidatePackageHumanReviewSignoffCatalogSummary,
  prepareInventoryStockoutCandidatePackageHumanReviewSignoff,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageHumanReviewSignoff.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageHumanReviewSignoffRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-human-review-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageHumanReviewSignoffCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageHumanReviewSignoffContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageHumanReviewSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageHumanReviewSignoff({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "signoff_gate_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8C candidate package human review/signoff gate is not ready; no package bytes were loaded, no runtime behavior was enabled, and this is not production approval.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageHumanReviewSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.reviewPacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8C route anchors: /api/brain/ml-candidate-package-human-review-signoffs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/manifest.json */
