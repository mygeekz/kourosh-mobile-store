import type { Express } from "express";
import {
  buildInventoryStockoutCandidateThresholdScenarioMetadata,
  buildInventoryStockoutCandidateThresholdScenarioMetadataContract,
  buildMlCandidateThresholdScenarioMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateThresholdScenarioMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateThresholdScenarioMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-threshold-scenario-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateThresholdScenarioMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-threshold-scenario-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateThresholdScenarioMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-threshold-scenario-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateThresholdScenarioMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9J route anchors: candidate-threshold-scenario-metadata/contract, candidate-threshold-scenario-metadata/:id, ml-candidate-threshold-scenario-metadata/summary, metadata-only threshold scenario review. */
