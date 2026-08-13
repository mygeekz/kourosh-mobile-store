import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationSignoffArchivePack,
  buildInventoryStockoutShadowObservationSignoffArchivePackContract,
  buildMlShadowObservationSignoffArchivePackCatalogSummary,
  exportInventoryStockoutShadowObservationSignoffArchivePackCsv,
  exportInventoryStockoutShadowObservationSignoffArchivePackManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationSignoffArchivePack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationSignoffArchivePackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-signoff-archive-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationSignoffArchivePackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-signoff-archive-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationSignoffArchivePackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationSignoffArchivePack(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationSignoffArchivePack(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { archivePayload: data.archivePayload, archiveManifest: data.archiveManifest, policyManifest: data.policyManifest, summary: data.summary } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationSignoffArchivePackManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationSignoffArchivePackCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
