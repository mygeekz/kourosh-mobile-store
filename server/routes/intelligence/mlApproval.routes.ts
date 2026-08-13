import type { Express } from "express";
import {
  buildInventoryStockoutModelApprovalContract,
  buildInventoryStockoutModelApprovalGate,
  buildMlModelApprovalCatalogSummary,
  listInventoryStockoutExternalModelApprovalReviews,
  reviewInventoryStockoutExternalModelCandidate,
} from "../../intelligence/datasets/inventoryStockoutModelApproval.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlApprovalRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-model-approvals/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlModelApprovalCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/model-approval/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutModelApprovalContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/approval-gate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutModelApprovalGate(req.params.id);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/approval-reviews",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const reviews = await listInventoryStockoutExternalModelApprovalReviews(req.params.id);
        res.json({ success: true, data: { reviews, total: reviews.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/approval-review",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await reviewInventoryStockoutExternalModelCandidate({
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
