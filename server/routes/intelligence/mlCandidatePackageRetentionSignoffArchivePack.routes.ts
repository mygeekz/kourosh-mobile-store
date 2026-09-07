import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack,
  buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract,
  buildMlCandidatePackageRetentionSignoffArchivePackCatalogSummary,
  prepareInventoryStockoutCandidatePackageRetentionSignoffArchivePack,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageRetentionSignoffArchivePack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageRetentionSignoffArchivePackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-retention-signoff-archive-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageRetentionSignoffArchivePackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageRetentionSignoffArchivePack({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "retention_signoff_archive_pack_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8G candidate package retention signoff archive pack is not ready; no archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, or business mutation was enabled.",
            details: data.summary.blockers,
            data,
          });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.archivePacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8G route anchors: /api/brain/ml-candidate-package-retention-signoff-archive-packs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/manifest.json */
