import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactReviewBinderRequest } from "./artifactReviewBinderValidation";
import { getQuarantinedArtifactById } from "./artifactQuarantine.service";
import { getLatestOfflineArtifactQuarantineReviewEvidenceForArtifact } from "./offlineArtifactQuarantineReview.service";
import {
  createOfflineArtifactReviewBinderRecord,
  getLatestOfflineArtifactReviewBinderForArtifact,
  getOfflineArtifactReviewBinderSummary,
  listOfflineArtifactReviewBinders,
  listOfflineArtifactReviewBindersByArtifactId,
} from "../../db/domains/ml/mlOfflineArtifactReviewBinders.db";
import type {
  NormalizedOfflineArtifactReviewBinderInput,
  OfflineArtifactQuarantineReviewRecord,
  OfflineArtifactRecord,
  OfflineArtifactReviewBinderRecord,
  OfflineArtifactReviewBinderResult,
  OfflineArtifactReviewBinderSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const buildBinderManifest = (
  artifact: OfflineArtifactRecord,
  latestReview: OfflineArtifactQuarantineReviewRecord | null,
  input: NormalizedOfflineArtifactReviewBinderInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6C — Offline Artifact Review Binder Export Readiness",
  binderExportMode: "metadata_manifest_only",
  exportFileCreated: false,
  artifactBytesIncluded: false,
  artifact: {
    id: artifact.id,
    artifactName: artifact.artifactName,
    artifactKind: artifact.artifactKind,
    modelKey: artifact.modelKey,
    modelVersion: artifact.modelVersion,
    sha256: artifact.sha256,
    intakeStatus: artifact.intakeStatus,
    quarantineStatus: artifact.quarantineStatus,
    createdAt: artifact.createdAt,
  },
  latestReview: latestReview
    ? {
        id: latestReview.id,
        reviewDecision: latestReview.reviewDecision,
        reviewStatus: latestReview.reviewStatus,
        signedReviewHash: latestReview.signedReviewHash,
        createdAt: latestReview.createdAt,
      }
    : null,
  requestedSectionsJson: input.requestedSectionsJson,
  traceabilityManifestJson: input.traceabilityManifestJson,
  evidenceIndexJson: input.evidenceIndexJson,
  exportReadinessNotesJson: input.exportReadinessNotesJson,
  acknowledgedSafetyFlags: input.acknowledgedSafetyFlags,
  safetyGate: getOfflineArtifactIntakeSafetyGate(),
  safetyNotes,
});

const resultFromBinderRecord = (
  record: OfflineArtifactReviewBinderRecord,
  validationMessages: string[],
): OfflineArtifactReviewBinderResult => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  return {
    accepted: true,
    artifactId: record.artifactId,
    binderId: record.id,
    binderStatus: record.binderStatus,
    signedBinderHash: record.signedBinderHash,
    exportFileCreated: false,
    artifactBytesIncluded: false,
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

const rejectedBinderResult = (
  artifactId: string | number | null,
  messages: string[],
): OfflineArtifactReviewBinderResult => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  return {
    accepted: false,
    artifactId,
    binderId: null,
    binderStatus: "blocked",
    signedBinderHash: null,
    exportFileCreated: false,
    artifactBytesIncluded: false,
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

export async function prepareOfflineArtifactReviewBinderExportReadiness(payload: {
  artifactId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactReviewBinderResult> {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactReviewBinderRequest(payload.artifactId, payload.request, gate);
  if (!validation.valid || !validation.normalized) {
    return rejectedBinderResult(payload.artifactId, validation.messages);
  }

  const artifact = await getQuarantinedArtifactById(validation.normalized.artifactId);
  if (!artifact) {
    return rejectedBinderResult(payload.artifactId, ["Quarantined artifact record was not found; binder readiness manifest was not recorded."]);
  }

  const latestReview = await getLatestOfflineArtifactQuarantineReviewEvidenceForArtifact(artifact.id);
  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6C review binder export readiness signs metadata-only manifests.",
    "No binder export file is created; no artifact bytes are included; no artifact is executed, loaded, activated, promoted, inferred, or integrated with production.",
  ];
  const binderManifestJson = buildBinderManifest(artifact, latestReview, validation.normalized, safetyNotes);
  const signedBinderHash = computeArtifactEnvelopeSha256(binderManifestJson);
  const record = await createOfflineArtifactReviewBinderRecord({
    input: validation.normalized,
    binderManifestJson,
    signedBinderHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedBinderResult(payload.artifactId, ["Offline artifact review binder readiness manifest could not be recorded."]);
  }

  return resultFromBinderRecord(record, validation.messages);
}

export const listOfflineArtifactReviewBinderReadinessManifests = listOfflineArtifactReviewBinders;
export const listOfflineArtifactReviewBinderReadinessManifestsForArtifact = listOfflineArtifactReviewBindersByArtifactId;
export const getLatestOfflineArtifactReviewBinderReadinessManifestForArtifact = getLatestOfflineArtifactReviewBinderForArtifact;

export async function buildOfflineArtifactReviewBinderSummary(): Promise<OfflineArtifactReviewBinderSummary> {
  return getOfflineArtifactReviewBinderSummary();
}
