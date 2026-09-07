import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationArchivePackRetentionPolicy,
  buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract,
  buildMlShadowObservationArchivePackRetentionPolicyCatalogSummary,
  exportInventoryStockoutShadowObservationArchivePackRetentionPolicyCsv,
  exportInventoryStockoutShadowObservationArchivePackRetentionPolicyManifest,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationArchivePackRetentionPolicy.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationArchivePackRetentionPolicyRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-archive-pack-retention-policies/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationArchivePackRetentionPolicyCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-archive-pack-retention-policy/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { retentionPayload: data.retentionPayload, retentionManifest: data.retentionManifest, policyManifest: data.policyManifest, summary: data.summary } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationArchivePackRetentionPolicyManifest(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationArchivePackRetentionPolicyCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
