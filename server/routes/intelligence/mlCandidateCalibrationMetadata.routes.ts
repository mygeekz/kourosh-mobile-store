import type { Express } from "express";
import {
  buildInventoryStockoutCandidateCalibrationMetadata,
  buildInventoryStockoutCandidateCalibrationMetadataContract,
  buildMlCandidateCalibrationMetadataCatalogSummary,
} from "../../intelligence/datasets/inventoryStockoutCandidateCalibrationMetadata.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidateCalibrationMetadataRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-calibration-metadata/summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildMlCandidateCalibrationMetadataCatalogSummary(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-calibration-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidateCalibrationMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-calibration-metadata/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidateCalibrationMetadata({ id: req.params.id });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 9K route anchors: candidate-calibration-metadata/contract, candidate-calibration-metadata/:id, ml-candidate-calibration-metadata/summary, metadata-only calibration review. */
