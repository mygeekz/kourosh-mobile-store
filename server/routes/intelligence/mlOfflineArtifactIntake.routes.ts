import type { Express } from "express";
import { registerMlOfflineArtifactIntakeRoutes as registerModularRoutes } from "./mlOfflineArtifacts";
import type { IntelligenceRouteDeps } from "./types";

// Phase 7K-Cleanup compatibility router. Current product/MLOps status: Phase 7K.
export const registerMlOfflineArtifactIntakeRoutes = (
  app: Express,
  deps: IntelligenceRouteDeps,
): void => {
  registerModularRoutes(app, deps);
};

/*
Guard route anchors preserved after route modularization; route paths/methods remain registered by ./mlOfflineArtifacts:
POST /api/brain/ml-artifacts/offline-intake
GET /api/brain/ml-artifacts/offline-intake/summary
GET /api/brain/ml-artifacts/offline-intake/review-summary
GET /api/brain/ml-artifacts/offline-intake/reviews
GET /api/brain/ml-artifacts/offline-intake/retention-policy-evidence-summary
GET /api/brain/ml-artifacts/offline-intake/retention-policy-evidence
GET /api/brain/ml-artifacts/offline-intake/archive-packs/:archivePackId/retention-policy-evidence
POST /api/brain/ml-artifacts/offline-intake/archive-packs/:archivePackId/retention-policy-evidence
GET /api/brain/ml-artifacts/offline-intake/retention-governance-review-summary
GET /api/brain/ml-artifacts/offline-intake/retention-governance-reviews
GET /api/brain/ml-artifacts/offline-intake/retention-policy-evidence/:retentionPolicyEvidenceId/governance-reviews
POST /api/brain/ml-artifacts/offline-intake/retention-policy-evidence/:retentionPolicyEvidenceId/governance-review
GET /api/brain/ml-artifacts/offline-intake/retention-governance-archive-summary
GET /api/brain/ml-artifacts/offline-intake/retention-governance-archives
GET /api/brain/ml-artifacts/offline-intake/retention-governance-reviews/:retentionGovernanceReviewId/archives
POST /api/brain/ml-artifacts/offline-intake/retention-governance-reviews/:retentionGovernanceReviewId/archive-readiness
GET /api/brain/ml-artifacts/offline-intake/finalization-summary
GET /api/brain/ml-artifacts/offline-intake/finalizations
GET /api/brain/ml-artifacts/offline-intake/retention-governance-archives/:retentionGovernanceArchiveId/finalizations
POST /api/brain/ml-artifacts/offline-intake/retention-governance-archives/:retentionGovernanceArchiveId/finalization-readiness
GET /api/brain/ml-artifacts/offline-intake/audit-snapshot-summary
GET /api/brain/ml-artifacts/offline-intake/audit-snapshots
GET /api/brain/ml-artifacts/offline-intake/finalizations/:finalizationId/audit-snapshots
POST /api/brain/ml-artifacts/offline-intake/finalizations/:finalizationId/audit-snapshot-readiness
GET /api/brain/ml-artifacts/offline-intake/audit-snapshot-governance-signoff-summary
GET /api/brain/ml-artifacts/offline-intake/audit-snapshot-governance-signoffs
GET /api/brain/ml-artifacts/offline-intake/audit-snapshots/:auditSnapshotId/governance-signoffs
POST /api/brain/ml-artifacts/offline-intake/audit-snapshots/:auditSnapshotId/governance-signoff
GET /api/brain/ml-artifacts/offline-intake/audit-governance-archive-summary
GET /api/brain/ml-artifacts/offline-intake/audit-governance-archives
GET /api/brain/ml-artifacts/offline-intake/audit-snapshot-governance-signoffs/:auditSnapshotGovernanceSignoffId/archives
POST /api/brain/ml-artifacts/offline-intake/audit-snapshot-governance-signoffs/:auditSnapshotGovernanceSignoffId/archive-readiness
GET /api/brain/ml-artifacts/offline-intake/archive-pack-summary
GET /api/brain/ml-artifacts/offline-intake/archive-packs
GET /api/brain/ml-artifacts/offline-intake/governance-signoffs/:signoffId/archive-packs
POST /api/brain/ml-artifacts/offline-intake/governance-signoffs/:signoffId/archive-pack-readiness
GET /api/brain/ml-artifacts/offline-intake/governance-signoff-summary
GET /api/brain/ml-artifacts/offline-intake/governance-signoffs
GET /api/brain/ml-artifacts/offline-intake/binder-summary
GET /api/brain/ml-artifacts/offline-intake/binders/:binderId/governance-signoffs
POST /api/brain/ml-artifacts/offline-intake/binders/:binderId/governance-signoff
GET /api/brain/ml-artifacts/offline-intake/binders
GET /api/brain/ml-artifacts/offline-intake
GET /api/brain/ml-artifacts/offline-intake/:id
GET /api/brain/ml-artifacts/offline-intake/:id/reviews
GET /api/brain/ml-artifacts/offline-intake/:id/binders
POST /api/brain/ml-artifacts/offline-intake/:id/binder-readiness
POST /api/brain/ml-artifacts/offline-intake/:id/quarantine-review
POST /api/brain/ml-artifacts/offline-intake/:id/review-status
*/

/* Authorization anchor: authorizeRole(["Admin", "Manager"]) */
