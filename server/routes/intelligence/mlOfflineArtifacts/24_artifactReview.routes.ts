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

export const registerOfflineArtifacts24ArtifactReviewRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {

  app.post(
    "/api/brain/ml-artifacts/offline-intake/:id/quarantine-review",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const result = await reviewOfflineArtifactQuarantineEvidence({
          artifactId: req.params.id,
          request: req.body || {},
          reviewerUserId: readRequestUserId(req),
        });
        if (!result.accepted) {
          res.status(400).json({
            success: false,
            message: "Offline artifact quarantine review validation failed; no artifact was executed, activated, or integrated.",
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


  app.post(
    "/api/brain/ml-artifacts/offline-intake/:id/review-status",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const status = String((req.body || {}).status || "") as ArtifactIntakeStatus;
        if (!allowedReviewStatuses.includes(status)) {
          res.status(400).json({
            success: false,
            message: "Invalid offline artifact review status.",
            details: allowedReviewStatuses,
          });
          return;
        }
        const body = req.body || {};
        const reviewDecision = status === "approved_for_shadow_review"
          ? "approve_for_shadow_review_only"
          : status === "rejected"
            ? "reject_quarantine_artifact"
            : status === "archived"
              ? "archive_without_activation"
              : "needs_more_evidence";
        const result = await reviewOfflineArtifactQuarantineEvidence({
          artifactId: req.params.id,
          request: {
            reviewDecision,
            reviewerNotes: String(body.reviewerNotes || body.notes || `Metadata-only quarantine review status update: ${status}`),
            rejectionReason: body.rejectionReason || (status === "rejected" ? "Rejected through offline quarantine review-status route." : null),
            reviewerDisplayName: body.reviewerDisplayName || null,
            validationFindingsJson: body.validationFindingsJson || {},
            lineageComparisonJson: body.lineageComparisonJson || {},
            evidenceJson: body.evidenceJson || { reviewStatusRoute: true, status, safetyAcknowledged: true },
            acknowledgedSafetyFlags: body.acknowledgedSafetyFlags || getOfflineArtifactIntakeSafetyGate(),
          },
          reviewerUserId: readRequestUserId(req),
        });
        if (!result.accepted) {
          res.status(400).json({
            success: false,
            message: "Offline artifact review status validation failed; no artifact was executed, activated, or integrated.",
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
