import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageHumanSignoffArchivePack,
  buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract,
  buildMlCandidatePackageHumanSignoffArchivePackCatalogSummary,
  prepareInventoryStockoutCandidatePackageHumanSignoffArchivePack,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageHumanSignoffArchivePack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageHumanSignoffArchivePackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-human-signoff-archive-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageHumanSignoffArchivePackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageHumanSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageHumanSignoffArchivePack({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "archive_pack_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8D candidate package human signoff archive pack is not ready; no package bytes were loaded, no runtime behavior was enabled, no retention/delete/purge job was enabled, and this is not production approval.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageHumanSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.archivePack });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8D route anchors: /api/brain/ml-candidate-package-human-signoff-archive-packs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/manifest.json */
