import type { Express } from "express";
import {
  buildInventoryStockoutCandidateDatasetSliceDiagnostics,
  buildInventoryStockoutCandidateDatasetSliceDiagnosticsContract,
  buildMlCandidateDatasetSliceDiagnosticsCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateDatasetSliceDiagnostics.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateDatasetSliceDiagnosticsRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-dataset-slice-diagnostics/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateDatasetSliceDiagnosticsCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-dataset-slice-diagnostics/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateDatasetSliceDiagnosticsContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-dataset-slice-diagnostics/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateDatasetSliceDiagnostics({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9E route anchors: candidate-dataset-slice-diagnostics/contract, candidate-dataset-slice-diagnostics/:id, ml-candidate-dataset-slice-diagnostics/summary, metadata-only read slice diagnostics. */
