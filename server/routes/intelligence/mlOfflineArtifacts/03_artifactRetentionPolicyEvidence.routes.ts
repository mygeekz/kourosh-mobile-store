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

export const registerOfflineArtifacts03ArtifactRetentionPolicyEvidenceRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {





  app.get(
    "/api/brain/ml-artifacts/offline-intake/retention-policy-evidence-summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactArchivePackRetentionPolicyEvidenceSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-artifacts/offline-intake/retention-policy-evidence",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const retentionPolicyEvidence = await listOfflineArtifactArchivePackRetentionPolicyEvidenceReadinessManifests(req.query.limit);
        res.json({ success: true, data: { retentionPolicyEvidence, total: retentionPolicyEvidence.length, safety: getOfflineArtifactIntakeSafetyGate() } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-artifacts/offline-intake/archive-packs/:archivePackId/retention-policy-evidence",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const retentionPolicyEvidence = await listOfflineArtifactArchivePackRetentionPolicyEvidenceForArchivePack(req.params.archivePackId, req.query.limit);
        res.json({ success: true, data: { archivePackId: req.params.archivePackId, retentionPolicyEvidence, total: retentionPolicyEvidence.length, safety: getOfflineArtifactIntakeSafetyGate() } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/brain/ml-artifacts/offline-intake/archive-packs/:archivePackId/retention-policy-evidence",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const result = await prepareOfflineArtifactArchivePackRetentionPolicyEvidenceReadiness({
          archivePackId: req.params.archivePackId,
          request: req.body || {},
          createdByUserId: readRequestUserId(req),
        });
        if (!result.accepted) {
          res.status(400).json({
            success: false,
            message: "Offline artifact archive-pack retention policy evidence validation failed; no retention job was scheduled, no deletion or purge was enabled, no file was created, no artifact bytes were included, and no artifact was executed.",
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
