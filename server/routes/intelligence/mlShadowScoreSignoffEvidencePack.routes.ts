import type { Express } from "express";
import {
  buildInventoryStockoutShadowScoreSignoffEvidencePack,
  buildInventoryStockoutShadowScoreSignoffEvidencePackContract,
  buildMlShadowScoreSignoffEvidencePackCatalogSummary,
  exportInventoryStockoutShadowScoreSignoffEvidencePackCsv,
  exportInventoryStockoutShadowScoreSignoffEvidencePackJson,
  exportInventoryStockoutShadowScoreSignoffEvidencePackManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowScoreSignoffEvidencePack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowScoreSignoffEvidencePackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-score-signoff-evidence-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowScoreSignoffEvidencePackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-score-signoff-evidence-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowScoreSignoffEvidencePackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-evidence-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowScoreSignoffEvidencePack(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-evidence-pack/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffEvidencePackJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-evidence-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffEvidencePackManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-score-signoff-evidence-pack/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowScoreSignoffEvidencePackCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
