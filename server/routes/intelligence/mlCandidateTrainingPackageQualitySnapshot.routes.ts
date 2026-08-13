import type { Express } from "express";
import {
  buildInventoryStockoutCandidateTrainingPackageQualitySnapshot,
  buildInventoryStockoutCandidateTrainingPackageQualitySnapshotContract,
  buildMlCandidateTrainingPackageQualitySnapshotCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateTrainingPackageQualitySnapshot.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateTrainingPackageQualitySnapshotRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-training-package-quality-snapshot/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateTrainingPackageQualitySnapshotCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-training-package-quality-snapshot/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateTrainingPackageQualitySnapshotContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-training-package-quality-snapshot/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateTrainingPackageQualitySnapshot({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9G route anchors: candidate-training-package-quality-snapshot/contract, candidate-training-package-quality-snapshot/:id, ml-candidate-training-package-quality-snapshot/summary, metadata-only training package quality snapshot. */
