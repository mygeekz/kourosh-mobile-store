import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactAuditSnapshotGovernanceArchiveDecision,
  OfflineArtifactAuditSnapshotGovernanceArchiveStatus,
  OfflineArtifactAuditSnapshotGovernanceArchiveValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT = 900_000;

const allowedArchiveDecisions: OfflineArtifactAuditSnapshotGovernanceArchiveDecision[] = [
  "needs_audit_governance_archive_review",
  "prepare_audit_governance_archive_readiness",
  "reject_audit_governance_archive",
  "archive_audit_governance_metadata_only",
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
  decision: OfflineArtifactAuditSnapshotGovernanceArchiveDecision,
): OfflineArtifactAuditSnapshotGovernanceArchiveStatus => {
  switch (decision) {
    case "prepare_audit_governance_archive_readiness":
      return "prepared_audit_governance_archive";
    case "reject_audit_governance_archive":
      return "rejected";
    case "archive_audit_governance_metadata_only":
      return "archived";
    case "needs_audit_governance_archive_review":
    default:
      return "needs_audit_governance_archive_review";
  }
};

export function validateOfflineArtifactAuditSnapshotGovernanceArchiveRequest(
  auditSnapshotGovernanceSignoffIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactAuditSnapshotGovernanceArchiveValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.auditSnapshotGovernanceArchiveCanScheduleRetentionJobs ||
    safetyGate.auditSnapshotGovernanceArchiveCanDeleteOrPurge ||
    safetyGate.auditSnapshotGovernanceArchiveCanCreateFiles ||
    safetyGate.auditSnapshotGovernanceArchiveCanExportFiles ||
    safetyGate.auditSnapshotGovernanceArchiveCanIncludeArtifactBytes ||
    safetyGate.auditSnapshotGovernanceArchiveCanExecuteArtifact ||
    safetyGate.auditSnapshotGovernanceArchiveCanActivateArtifact ||
    safetyGate.auditSnapshotGovernanceArchiveCanReleaseToProduction ||
    safetyGate.auditSnapshotGovernanceArchiveCanMutateBusinessRecords
  ) {
    messages.push("Offline audit snapshot governance archive readiness safety gate is not locked down.");
  }

  const auditSnapshotGovernanceSignoffId = Number(auditSnapshotGovernanceSignoffIdInput);
  if (!Number.isFinite(auditSnapshotGovernanceSignoffId) || auditSnapshotGovernanceSignoffId <= 0) {
    messages.push("auditSnapshotGovernanceSignoffId must reference an existing offline audit snapshot governance signoff readiness record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Audit snapshot governance archive readiness request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const archiveDecision = trimText(request.archiveDecision) as OfflineArtifactAuditSnapshotGovernanceArchiveDecision;
  if (!allowedArchiveDecisions.includes(archiveDecision)) {
    messages.push(`archiveDecision must be one of: ${allowedArchiveDecisions.join(", ")}.`);
  }

  const archivePurpose = trimText(request.archivePurpose) || "offline_audit_snapshot_governance_archive_readiness";
  const archivistNotes = trimText(request.archivistNotes);
  const rejectionReason = trimText(request.rejectionReason) || null;
  const archivistDisplayName = trimText(request.archivistDisplayName) || null;

  if (!archivistNotes) messages.push("archivistNotes is required for audit snapshot governance archive readiness evidence.");
  if (archiveDecision === "reject_audit_governance_archive" && !rejectionReason) {
    messages.push("rejectionReason is required when audit snapshot governance archive readiness is rejected.");
  }

  const governanceArchiveManifestJson = isPlainObject(request.governanceArchiveManifestJson) ? request.governanceArchiveManifestJson : {};
  const signerTrailJson = isPlainObject(request.signerTrailJson) ? request.signerTrailJson : {};
  const exceptionSummaryJson = isPlainObject(request.exceptionSummaryJson) ? request.exceptionSummaryJson : {};
  const evidenceConfidenceDigestJson = isPlainObject(request.evidenceConfidenceDigestJson) ? request.evidenceConfidenceDigestJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.governanceArchiveManifestJson !== undefined && !isPlainObject(request.governanceArchiveManifestJson)) messages.push("governanceArchiveManifestJson must be a JSON object when provided.");
  if (request.signerTrailJson !== undefined && !isPlainObject(request.signerTrailJson)) messages.push("signerTrailJson must be a JSON object when provided.");
  if (request.exceptionSummaryJson !== undefined && !isPlainObject(request.exceptionSummaryJson)) messages.push("exceptionSummaryJson must be a JSON object when provided.");
  if (request.evidenceConfidenceDigestJson !== undefined && !isPlainObject(request.evidenceConfidenceDigestJson)) messages.push("evidenceConfidenceDigestJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (archiveDecision === "prepare_audit_governance_archive_readiness") {
    if (Object.keys(governanceArchiveManifestJson).length === 0) messages.push("governanceArchiveManifestJson is required for audit snapshot governance archive readiness.");
    if (Object.keys(signerTrailJson).length === 0) messages.push("signerTrailJson is required for audit snapshot governance archive readiness.");
    if (Object.keys(evidenceConfidenceDigestJson).length === 0) messages.push("evidenceConfidenceDigestJson is required for audit snapshot governance archive readiness.");
  }

  const unsafeKeys = [
    "execute", "execution", "infer", "inference", "activate", "activation", "promote", "promotion",
    "deploy", "production", "mutate", "inventory", "accounting", "ledger", "pricing", "reports",
    "retentionjob", "retention_job", "delete", "deletion", "purge", "fileexport", "file_export",
    "exportfile", "createfile", "archivefile", "artifactbytes", "artifact_bytes", "readbytes", "lockchain", "immutablylock",
  ];
  const unsafePayloads = [request, governanceArchiveManifestJson, signerTrailJson, exceptionSummaryJson, evidenceConfidenceDigestJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Audit snapshot governance archive readiness payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, chain locking, or business mutation.");
  }

  let governanceArchiveEnvelopeSizeBytes = 0;
  try {
    governanceArchiveEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      auditSnapshotGovernanceSignoffId,
      archiveDecision,
      archivePurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      governanceArchiveManifestJson,
      signerTrailJson,
      exceptionSummaryJson,
      evidenceConfidenceDigestJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Audit snapshot governance archive readiness envelope could not be canonicalized.");
  }
  if (governanceArchiveEnvelopeSizeBytes > OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Audit snapshot governance archive readiness envelope exceeds safe metadata-only limit (${governanceArchiveEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_ARCHIVE_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Audit snapshot governance archive readiness validated for offline metadata-only archival readiness."],
    normalized: {
      auditSnapshotGovernanceSignoffId,
      archiveDecision,
      archiveStatus: decisionToStatus(archiveDecision),
      archivePurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      governanceArchiveManifestJson,
      signerTrailJson,
      exceptionSummaryJson,
      evidenceConfidenceDigestJson,
      acknowledgedSafetyFlags,
      governanceArchiveEnvelopeSizeBytes,
    },
  };
}
