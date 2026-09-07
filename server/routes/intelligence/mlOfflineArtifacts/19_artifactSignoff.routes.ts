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

export const registerOfflineArtifacts19ArtifactSignoffRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {

  app.get(
    "/api/brain/ml-artifacts/offline-intake/binders/:binderId/governance-signoffs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const signoffs = await listOfflineArtifactReviewBinderGovernanceSignoffEvidenceForBinder(req.params.binderId, req.query.limit);
        res.json({ success: true, data: { binderId: req.params.binderId, signoffs, total: signoffs.length, safety: getOfflineArtifactIntakeSafetyGate() } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/brain/ml-artifacts/offline-intake/binders/:binderId/governance-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const result = await signoffOfflineArtifactReviewBinderGovernanceReadiness({
          binderId: req.params.binderId,
          request: req.body || {},
          signerUserId: readRequestUserId(req),
        });
        if (!result.accepted) {
          res.status(400).json({
            success: false,
            message: "Offline artifact review binder governance signoff validation failed; no file was exported, no artifact bytes were included, no binder was activated, and no artifact was executed.",
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
