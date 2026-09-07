import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot,
  buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract,
  buildMlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary,
  prepareInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageRetentionArchiveFinalAuditSnapshotRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-retention-archive-final-audit-snapshots/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "retention_archive_final_audit_snapshot_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8H candidate package retention archive final audit snapshot is not ready; no archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.auditSnapshot });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8H route anchors: /api/brain/ml-candidate-package-retention-archive-final-audit-snapshots/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/manifest.json */
