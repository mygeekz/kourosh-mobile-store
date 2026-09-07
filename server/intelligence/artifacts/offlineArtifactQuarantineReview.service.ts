import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactQuarantineReviewRequest } from "./artifactQuarantineReviewValidation";
import {
  applyOfflineArtifactReviewStatusToArtifact,
  createOfflineArtifactQuarantineReviewRecord,
  getLatestOfflineArtifactQuarantineReviewForArtifact,
  getOfflineArtifactQuarantineReviewSummary,
  listOfflineArtifactQuarantineReviews,
  listOfflineArtifactQuarantineReviewsByArtifactId,
} from "../../db/domains/ml/mlOfflineArtifactReviews.db";
import { getQuarantinedArtifactById } from "./artifactQuarantine.service";
import type {
  ArtifactIntakeStatus,
  ArtifactQuarantineStatus,
  NormalizedOfflineArtifactQuarantineReviewInput,
  OfflineArtifactQuarantineReviewRecord,
  OfflineArtifactQuarantineReviewResult,
  OfflineArtifactQuarantineReviewSummary,
  OfflineArtifactRecord,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const artifactStatusForReviewStatus = (status: string): { intakeStatus: ArtifactIntakeStatus; quarantineStatus: ArtifactQuarantineStatus } => {
  if (status === "approved_for_shadow_review") return { intakeStatus: "approved_for_shadow_review", quarantineStatus: "released_for_shadow_review" };
  if (status === "rejected") return { intakeStatus: "rejected", quarantineStatus: "rejected" };
  if (status === "archived") return { intakeStatus: "archived", quarantineStatus: "archived" };
  return { intakeStatus: "needs_review", quarantineStatus: "quarantined" };
};

const buildSignedReviewEnvelope = (
  artifact: OfflineArtifactRecord,
  input: NormalizedOfflineArtifactQuarantineReviewInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6B — Offline Artifact Validation & Quarantine Review",
  artifact: {
    id: artifact.id,
    artifactName: artifact.artifactName,
    artifactKind: artifact.artifactKind,
    modelKey: artifact.modelKey,
    modelVersion: artifact.modelVersion,
    sha256: artifact.sha256,
    quarantineStatus: artifact.quarantineStatus,
    intakeStatus: artifact.intakeStatus,
  },
  review: {
    reviewDecision: input.reviewDecision,
    reviewStatus: input.reviewStatus,
    reviewerNotes: input.reviewerNotes,
    rejectionReason: input.rejectionReason,
    reviewerDisplayName: input.reviewerDisplayName,
    validationFindingsJson: input.validationFindingsJson,
    lineageComparisonJson: input.lineageComparisonJson,
    evidenceJson: input.evidenceJson,
    acknowledgedSafetyFlags: input.acknowledgedSafetyFlags,
  },
  safetyNotes,
  safetyGate: getOfflineArtifactIntakeSafetyGate(),
});

const resultFromReviewRecord = (
  record: OfflineArtifactQuarantineReviewRecord,
  validationMessages: string[],
): OfflineArtifactQuarantineReviewResult => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  return {
    accepted: true,
    artifactId: record.artifactId,
    reviewId: record.id,
    reviewDecision: record.reviewDecision,
    reviewStatus: record.reviewStatus,
    signedReviewHash: record.signedReviewHash,
    artifactExecutionAllowed: gate.artifactExecutionAllowed,
    artifactAutoActivationAllowed: gate.artifactAutoActivationAllowed,
    modelExecutionAllowed: gate.modelExecutionAllowed,
    inferenceEndpointExposed: gate.inferenceEndpointExposed,
    productionIntegrationAllowed: gate.productionIntegrationAllowed,
    canMutateBusinessRecords: gate.canMutateBusinessRecords,
    validationMessages,
    safetyNotes: record.safetyNotes.length ? record.safetyNotes : buildOfflineArtifactSafetyNotes(),
    createdAt: record.createdAt || nowIso(),
  };
};

const rejectedReviewResult = (
  artifactId: string | number | null,
  messages: string[],
): OfflineArtifactQuarantineReviewResult => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  return {
    accepted: false,
    artifactId,
    reviewId: null,
    reviewDecision: "needs_more_evidence",
    reviewStatus: "rejected",
    signedReviewHash: null,
    artifactExecutionAllowed: gate.artifactExecutionAllowed,
    artifactAutoActivationAllowed: gate.artifactAutoActivationAllowed,
    modelExecutionAllowed: gate.modelExecutionAllowed,
    inferenceEndpointExposed: gate.inferenceEndpointExposed,
    productionIntegrationAllowed: gate.productionIntegrationAllowed,
    canMutateBusinessRecords: gate.canMutateBusinessRecords,
    validationMessages: messages,
    safetyNotes: buildOfflineArtifactSafetyNotes(),
    createdAt: nowIso(),
  };
};

export async function reviewOfflineArtifactQuarantineEvidence(payload: {
  artifactId: string | number;
  request: unknown;
  reviewerUserId?: string | number | null;
}): Promise<OfflineArtifactQuarantineReviewResult> {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactQuarantineReviewRequest(payload.artifactId, payload.request, gate);
  if (!validation.valid || !validation.normalized) {
    return rejectedReviewResult(payload.artifactId, validation.messages);
  }

  const artifact = await getQuarantinedArtifactById(validation.normalized.artifactId);
  if (!artifact) {
    return rejectedReviewResult(payload.artifactId, ["Quarantined artifact record was not found; review evidence was not recorded."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    `reviewDecision=${validation.normalized.reviewDecision}`,
    `reviewStatus=${validation.normalized.reviewStatus}`,
    "Phase 6B review evidence signs metadata-only; it does not execute, load, activate, promote, infer, or mutate business records.",
  ];
  const signedReviewHash = computeArtifactEnvelopeSha256(buildSignedReviewEnvelope(artifact, validation.normalized, safetyNotes));
  const record = await createOfflineArtifactQuarantineReviewRecord({
    input: validation.normalized,
    signedReviewHash,
    safetyNotes,
    reviewerUserId: payload.reviewerUserId,
  });
  if (!record) {
    return rejectedReviewResult(payload.artifactId, ["Quarantine review evidence could not be recorded."]);
  }

  const status = artifactStatusForReviewStatus(validation.normalized.reviewStatus);
  await applyOfflineArtifactReviewStatusToArtifact({
    artifactId: artifact.id,
    intakeStatus: status.intakeStatus,
    quarantineStatus: status.quarantineStatus,
    safetyNotes,
  });

  return resultFromReviewRecord(record, validation.messages);
}

export const listOfflineArtifactQuarantineReviewEvidence = listOfflineArtifactQuarantineReviews;
export const listOfflineArtifactQuarantineReviewEvidenceForArtifact = listOfflineArtifactQuarantineReviewsByArtifactId;
export const getLatestOfflineArtifactQuarantineReviewEvidenceForArtifact = getLatestOfflineArtifactQuarantineReviewForArtifact;

export async function buildOfflineArtifactQuarantineReviewSummary(): Promise<OfflineArtifactQuarantineReviewSummary> {
  return getOfflineArtifactQuarantineReviewSummary();
}
