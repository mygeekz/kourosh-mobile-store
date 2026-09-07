import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactFinalizationChainAuditSnapshotDecision,
  OfflineArtifactFinalizationChainAuditSnapshotStatus,
  OfflineArtifactFinalizationChainAuditSnapshotValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_FINALIZATION_CHAIN_AUDIT_SNAPSHOT_SAFE_ENVELOPE_BYTES_LIMIT = 900_000;

const allowedAuditSnapshotDecisions: OfflineArtifactFinalizationChainAuditSnapshotDecision[] = [
  "needs_audit_snapshot_review",
  "prepare_finalization_chain_audit_snapshot_readiness",
  "reject_finalization_chain_audit_snapshot",
  "archive_audit_snapshot_metadata_only",
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
  decision: OfflineArtifactFinalizationChainAuditSnapshotDecision,
): OfflineArtifactFinalizationChainAuditSnapshotStatus => {
  switch (decision) {
    case "prepare_finalization_chain_audit_snapshot_readiness":
      return "prepared_finalization_chain_audit_snapshot";
    case "reject_finalization_chain_audit_snapshot":
      return "rejected";
    case "archive_audit_snapshot_metadata_only":
      return "archived";
    case "needs_audit_snapshot_review":
    default:
      return "needs_audit_snapshot_review";
  }
};

const normalizeSnapshotTimestamp = (input: unknown): string => {
  const trimmed = trimText(input);
  if (!trimmed) return new Date().toISOString();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

export function validateOfflineArtifactFinalizationChainAuditSnapshotRequest(
  finalizationIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactFinalizationChainAuditSnapshotValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.finalizationChainAuditSnapshotCanScheduleRetentionJobs ||
    safetyGate.finalizationChainAuditSnapshotCanDeleteOrPurge ||
    safetyGate.finalizationChainAuditSnapshotCanCreateFiles ||
    safetyGate.finalizationChainAuditSnapshotCanExportFiles ||
    safetyGate.finalizationChainAuditSnapshotCanIncludeArtifactBytes ||
    safetyGate.finalizationChainAuditSnapshotCanExecuteArtifact ||
    safetyGate.finalizationChainAuditSnapshotCanActivateArtifact ||
    safetyGate.finalizationChainAuditSnapshotCanReleaseToProduction ||
    safetyGate.finalizationChainAuditSnapshotCanMutateBusinessRecords
  ) {
    messages.push("Offline finalization chain audit snapshot readiness safety gate is not locked down.");
  }

  const finalizationId = Number(finalizationIdInput);
  if (!Number.isFinite(finalizationId) || finalizationId <= 0) {
    messages.push("finalizationId must reference an existing offline governance archive chain finalization readiness record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Finalization chain audit snapshot readiness request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const auditSnapshotDecision = trimText(request.auditSnapshotDecision) as OfflineArtifactFinalizationChainAuditSnapshotDecision;
  if (!allowedAuditSnapshotDecisions.includes(auditSnapshotDecision)) {
    messages.push(`auditSnapshotDecision must be one of: ${allowedAuditSnapshotDecisions.join(", ")}.`);
  }

  const snapshotPurpose = trimText(request.snapshotPurpose) || "offline_finalization_chain_audit_snapshot_readiness";
  const snapshotTimestamp = normalizeSnapshotTimestamp(request.snapshotTimestamp);
  const auditReviewerNotes = trimText(request.auditReviewerNotes);
  const rejectionReason = trimText(request.rejectionReason) || null;
  const auditReviewerDisplayName = trimText(request.auditReviewerDisplayName) || null;

  if (!snapshotTimestamp) messages.push("snapshotTimestamp must be an ISO-compatible timestamp when provided.");
  if (!auditReviewerNotes) messages.push("auditReviewerNotes is required for finalization chain audit snapshot readiness evidence.");
  if (auditSnapshotDecision === "reject_finalization_chain_audit_snapshot" && !rejectionReason) {
    messages.push("rejectionReason is required when finalization chain audit snapshot readiness is rejected.");
  }

  const finalChainDigestJson = isPlainObject(request.finalChainDigestJson) ? request.finalChainDigestJson : {};
  const reviewerTrailDigestJson = isPlainObject(request.reviewerTrailDigestJson) ? request.reviewerTrailDigestJson : {};
  const immutableEvidenceSummaryJson = isPlainObject(request.immutableEvidenceSummaryJson) ? request.immutableEvidenceSummaryJson : {};
  const evidenceIndexJson = isPlainObject(request.evidenceIndexJson) ? request.evidenceIndexJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.finalChainDigestJson !== undefined && !isPlainObject(request.finalChainDigestJson)) messages.push("finalChainDigestJson must be a JSON object when provided.");
  if (request.reviewerTrailDigestJson !== undefined && !isPlainObject(request.reviewerTrailDigestJson)) messages.push("reviewerTrailDigestJson must be a JSON object when provided.");
  if (request.immutableEvidenceSummaryJson !== undefined && !isPlainObject(request.immutableEvidenceSummaryJson)) messages.push("immutableEvidenceSummaryJson must be a JSON object when provided.");
  if (request.evidenceIndexJson !== undefined && !isPlainObject(request.evidenceIndexJson)) messages.push("evidenceIndexJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (auditSnapshotDecision === "prepare_finalization_chain_audit_snapshot_readiness") {
    if (Object.keys(finalChainDigestJson).length === 0) messages.push("finalChainDigestJson is required for finalization chain audit snapshot readiness evidence.");
    if (Object.keys(reviewerTrailDigestJson).length === 0) messages.push("reviewerTrailDigestJson is required for finalization chain audit snapshot readiness evidence.");
    if (Object.keys(immutableEvidenceSummaryJson).length === 0) messages.push("immutableEvidenceSummaryJson is required for finalization chain audit snapshot readiness evidence.");
    if (Object.keys(evidenceIndexJson).length === 0) messages.push("evidenceIndexJson is required for finalization chain audit snapshot readiness evidence.");
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
    "exportfile",
    "createfile",
    "archivefile",
    "artifactbytes",
    "artifact_bytes",
    "readbytes",
    "lockchain",
    "immutablylock",
  ];
  const unsafePayloads = [request, finalChainDigestJson, reviewerTrailDigestJson, immutableEvidenceSummaryJson, evidenceIndexJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Finalization chain audit snapshot readiness payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, chain locking, or business mutation.");
  }

  let auditSnapshotEnvelopeSizeBytes = 0;
  try {
    auditSnapshotEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      finalizationId,
      auditSnapshotDecision,
      snapshotPurpose,
      snapshotTimestamp,
      auditReviewerNotes,
      rejectionReason,
      auditReviewerDisplayName,
      finalChainDigestJson,
      reviewerTrailDigestJson,
      immutableEvidenceSummaryJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Finalization chain audit snapshot readiness envelope could not be canonicalized.");
  }
  if (auditSnapshotEnvelopeSizeBytes > OFFLINE_ARTIFACT_FINALIZATION_CHAIN_AUDIT_SNAPSHOT_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Finalization chain audit snapshot readiness envelope exceeds safe metadata-only limit (${auditSnapshotEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_FINALIZATION_CHAIN_AUDIT_SNAPSHOT_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Finalization chain audit snapshot readiness validated for offline metadata-only audit snapshot readiness."],
    normalized: {
      finalizationId,
      auditSnapshotDecision,
      auditSnapshotStatus: decisionToStatus(auditSnapshotDecision),
      snapshotPurpose,
      snapshotTimestamp,
      auditReviewerNotes,
      rejectionReason,
      auditReviewerDisplayName,
      finalChainDigestJson,
      reviewerTrailDigestJson,
      immutableEvidenceSummaryJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
      auditSnapshotEnvelopeSizeBytes,
    },
  };
}
