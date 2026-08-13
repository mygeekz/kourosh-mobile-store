import type { Express } from "express";
import {
  getInventoryStockoutCandidateDataDriftBaselineMetadata,
  getInventoryStockoutCandidateDataDriftBaselineMetadataContract,
  getInventoryStockoutCandidateDataDriftBaselineMetadataSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateDataDriftBaselineMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateDataDriftBaselineMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-data-drift-baseline-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getInventoryStockoutCandidateDataDriftBaselineMetadataSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-data-drift-baseline-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = getInventoryStockoutCandidateDataDriftBaselineMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-data-drift-baseline-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getInventoryStockoutCandidateDataDriftBaselineMetadata(req.params.id);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9H route anchors: candidate-data-drift-baseline-metadata/contract, candidate-data-drift-baseline-metadata/:id, ml-candidate-data-drift-baseline-metadata/summary, metadata-only data drift baseline metadata. */
