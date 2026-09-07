import {
  createOfflineArtifactReviewBinderGovernanceSignoffRecord,
  getOfflineArtifactReviewBinderGovernanceSignoffSummary,
  listOfflineArtifactReviewBinderGovernanceSignoffs,
  listOfflineArtifactReviewBinderGovernanceSignoffsByArtifactId,
  listOfflineArtifactReviewBinderGovernanceSignoffsByBinderId,
} from "../../db/domains/ml/mlOfflineArtifactReviewBinderGovernanceSignoffs.db";
import { getOfflineArtifactReviewBinderById } from "../../db/domains/ml/mlOfflineArtifactReviewBinders.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactReviewBinderGovernanceSignoffRequest } from "./artifactReviewBinderGovernanceSignoffValidation";
import type {
  NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput,
  OfflineArtifactReviewBinderGovernanceSignoffRecord,
  OfflineArtifactReviewBinderGovernanceSignoffResult,
  OfflineArtifactReviewBinderGovernanceSignoffSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedGovernanceSignoffResult = (
  binderId: string | number | null,
  validationMessages: string[],
): OfflineArtifactReviewBinderGovernanceSignoffResult => ({
  accepted: false,
  binderId,
  signoffId: null,
  signoffDecision: "needs_governance_review",
  signoffStatus: "needs_governance_review",
  signedGovernanceHash: null,
  exportFileCreated: false,
  artifactBytesIncluded: false,
  binderActivationAllowed: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
  validationMessages,
  safetyNotes: buildOfflineArtifactSafetyNotes(),
  createdAt: nowIso(),
});

const resultFromGovernanceSignoffRecord = (
  record: OfflineArtifactReviewBinderGovernanceSignoffRecord,
  validationMessages: string[],
): OfflineArtifactReviewBinderGovernanceSignoffResult => ({
  accepted: true,
  binderId: record.binderId,
  signoffId: record.id,
  signoffDecision: record.signoffDecision,
  signoffStatus: record.signoffStatus,
  signedGovernanceHash: record.signedGovernanceHash,
  exportFileCreated: false,
  artifactBytesIncluded: false,
  binderActivationAllowed: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
  validationMessages,
  safetyNotes: record.safetyNotes,
  createdAt: record.createdAt,
});

const buildGovernanceSignoffManifest = (
  binder: NonNullable<Awaited<ReturnType<typeof getOfflineArtifactReviewBinderById>>>,
  input: NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6D — Offline Artifact Review Binder Governance Signoff Readiness",
  mode: "metadata_signoff_only",
  binderId: binder.id,
  artifactId: binder.artifactId,
  artifactSha256: binder.artifactSha256,
  modelKey: binder.modelKey,
  modelVersion: binder.modelVersion,
  signedBinderHash: binder.signedBinderHash,
  signoffDecision: input.signoffDecision,
  signoffStatus: input.signoffStatus,
  signerNotes: input.signerNotes,
  rejectionReason: input.rejectionReason,
  signerDisplayName: input.signerDisplayName,
  governanceFindingsJson: input.governanceFindingsJson,
  evidenceCompletenessJson: input.evidenceCompletenessJson,
  riskAcceptanceJson: input.riskAcceptanceJson,
  acknowledgedSafetyFlags: input.acknowledgedSafetyFlags,
  safetyGate: getOfflineArtifactIntakeSafetyGate(),
  safetyNotes,
  exportFileCreated: false,
  artifactBytesIncluded: false,
  binderActivationAllowed: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
});

export async function signoffOfflineArtifactReviewBinderGovernanceReadiness(payload: {
  binderId: string | number;
  request: unknown;
  signerUserId?: string | number | null;
}): Promise<OfflineArtifactReviewBinderGovernanceSignoffResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactReviewBinderGovernanceSignoffRequest(payload.binderId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedGovernanceSignoffResult(payload.binderId, validation.messages);
  }

  const binder = await getOfflineArtifactReviewBinderById(validation.normalized.binderId);
  if (!binder) {
    return rejectedGovernanceSignoffResult(payload.binderId, ["Offline artifact review binder readiness record was not found for governance signoff."]);
  }
  if (binder.exportFileCreated || binder.artifactBytesIncluded) {
    return rejectedGovernanceSignoffResult(payload.binderId, ["Governance signoff refused because binder readiness record must be metadata-only with no exported file and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6D governance signoff is human metadata evidence only; it does not create files, include artifact bytes, execute artifacts, expose inference, activate binders, release to production, or mutate business records.",
  ];
  const governanceManifest = buildGovernanceSignoffManifest(binder, validation.normalized, safetyNotes);
  const signedGovernanceHash = computeArtifactEnvelopeSha256(governanceManifest);
  const record = await createOfflineArtifactReviewBinderGovernanceSignoffRecord({
    input: validation.normalized,
    signedGovernanceHash,
    safetyNotes,
    signerUserId: payload.signerUserId,
  });
  if (!record) {
    return rejectedGovernanceSignoffResult(payload.binderId, ["Offline artifact review binder governance signoff could not be recorded."]);
  }

  return resultFromGovernanceSignoffRecord(record, validation.messages);
}

export const listOfflineArtifactReviewBinderGovernanceSignoffEvidence = listOfflineArtifactReviewBinderGovernanceSignoffs;
export const listOfflineArtifactReviewBinderGovernanceSignoffEvidenceForBinder = listOfflineArtifactReviewBinderGovernanceSignoffsByBinderId;
export const listOfflineArtifactReviewBinderGovernanceSignoffEvidenceForArtifact = listOfflineArtifactReviewBinderGovernanceSignoffsByArtifactId;

export async function buildOfflineArtifactReviewBinderGovernanceSignoffSummary(): Promise<OfflineArtifactReviewBinderGovernanceSignoffSummary> {
  return getOfflineArtifactReviewBinderGovernanceSignoffSummary();
}
