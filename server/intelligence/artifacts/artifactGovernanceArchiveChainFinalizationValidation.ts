import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactGovernanceArchiveChainFinalizationDecision,
  OfflineArtifactGovernanceArchiveChainFinalizationStatus,
  OfflineArtifactGovernanceArchiveChainFinalizationValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_GOVERNANCE_ARCHIVE_CHAIN_FINALIZATION_SAFE_ENVELOPE_BYTES_LIMIT = 900_000;

const allowedFinalizationDecisions: OfflineArtifactGovernanceArchiveChainFinalizationDecision[] = [
  "needs_finalization_review",
  "prepare_governance_archive_chain_finalization_readiness",
  "reject_governance_archive_chain_finalization",
  "archive_chain_finalization_metadata_only",
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const trimText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const objectHasTruthyUnsafeKey = (value: unknown, unsafeKeys: string[]): boolean => {
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(([key, entryValue]) => {
    const normalizedKey = key.toLowerCase();
    const unsafeKeyMatched = unsafeKeys.some((unsafe) => normalizedKey.includes(unsafe));
    if (unsafeKeyMatched && entryValue === true) return true;
    if (isPlainObject(entryValue)) return objectHasTruthyUnsafeKey(entryValue, unsafeKeys);
    if (Array.isArray(entryValue)) return entryValue.some((item) => objectHasTruthyUnsafeKey(item, unsafeKeys));
    return false;
  });
};

const decisionToStatus = (
  decision: OfflineArtifactGovernanceArchiveChainFinalizationDecision,
): OfflineArtifactGovernanceArchiveChainFinalizationStatus => {
  switch (decision) {
    case "prepare_governance_archive_chain_finalization_readiness":
      return "prepared_governance_archive_chain_finalization";
    case "reject_governance_archive_chain_finalization":
      return "rejected";
    case "archive_chain_finalization_metadata_only":
      return "archived";
    case "needs_finalization_review":
    default:
      return "needs_finalization_review";
  }
};

export function validateOfflineArtifactGovernanceArchiveChainFinalizationRequest(
  retentionGovernanceArchiveIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactGovernanceArchiveChainFinalizationValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.governanceArchiveChainFinalizationCanScheduleRetentionJobs ||
    safetyGate.governanceArchiveChainFinalizationCanDeleteOrPurge ||
    safetyGate.governanceArchiveChainFinalizationCanCreateFiles ||
    safetyGate.governanceArchiveChainFinalizationCanIncludeArtifactBytes ||
    safetyGate.governanceArchiveChainFinalizationCanExecuteArtifact ||
    safetyGate.governanceArchiveChainFinalizationCanActivateArtifact ||
    safetyGate.governanceArchiveChainFinalizationCanReleaseToProduction ||
    safetyGate.governanceArchiveChainFinalizationCanMutateBusinessRecords
  ) {
    messages.push("Offline governance archive chain finalization readiness safety gate is not locked down.");
  }

  const retentionGovernanceArchiveId = Number(retentionGovernanceArchiveIdInput);
  if (!Number.isFinite(retentionGovernanceArchiveId) || retentionGovernanceArchiveId <= 0) {
    messages.push("retentionGovernanceArchiveId must reference an existing offline retention governance archive readiness record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Governance archive chain finalization readiness request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const finalizationDecision = trimText(request.finalizationDecision) as OfflineArtifactGovernanceArchiveChainFinalizationDecision;
  if (!allowedFinalizationDecisions.includes(finalizationDecision)) {
    messages.push(`finalizationDecision must be one of: ${allowedFinalizationDecisions.join(", ")}.`);
  }

  const finalizationPurpose = trimText(request.finalizationPurpose) || "offline_governance_archive_chain_finalization_readiness";
  const finalReviewerNotes = trimText(request.finalReviewerNotes);
  const rejectionReason = trimText(request.rejectionReason) || null;
  const finalReviewerDisplayName = trimText(request.finalReviewerDisplayName) || null;

  if (!finalReviewerNotes) messages.push("finalReviewerNotes is required for governance archive chain finalization readiness evidence.");
  if (finalizationDecision === "reject_governance_archive_chain_finalization" && !rejectionReason) {
    messages.push("rejectionReason is required when governance archive chain finalization readiness is rejected.");
  }

  const chainCompletenessJson = isPlainObject(request.chainCompletenessJson) ? request.chainCompletenessJson : {};
  const finalReviewerAcknowledgementJson = isPlainObject(request.finalReviewerAcknowledgementJson) ? request.finalReviewerAcknowledgementJson : {};
  const immutableEvidenceSummaryJson = isPlainObject(request.immutableEvidenceSummaryJson) ? request.immutableEvidenceSummaryJson : {};
  const evidenceIndexJson = isPlainObject(request.evidenceIndexJson) ? request.evidenceIndexJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.chainCompletenessJson !== undefined && !isPlainObject(request.chainCompletenessJson)) messages.push("chainCompletenessJson must be a JSON object when provided.");
  if (request.finalReviewerAcknowledgementJson !== undefined && !isPlainObject(request.finalReviewerAcknowledgementJson)) messages.push("finalReviewerAcknowledgementJson must be a JSON object when provided.");
  if (request.immutableEvidenceSummaryJson !== undefined && !isPlainObject(request.immutableEvidenceSummaryJson)) messages.push("immutableEvidenceSummaryJson must be a JSON object when provided.");
  if (request.evidenceIndexJson !== undefined && !isPlainObject(request.evidenceIndexJson)) messages.push("evidenceIndexJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (finalizationDecision === "prepare_governance_archive_chain_finalization_readiness") {
    if (Object.keys(chainCompletenessJson).length === 0) messages.push("chainCompletenessJson is required for governance archive chain finalization readiness evidence.");
    if (Object.keys(finalReviewerAcknowledgementJson).length === 0) messages.push("finalReviewerAcknowledgementJson is required for governance archive chain finalization readiness evidence.");
    if (Object.keys(immutableEvidenceSummaryJson).length === 0) messages.push("immutableEvidenceSummaryJson is required for governance archive chain finalization readiness evidence.");
    if (Object.keys(evidenceIndexJson).length === 0) messages.push("evidenceIndexJson is required for governance archive chain finalization readiness evidence.");
  }

  const unsafeKeys = [
    "execute",
    "execution",
    "infer",
    "inference",
    "activate",
    "activation",
    "promote",
    "promotion",
    "deploy",
    "production",
    "mutate",
    "inventory",
    "accounting",
    "ledger",
    "pricing",
    "reports",
    "retentionjob",
    "retention_job",
    "delete",
    "deletion",
    "purge",
    "fileexport",
    "file_export",
    "createfile",
    "archivefile",
    "artifactbytes",
    "artifact_bytes",
    "lockchain",
    "immutablylock",
  ];
  const unsafePayloads = [request, chainCompletenessJson, finalReviewerAcknowledgementJson, immutableEvidenceSummaryJson, evidenceIndexJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Governance archive chain finalization readiness payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, chain locking, or business mutation.");
  }

  let finalizationEnvelopeSizeBytes = 0;
  try {
    finalizationEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      retentionGovernanceArchiveId,
      finalizationDecision,
      finalizationPurpose,
      finalReviewerNotes,
      rejectionReason,
      finalReviewerDisplayName,
      chainCompletenessJson,
      finalReviewerAcknowledgementJson,
      immutableEvidenceSummaryJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Governance archive chain finalization readiness envelope could not be canonicalized.");
  }
  if (finalizationEnvelopeSizeBytes > OFFLINE_ARTIFACT_GOVERNANCE_ARCHIVE_CHAIN_FINALIZATION_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Governance archive chain finalization readiness envelope exceeds safe metadata-only limit (${finalizationEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_GOVERNANCE_ARCHIVE_CHAIN_FINALIZATION_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Governance archive chain finalization readiness validated for offline metadata-only finalization readiness."],
    normalized: {
      retentionGovernanceArchiveId,
      finalizationDecision,
      finalizationStatus: decisionToStatus(finalizationDecision),
      finalizationPurpose,
      finalReviewerNotes,
      rejectionReason,
      finalReviewerDisplayName,
      chainCompletenessJson,
      finalReviewerAcknowledgementJson,
      immutableEvidenceSummaryJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
      finalizationEnvelopeSizeBytes,
    },
  };
}
