import type { Express } from "express";
import {
  buildInventoryStockoutCandidateErrorAnalysisMetadata,
  buildInventoryStockoutCandidateErrorAnalysisMetadataContract,
  buildMlCandidateErrorAnalysisMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateErrorAnalysisMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateErrorAnalysisMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-error-analysis-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateErrorAnalysisMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-error-analysis-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateErrorAnalysisMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-error-analysis-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateErrorAnalysisMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9L route anchors: candidate-error-analysis-metadata/contract, candidate-error-analysis-metadata/:id, ml-candidate-error-analysis-metadata/summary, metadata-only error analysis review. */
