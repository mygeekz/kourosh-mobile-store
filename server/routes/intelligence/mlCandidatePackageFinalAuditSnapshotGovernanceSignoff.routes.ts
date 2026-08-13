import type { Express } from "express";
import {
  buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff,
  buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract,
  buildMlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary,
  prepareInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff,
} from "../../intelligence/datasets/inventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlCandidatePackageFinalAuditSnapshotGovernanceSignoffRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-candidate-package-final-audit-snapshot-governance-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await prepareInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff({
          ...(req.body || {}),
          userId: (req as any).user?.id || null,
        });
        if (data.summary.status !== "final_audit_snapshot_governance_signoff_ready") {
          res.status(400).json({
            success: false,
            message: "Phase 8I candidate package final audit snapshot governance signoff is not ready; no snapshot/archive/package bytes were loaded, no retention job, delete, purge, runtime behavior, production scoring, production approval, or business mutation was enabled.",
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
    "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/manifest.json",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff(req.query as Record<string, unknown>);
        res.json({ success: true, data: data.signoffPacket });
      } catch (err) {
        next(err);
      }
    },
  );
};

/* Phase 8I route anchors: /api/brain/ml-candidate-package-final-audit-snapshot-governance-signoffs/summary, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/contract, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/prepare, /api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/manifest.json */
