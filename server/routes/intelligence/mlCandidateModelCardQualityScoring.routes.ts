import type { Express } from "express";
import {
  buildInventoryStockoutCandidateModelCardQualityScoring,
  buildInventoryStockoutCandidateModelCardQualityScoringContract,
  buildMlCandidateModelCardQualityScoringCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateModelCardQualityScoring.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateModelCardQualityScoringRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-model-card-quality-scoring/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateModelCardQualityScoringCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-card-quality-scoring/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateModelCardQualityScoringContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-card-quality-scoring/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateModelCardQualityScoring({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9F route anchors: candidate-model-card-quality-scoring/contract, candidate-model-card-quality-scoring/:id, ml-candidate-model-card-quality-scoring/summary, metadata-only model card quality scoring. */
