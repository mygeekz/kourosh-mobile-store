import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationBinderReviewSignoffGate,
  buildInventoryStockoutShadowObservationBinderReviewSignoffGateContract,
  buildMlShadowObservationBinderReviewSignoffGateCatalogSummary,
  exportInventoryStockoutShadowObservationBinderReviewSignoffGateCsv,
  listInventoryStockoutShadowObservationBinderReviewSignoffs,
  recordInventoryStockoutShadowObservationBinderReviewSignoff,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationBinderReviewSignoffGate.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationBinderReviewSignoffGateRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-binder-review-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationBinderReviewSignoffGateCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-binder-review-signoff-gate/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationBinderReviewSignoffGateContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoffs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const signoffs = await listInventoryStockoutShadowObservationBinderReviewSignoffs(req.params.id, req.query.limit);
        res.json({ success: true, data: { signoffs, total: signoffs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoffs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowObservationBinderReviewSignoff({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate/export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data: { auditExport: data.auditExport, signoffRows: data.signoffRows, summary: data.summary } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate/export.csv",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await exportInventoryStockoutShadowObservationBinderReviewSignoffGateCsv(req.params.id, req.query as Record<string, unknown>);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
        res.send(data.csv);
      } catch (err) {
        next(err);
      }
    },
  );
};
