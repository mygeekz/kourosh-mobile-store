import type { Express } from "express";
import {
  buildInventoryStockoutOfflinePilotReadinessContract,
  buildInventoryStockoutOfflinePilotReadinessGate,
  buildMlOfflinePilotReadinessCatalogSummary,
  recordInventoryStockoutOfflinePilotReadinessGate,
} from "../../intelligence/datasets/inventoryStockoutOfflinePilotReadiness.service";
import {
  buildInventoryStockoutOfflinePilotDecisionBoard,
  buildInventoryStockoutOfflinePilotDecisionContract,
  buildMlOfflinePilotDecisionCatalogSummary,
  listInventoryStockoutOfflinePilotDecisionReviews,
  recordInventoryStockoutOfflinePilotDecision,
} from "../../intelligence/datasets/inventoryStockoutOfflinePilotDecision.service";
import {
  buildInventoryStockoutOfflinePilotReviewPack,
  buildInventoryStockoutOfflinePilotReviewPackContract,
  buildMlOfflinePilotReviewPackCatalogSummary,
  listInventoryStockoutOfflinePilotReviewPacks,
  recordInventoryStockoutOfflinePilotReviewPack,
} from "../../intelligence/datasets/inventoryStockoutOfflinePilotReviewPack.service";
import {
  buildInventoryStockoutOfflinePilotKpiDashboard,
  buildInventoryStockoutOfflinePilotKpiDashboardContract,
  buildInventoryStockoutOfflinePilotReviewExportJson,
  buildInventoryStockoutOfflinePilotReviewExportMarkdown,
  buildMlOfflinePilotKpiDashboardCatalogSummary,
  listInventoryStockoutOfflinePilotReviewExports,
  recordInventoryStockoutOfflinePilotReviewExport,
} from "../../intelligence/datasets/inventoryStockoutOfflinePilotKpiDashboard.service";
import {
  buildInventoryStockoutOfflinePilotCloseout,
  buildInventoryStockoutOfflinePilotCloseoutContract,
  buildMlOfflinePilotCloseoutCatalogSummary,
  listInventoryStockoutOfflinePilotCloseouts,
  recordInventoryStockoutOfflinePilotCloseout,
} from "../../intelligence/datasets/inventoryStockoutOfflinePilotCloseout.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlOfflinePilotRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-pilot-closeouts/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlOfflinePilotCloseoutCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/offline-pilot-closeout/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutOfflinePilotCloseoutContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-closeout",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotCloseout(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-closeouts",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const closeouts = await listInventoryStockoutOfflinePilotCloseouts(req.params.id);
        res.json({ success: true, data: { closeouts, total: closeouts.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/offline-pilot-closeout",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutOfflinePilotCloseout({
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
    "/api/brain/ml-offline-pilot-kpis/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlOfflinePilotKpiDashboardCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/offline-pilot-kpi-dashboard/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutOfflinePilotKpiDashboardContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-kpi-dashboard",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotKpiDashboard(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-export.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotReviewExportJson(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-export.md",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const markdown = await buildInventoryStockoutOfflinePilotReviewExportMarkdown(req.params.id, req.query as Record<string, unknown>);
        res.type("text/markdown").send(markdown);
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-exports",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const exports = await listInventoryStockoutOfflinePilotReviewExports(req.params.id);
        res.json({ success: true, data: { exports, total: exports.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-export",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutOfflinePilotReviewExport({
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
    "/api/brain/ml-offline-pilot-review-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlOfflinePilotReviewPackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/offline-pilot-review-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutOfflinePilotReviewPackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotReviewPack(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const packs = await listInventoryStockoutOfflinePilotReviewPacks(req.params.id);
        res.json({ success: true, data: { packs, total: packs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/offline-pilot-review-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutOfflinePilotReviewPack({
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
    "/api/brain/ml-offline-pilot-decisions/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlOfflinePilotDecisionCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/offline-pilot-decision/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutOfflinePilotDecisionContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-decision",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotDecisionBoard(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-decisions",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const reviews = await listInventoryStockoutOfflinePilotDecisionReviews(req.params.id);
        res.json({ success: true, data: { reviews, total: reviews.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/offline-pilot-decision",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutOfflinePilotDecision({
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
    "/api/brain/ml-offline-pilots/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlOfflinePilotReadinessCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/offline-pilot/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutOfflinePilotReadinessContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/offline-pilot-readiness",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutOfflinePilotReadinessGate(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/offline-pilot-readiness",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutOfflinePilotReadinessGate({
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
