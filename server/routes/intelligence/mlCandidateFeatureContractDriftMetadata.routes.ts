import type { Express } from "express";
import {
  buildInventoryStockoutCandidateFeatureContractDriftMetadata,
  buildInventoryStockoutCandidateFeatureContractDriftMetadataContract,
  buildMlCandidateFeatureContractDriftMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateFeatureContractDriftMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateFeatureContractDriftMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-feature-contract-drift-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateFeatureContractDriftMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-feature-contract-drift-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateFeatureContractDriftMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-feature-contract-drift-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateFeatureContractDriftMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9I route anchors: candidate-feature-contract-drift-metadata/contract, candidate-feature-contract-drift-metadata/:id, ml-candidate-feature-contract-drift-metadata/summary, metadata-only feature contract drift. */
