import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationDecisionReviewExportBinder,
  buildInventoryStockoutShadowObservationDecisionReviewExportBinderContract,
  buildMlShadowObservationDecisionReviewExportBinderCatalogSummary,
  exportInventoryStockoutShadowObservationDecisionReviewExportBinderCsv,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationDecisionReviewExportBinder.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationDecisionReviewExportBinderRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-decision-review-export-binder/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationDecisionReviewExportBinderCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-decision-review-export-binder/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationDecisionReviewExportBinderContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { binderPayload: data.binderPayload, exportManifest: data.exportManifest, summary: data.summary } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: data.exportManifest });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationDecisionReviewExportBinderCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${data.filename}\"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
