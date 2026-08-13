import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactRetentionGovernanceReviewArchiveDecision,
  OfflineArtifactRetentionGovernanceReviewArchiveStatus,
  OfflineArtifactRetentionGovernanceReviewArchiveValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_RETENTION_GOVERNANCE_REVIEW_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT = 850_000;

const allowedArchiveDecisions: OfflineArtifactRetentionGovernanceReviewArchiveDecision[] = [
  "needs_retention_archive_review",
  "prepare_retention_governance_archive_readiness",
  "reject_retention_governance_archive",
  "archive_retention_governance_metadata_only",
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
  decision: OfflineArtifactRetentionGovernanceReviewArchiveDecision,
): OfflineArtifactRetentionGovernanceReviewArchiveStatus => {
  switch (decision) {
    case "prepare_retention_governance_archive_readiness":
      return "prepared_retention_governance_archive";
    case "reject_retention_governance_archive":
      return "rejected";
    case "archive_retention_governance_metadata_only":
      return "archived";
    case "needs_retention_archive_review":
    default:
      return "needs_retention_archive_review";
  }
};

export function validateOfflineArtifactRetentionGovernanceReviewArchiveRequest(
  retentionGovernanceReviewIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactRetentionGovernanceReviewArchiveValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.retentionGovernanceReviewArchiveCanScheduleRetentionJobs ||
    safetyGate.retentionGovernanceReviewArchiveCanDeleteOrPurge ||
    safetyGate.retentionGovernanceReviewArchiveCanCreateFiles ||
    safetyGate.retentionGovernanceReviewArchiveCanIncludeArtifactBytes ||
    safetyGate.retentionGovernanceReviewArchiveCanExecuteArtifact ||
    safetyGate.retentionGovernanceReviewArchiveCanActivateArtifact ||
    safetyGate.retentionGovernanceReviewArchiveCanReleaseToProduction ||
    safetyGate.retentionGovernanceReviewArchiveCanMutateBusinessRecords
  ) {
    messages.push("Offline retention governance review archive readiness safety gate is not locked down.");
  }

  const retentionGovernanceReviewId = Number(retentionGovernanceReviewIdInput);
  if (!Number.isFinite(retentionGovernanceReviewId) || retentionGovernanceReviewId <= 0) {
    messages.push("retentionGovernanceReviewId must reference an existing offline retention governance review record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Retention governance review archive readiness request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const archiveDecision = trimText(request.archiveDecision) as OfflineArtifactRetentionGovernanceReviewArchiveDecision;
  if (!allowedArchiveDecisions.includes(archiveDecision)) {
    messages.push(`archiveDecision must be one of: ${allowedArchiveDecisions.join(", ")}.`);
  }

  const archivePurpose = trimText(request.archivePurpose) || "offline_retention_governance_review_archive_readiness";
  const archivistNotes = trimText(request.archivistNotes);
  const rejectionReason = trimText(request.rejectionReason) || null;
  const archivistDisplayName = trimText(request.archivistDisplayName) || null;

  if (!archivistNotes) messages.push("archivistNotes is required for retention governance archive readiness evidence.");
  if (archiveDecision === "reject_retention_governance_archive" && !rejectionReason) {
    messages.push("rejectionReason is required when retention governance archive readiness is rejected.");
  }

  const archiveManifestJson = isPlainObject(request.archiveManifestJson) ? request.archiveManifestJson : {};
  const reviewerTrailJson = isPlainObject(request.reviewerTrailJson) ? request.reviewerTrailJson : {};
  const retentionGovernanceChainJson = isPlainObject(request.retentionGovernanceChainJson) ? request.retentionGovernanceChainJson : {};
  const evidenceIndexJson = isPlainObject(request.evidenceIndexJson) ? request.evidenceIndexJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.archiveManifestJson !== undefined && !isPlainObject(request.archiveManifestJson)) messages.push("archiveManifestJson must be a JSON object when provided.");
  if (request.reviewerTrailJson !== undefined && !isPlainObject(request.reviewerTrailJson)) messages.push("reviewerTrailJson must be a JSON object when provided.");
  if (request.retentionGovernanceChainJson !== undefined && !isPlainObject(request.retentionGovernanceChainJson)) messages.push("retentionGovernanceChainJson must be a JSON object when provided.");
  if (request.evidenceIndexJson !== undefined && !isPlainObject(request.evidenceIndexJson)) messages.push("evidenceIndexJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (archiveDecision === "prepare_retention_governance_archive_readiness") {
    if (Object.keys(archiveManifestJson).length === 0) messages.push("archiveManifestJson is required for retention governance archive readiness evidence.");
    if (Object.keys(reviewerTrailJson).length === 0) messages.push("reviewerTrailJson is required for retention governance archive readiness evidence.");
    if (Object.keys(retentionGovernanceChainJson).length === 0) messages.push("retentionGovernanceChainJson is required for retention governance archive readiness evidence.");
    if (Object.keys(evidenceIndexJson).length === 0) messages.push("evidenceIndexJson is required for retention governance archive readiness evidence.");
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
  ];
  const unsafePayloads = [request, archiveManifestJson, reviewerTrailJson, retentionGovernanceChainJson, evidenceIndexJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Retention governance review archive readiness payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, or business mutation.");
  }

  let archiveReadinessEnvelopeSizeBytes = 0;
  try {
    archiveReadinessEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      retentionGovernanceReviewId,
      archiveDecision,
      archivePurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      archiveManifestJson,
      reviewerTrailJson,
      retentionGovernanceChainJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Retention governance review archive readiness envelope could not be canonicalized.");
  }
  if (archiveReadinessEnvelopeSizeBytes > OFFLINE_ARTIFACT_RETENTION_GOVERNANCE_REVIEW_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Retention governance review archive readiness envelope exceeds safe metadata-only limit (${archiveReadinessEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_RETENTION_GOVERNANCE_REVIEW_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Retention governance review archive readiness validated for offline metadata-only archive readiness."],
    normalized: {
      retentionGovernanceReviewId,
      archiveDecision,
      archiveStatus: decisionToStatus(archiveDecision),
      archivePurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      archiveManifestJson,
      reviewerTrailJson,
      retentionGovernanceChainJson,
      evidenceIndexJson,
      acknowledgedSafetyFlags,
      archiveReadinessEnvelopeSizeBytes,
    },
  };
}
