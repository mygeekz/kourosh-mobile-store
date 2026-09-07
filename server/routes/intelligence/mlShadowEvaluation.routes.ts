import type { Express } from "express";
import {
  buildInventoryStockoutShadowEvaluation,
  buildInventoryStockoutShadowEvaluationContract,
  buildMlShadowEvaluationCatalogSummary,
  recordInventoryStockoutShadowEvaluation,
} from "../../intelligence/datasets/inventoryStockoutShadowEvaluation.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowEvaluationRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-evaluations/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowEvaluationCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-evaluation/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowEvaluationContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-evaluation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowEvaluation(req.params.id, false);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-evaluation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowEvaluation({
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
};
