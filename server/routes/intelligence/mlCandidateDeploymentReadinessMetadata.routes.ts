import type { Express } from "express";
import {
  buildInventoryStockoutCandidateDeploymentReadinessMetadata,
  buildInventoryStockoutCandidateDeploymentReadinessMetadataContract,
  buildMlCandidateDeploymentReadinessMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateDeploymentReadinessMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateDeploymentReadinessMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-deployment-readiness-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateDeploymentReadinessMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-deployment-readiness-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateDeploymentReadinessMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-deployment-readiness-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateDeploymentReadinessMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9N route anchors: candidate-deployment-readiness-metadata/contract, candidate-deployment-readiness-metadata/:id, ml-candidate-deployment-readiness-metadata/summary, metadata-only deployment readiness review. */
