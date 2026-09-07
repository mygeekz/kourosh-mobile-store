import type { Express } from "express";
import {
  buildInventoryStockoutCandidateRobustnessMetadata,
  buildInventoryStockoutCandidateRobustnessMetadataContract,
  buildMlCandidateRobustnessMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateRobustnessMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateRobustnessMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-robustness-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateRobustnessMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-robustness-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateRobustnessMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-robustness-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateRobustnessMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9M route anchors: candidate-robustness-metadata/contract, candidate-robustness-metadata/:id, ml-candidate-robustness-metadata/summary, metadata-only robustness review. */
