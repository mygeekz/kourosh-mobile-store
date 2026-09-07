import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactAuditSnapshotGovernanceSignoffDecision,
  OfflineArtifactAuditSnapshotGovernanceSignoffStatus,
  OfflineArtifactAuditSnapshotGovernanceSignoffValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_SAFE_ENVELOPE_BYTES_LIMIT = 900_000;

const allowedSignoffDecisions: OfflineArtifactAuditSnapshotGovernanceSignoffDecision[] = [
  "needs_audit_snapshot_governance_review",
  "accept_audit_snapshot_metadata_only",
  "reject_audit_snapshot_governance_signoff",
  "archive_audit_snapshot_governance_metadata_only",
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
  decision: OfflineArtifactAuditSnapshotGovernanceSignoffDecision,
): OfflineArtifactAuditSnapshotGovernanceSignoffStatus => {
  switch (decision) {
    case "accept_audit_snapshot_metadata_only":
      return "accepted_audit_snapshot_governance_signoff";
    case "reject_audit_snapshot_governance_signoff":
      return "rejected";
    case "archive_audit_snapshot_governance_metadata_only":
      return "archived";
    case "needs_audit_snapshot_governance_review":
    default:
      return "needs_audit_snapshot_governance_review";
  }
};

export function validateOfflineArtifactAuditSnapshotGovernanceSignoffRequest(
  auditSnapshotIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactAuditSnapshotGovernanceSignoffValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.auditSnapshotGovernanceSignoffCanScheduleRetentionJobs ||
    safetyGate.auditSnapshotGovernanceSignoffCanDeleteOrPurge ||
    safetyGate.auditSnapshotGovernanceSignoffCanCreateFiles ||
    safetyGate.auditSnapshotGovernanceSignoffCanExportFiles ||
    safetyGate.auditSnapshotGovernanceSignoffCanIncludeArtifactBytes ||
    safetyGate.auditSnapshotGovernanceSignoffCanExecuteArtifact ||
    safetyGate.auditSnapshotGovernanceSignoffCanActivateArtifact ||
    safetyGate.auditSnapshotGovernanceSignoffCanReleaseToProduction ||
    safetyGate.auditSnapshotGovernanceSignoffCanMutateBusinessRecords
  ) {
    messages.push("Offline audit snapshot governance signoff readiness safety gate is not locked down.");
  }

  const auditSnapshotId = Number(auditSnapshotIdInput);
  if (!Number.isFinite(auditSnapshotId) || auditSnapshotId <= 0) {
    messages.push("auditSnapshotId must reference an existing offline finalization chain audit snapshot readiness record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Audit snapshot governance signoff readiness request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const signoffDecision = trimText(request.signoffDecision) as OfflineArtifactAuditSnapshotGovernanceSignoffDecision;
  if (!allowedSignoffDecisions.includes(signoffDecision)) {
    messages.push(`signoffDecision must be one of: ${allowedSignoffDecisions.join(", ")}.`);
  }

  const signoffPurpose = trimText(request.signoffPurpose) || "offline_audit_snapshot_governance_signoff_readiness";
  const auditReviewerSignoffNotes = trimText(request.auditReviewerSignoffNotes);
  const exceptionNotes = trimText(request.exceptionNotes) || null;
  const rejectionReason = trimText(request.rejectionReason) || null;
  const governanceSignerDisplayName = trimText(request.governanceSignerDisplayName) || null;

  if (!auditReviewerSignoffNotes) messages.push("auditReviewerSignoffNotes is required for audit snapshot governance signoff readiness evidence.");
  if (signoffDecision === "reject_audit_snapshot_governance_signoff" && !rejectionReason) {
    messages.push("rejectionReason is required when audit snapshot governance signoff readiness is rejected.");
  }

  const snapshotAcceptanceJson = isPlainObject(request.snapshotAcceptanceJson) ? request.snapshotAcceptanceJson : {};
  const evidenceConfidenceJson = isPlainObject(request.evidenceConfidenceJson) ? request.evidenceConfidenceJson : {};
  const exceptionNotesJson = isPlainObject(request.exceptionNotesJson) ? request.exceptionNotesJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.snapshotAcceptanceJson !== undefined && !isPlainObject(request.snapshotAcceptanceJson)) messages.push("snapshotAcceptanceJson must be a JSON object when provided.");
  if (request.evidenceConfidenceJson !== undefined && !isPlainObject(request.evidenceConfidenceJson)) messages.push("evidenceConfidenceJson must be a JSON object when provided.");
  if (request.exceptionNotesJson !== undefined && !isPlainObject(request.exceptionNotesJson)) messages.push("exceptionNotesJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (signoffDecision === "accept_audit_snapshot_metadata_only") {
    if (Object.keys(snapshotAcceptanceJson).length === 0) messages.push("snapshotAcceptanceJson is required for audit snapshot acceptance decision metadata.");
    if (Object.keys(evidenceConfidenceJson).length === 0) messages.push("evidenceConfidenceJson is required for audit snapshot governance signoff readiness evidence.");
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
  const unsafePayloads = [request, snapshotAcceptanceJson, evidenceConfidenceJson, exceptionNotesJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Audit snapshot governance signoff readiness payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, chain locking, or business mutation.");
  }

  let governanceSignoffEnvelopeSizeBytes = 0;
  try {
    governanceSignoffEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      auditSnapshotId,
      signoffDecision,
      signoffPurpose,
      auditReviewerSignoffNotes,
      exceptionNotes,
      rejectionReason,
      governanceSignerDisplayName,
      snapshotAcceptanceJson,
      evidenceConfidenceJson,
      exceptionNotesJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Audit snapshot governance signoff readiness envelope could not be canonicalized.");
  }
  if (governanceSignoffEnvelopeSizeBytes > OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Audit snapshot governance signoff readiness envelope exceeds safe metadata-only limit (${governanceSignoffEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Audit snapshot governance signoff readiness validated for offline metadata-only human signoff."],
    normalized: {
      auditSnapshotId,
      signoffDecision,
      signoffStatus: decisionToStatus(signoffDecision),
      signoffPurpose,
      auditReviewerSignoffNotes,
      exceptionNotes,
      rejectionReason,
      governanceSignerDisplayName,
      snapshotAcceptanceJson,
      evidenceConfidenceJson,
      exceptionNotesJson,
      acknowledgedSafetyFlags,
      governanceSignoffEnvelopeSizeBytes,
    },
  };
}
