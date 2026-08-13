import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack,
  buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract,
  buildMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary,
  prepareInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-governance-signoff-archive-finalization-summary-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "governance_signoff_archive_finalization_summary_pack_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8K candidate package governance signoff archive finalization summary pack is not ready; no signoff/snapshot/archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, production approval, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.finalizationSummaryPacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8K route anchors: /api/brain/ml-candidate-package-governance-signoff-archive-finalization-summary-packs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/manifest.json */
