import type { Express } from "express";
import {
  getQuarantinedArtifactById,
  listQuarantinedArtifacts,
} from "../../../intelligence/artifacts/artifactQuarantine.service";
import {
  buildOfflineArtifactIntakeSummary,
  intakeOfflineModelArtifact,
} from "../../../intelligence/artifacts/offlineArtifactIntake.service";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import {
  buildOfflineArtifactQuarantineReviewSummary,
  listOfflineArtifactQuarantineReviewEvidence,
  listOfflineArtifactQuarantineReviewEvidenceForArtifact,
  reviewOfflineArtifactQuarantineEvidence,
} from "../../../intelligence/artifacts/offlineArtifactQuarantineReview.service";
import {
  buildOfflineArtifactReviewBinderSummary,
  listOfflineArtifactReviewBinderReadinessManifests,
  listOfflineArtifactReviewBinderReadinessManifestsForArtifact,
  prepareOfflineArtifactReviewBinderExportReadiness,
} from "../../../intelligence/artifacts/offlineArtifactReviewBinder.service";
import {
  buildOfflineArtifactReviewBinderGovernanceSignoffSummary,
  listOfflineArtifactReviewBinderGovernanceSignoffEvidence,
  listOfflineArtifactReviewBinderGovernanceSignoffEvidenceForBinder,
  signoffOfflineArtifactReviewBinderGovernanceReadiness,
} from "../../../intelligence/artifacts/offlineArtifactReviewBinderGovernanceSignoff.service";
import {
  buildOfflineArtifactGovernanceSignoffArchivePackSummary,
  listOfflineArtifactGovernanceSignoffArchivePackReadinessForSignoff,
  listOfflineArtifactGovernanceSignoffArchivePackReadinessManifests,
  prepareOfflineArtifactGovernanceSignoffArchivePackReadiness,
} from "../../../intelligence/artifacts/offlineArtifactGovernanceSignoffArchivePack.service";
import {
  buildOfflineArtifactArchivePackRetentionPolicyEvidenceSummary,
  listOfflineArtifactArchivePackRetentionPolicyEvidenceForArchivePack,
  listOfflineArtifactArchivePackRetentionPolicyEvidenceReadinessManifests,
  prepareOfflineArtifactArchivePackRetentionPolicyEvidenceReadiness,
} from "../../../intelligence/artifacts/offlineArtifactArchivePackRetentionPolicyEvidence.service";
import {
  buildOfflineArtifactRetentionEvidenceGovernanceReviewSummary,
  listOfflineArtifactRetentionEvidenceGovernanceReviewReadinessManifests,
  listOfflineArtifactRetentionEvidenceGovernanceReviewsForRetentionPolicyEvidence,
  reviewOfflineArtifactRetentionEvidenceGovernanceReadiness,
} from "../../../intelligence/artifacts/offlineArtifactRetentionEvidenceGovernanceReview.service";
import {
  buildOfflineArtifactRetentionGovernanceReviewArchiveSummary,
  listOfflineArtifactRetentionGovernanceReviewArchiveReadinessForRetentionGovernanceReview,
  listOfflineArtifactRetentionGovernanceReviewArchiveReadinessManifests,
  prepareOfflineArtifactRetentionGovernanceReviewArchiveReadiness,
} from "../../../intelligence/artifacts/offlineArtifactRetentionGovernanceReviewArchive.service";
import {
  buildOfflineArtifactGovernanceArchiveChainFinalizationSummary,
  listOfflineArtifactGovernanceArchiveChainFinalizationReadinessForRetentionGovernanceArchive,
  listOfflineArtifactGovernanceArchiveChainFinalizationReadinessManifests,
  prepareOfflineArtifactGovernanceArchiveChainFinalizationReadiness,
} from "../../../intelligence/artifacts/offlineArtifactGovernanceArchiveChainFinalization.service";
import {
  buildOfflineArtifactFinalizationChainAuditSnapshotSummary,
  listOfflineArtifactFinalizationChainAuditSnapshotReadinessForFinalization,
  listOfflineArtifactFinalizationChainAuditSnapshotReadinessManifests,
  prepareOfflineArtifactFinalizationChainAuditSnapshotReadiness,
} from "../../../intelligence/artifacts/offlineArtifactFinalizationChainAuditSnapshot.service";
import {
  buildOfflineArtifactAuditSnapshotGovernanceSignoffSummary,
  listOfflineArtifactAuditSnapshotGovernanceSignoffReadinessManifests,
  listOfflineArtifactAuditSnapshotGovernanceSignoffsForAuditSnapshot,
  signoffOfflineArtifactAuditSnapshotGovernanceReadiness,
} from "../../../intelligence/artifacts/offlineArtifactAuditSnapshotGovernanceSignoff.service";
import {
  buildOfflineArtifactAuditSnapshotGovernanceArchiveSummary,
  listOfflineArtifactAuditSnapshotGovernanceArchiveReadinessForAuditSnapshotGovernanceSignoff,
  listOfflineArtifactAuditSnapshotGovernanceArchiveReadinessManifests,
  prepareOfflineArtifactAuditSnapshotGovernanceArchiveReadiness,
} from "../../../intelligence/artifacts/offlineArtifactAuditSnapshotGovernanceArchive.service";
import type { ArtifactIntakeStatus } from "../../../intelligence/artifacts/artifactIntakeTypes";
import type { IntelligenceRouteDeps } from "../types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

const allowedReviewStatuses: ArtifactIntakeStatus[] = [
  "needs_review",
  "approved_for_shadow_review",
  "rejected",
  "archived",
];

export const registerOfflineArtifacts16ArtifactArchiveRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {

  app.get(
    "/api/brain/ml-artifacts/offline-intake/archive-pack-summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactGovernanceSignoffArchivePackSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-artifacts/offline-intake/archive-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const archivePacks = await listOfflineArtifactGovernanceSignoffArchivePackReadinessManifests(req.query.limit);
        res.json({ success: true, data: { archivePacks, total: archivePacks.length, safety: getOfflineArtifactIntakeSafetyGate() } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-artifacts/offline-intake/governance-signoffs/:signoffId/archive-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const archivePacks = await listOfflineArtifactGovernanceSignoffArchivePackReadinessForSignoff(req.params.signoffId, req.query.limit);
        res.json({ success: true, data: { signoffId: req.params.signoffId, archivePacks, total: archivePacks.length, safety: getOfflineArtifactIntakeSafetyGate() } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/brain/ml-artifacts/offline-intake/governance-signoffs/:signoffId/archive-pack-readiness",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const result = await prepareOfflineArtifactGovernanceSignoffArchivePackReadiness({
          signoffId: req.params.signoffId,
          request: req.body || {},
          createdByUserId: readRequestUserId(req),
        });
        if (!result.accepted) {
          res.status(400).json({
            success: false,
            message: "Offline artifact governance signoff archive-pack readiness validation failed; no archive file was created, no artifact bytes were included, no retention job was scheduled, no deletion or purge was enabled, and no artifact was executed.",
            details: result.validationMessages,
            data: result,
          });
          return;
        }
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

};
