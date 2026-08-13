import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack,
  buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract,
  buildMlCandidatePackageGovernanceSignoffArchivePackCatalogSummary,
  prepareInventoryStockoutCandidatePackageGovernanceSignoffArchivePack,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageGovernanceSignoffArchivePack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageGovernanceSignoffArchivePackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-governance-signoff-archive-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageGovernanceSignoffArchivePackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageGovernanceSignoffArchivePack({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "governance_signoff_archive_pack_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8J candidate package governance signoff archive pack is not ready; no signoff/snapshot/archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, production approval, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.archivePacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8J route anchors: /api/brain/ml-candidate-package-governance-signoff-archive-packs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/manifest.json */
