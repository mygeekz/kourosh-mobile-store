import type { Express } from "express";
import {
  buildInventoryStockoutCandidateEvaluationMetadataImportContract,
  buildMlCandidateEvaluationMetadataImportCatalogSummary,
  importInventoryStockoutCandidateEvaluationMetadata,
  validateInventoryStockoutCandidateEvaluationMetadataImport,
} from "../../intelligence/datasets/inventoryStockoutCandidateEvaluationMetadataImport.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateEvaluationMetadataImportRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-evaluation-metadata-imports/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidateEvaluationMetadataImportCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-evaluation-metadata-import/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateEvaluationMetadataImportContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-evaluation-metadata-import/validate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = validateInventoryStockoutCandidateEvaluationMetadataImport(req.body || {});
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-evaluation-metadata-import/import",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await importInventoryStockoutCandidateEvaluationMetadata({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9B route anchors: candidate-evaluation-metadata-import/contract, candidate-evaluation-metadata-import/validate, candidate-evaluation-metadata-import/import, metadata-only evaluation report import. */
