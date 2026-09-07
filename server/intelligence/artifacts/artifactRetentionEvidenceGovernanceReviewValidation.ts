import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactRetentionEvidenceGovernanceReviewDecision,
  OfflineArtifactRetentionEvidenceGovernanceReviewStatus,
  OfflineArtifactRetentionEvidenceGovernanceReviewValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_RETENTION_EVIDENCE_GOVERNANCE_REVIEW_SAFE_ENVELOPE_BYTES_LIMIT = 850_000;

const allowedGovernanceReviewDecisions: OfflineArtifactRetentionEvidenceGovernanceReviewDecision[] = [
  "needs_retention_governance_review",
  "approve_retention_governance_evidence_only",
  "reject_retention_governance_evidence",
  "archive_retention_governance_without_job",
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
  decision: OfflineArtifactRetentionEvidenceGovernanceReviewDecision,
): OfflineArtifactRetentionEvidenceGovernanceReviewStatus => {
  switch (decision) {
    case "approve_retention_governance_evidence_only":
      return "approved_retention_governance_evidence";
    case "reject_retention_governance_evidence":
      return "rejected";
    case "archive_retention_governance_without_job":
      return "archived";
    case "needs_retention_governance_review":
    default:
      return "needs_retention_governance_review";
  }
};

export function validateOfflineArtifactRetentionEvidenceGovernanceReviewRequest(
  retentionPolicyEvidenceIdInput: unknown,
  requestInput: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
): OfflineArtifactRetentionEvidenceGovernanceReviewValidationResult {
  const messages: string[] = [];
  if (
    safetyGate.artifactExecutionAllowed ||
    safetyGate.artifactAutoActivationAllowed ||
    safetyGate.modelExecutionAllowed ||
    safetyGate.inferenceEndpointExposed ||
    safetyGate.productionIntegrationAllowed ||
    safetyGate.canMutateBusinessRecords ||
    safetyGate.retentionEvidenceGovernanceReviewCanScheduleRetentionJobs ||
    safetyGate.retentionEvidenceGovernanceReviewCanDeleteOrPurge ||
    safetyGate.retentionEvidenceGovernanceReviewCanCreateFiles ||
    safetyGate.retentionEvidenceGovernanceReviewCanIncludeArtifactBytes ||
    safetyGate.retentionEvidenceGovernanceReviewCanExecuteArtifact ||
    safetyGate.retentionEvidenceGovernanceReviewCanActivateArtifact ||
    safetyGate.retentionEvidenceGovernanceReviewCanReleaseToProduction ||
    safetyGate.retentionEvidenceGovernanceReviewCanMutateBusinessRecords
  ) {
    messages.push("Offline retention evidence governance review safety gate is not locked down.");
  }

  const retentionPolicyEvidenceId = Number(retentionPolicyEvidenceIdInput);
  if (!Number.isFinite(retentionPolicyEvidenceId) || retentionPolicyEvidenceId <= 0) {
    messages.push("retentionPolicyEvidenceId must reference an existing offline retention policy evidence record.");
  }

  if (!isPlainObject(requestInput)) {
    return { valid: false, messages: [...messages, "Retention evidence governance review request must be a JSON object."], normalized: null };
  }

  const request = requestInput;
  const governanceReviewDecision = trimText(request.governanceReviewDecision) as OfflineArtifactRetentionEvidenceGovernanceReviewDecision;
  if (!allowedGovernanceReviewDecisions.includes(governanceReviewDecision)) {
    messages.push(`governanceReviewDecision must be one of: ${allowedGovernanceReviewDecisions.join(", ")}.`);
  }

  const governanceReviewPurpose = trimText(request.governanceReviewPurpose) || "offline_retention_evidence_governance_review_readiness";
  const reviewerNotes = trimText(request.reviewerNotes);
  const rejectionReason = trimText(request.rejectionReason) || null;
  const governanceReviewerDisplayName = trimText(request.governanceReviewerDisplayName) || null;

  if (!reviewerNotes) messages.push("reviewerNotes is required for human retention governance review evidence.");
  if (governanceReviewDecision === "reject_retention_governance_evidence" && !rejectionReason) {
    messages.push("rejectionReason is required when retention governance review evidence is rejected.");
  }

  const riskConfirmationJson = isPlainObject(request.riskConfirmationJson) ? request.riskConfirmationJson : {};
  const holdConfirmationJson = isPlainObject(request.holdConfirmationJson) ? request.holdConfirmationJson : {};
  const purgeProhibitionReviewJson = isPlainObject(request.purgeProhibitionReviewJson) ? request.purgeProhibitionReviewJson : {};
  const evidenceCompletenessJson = isPlainObject(request.evidenceCompletenessJson) ? request.evidenceCompletenessJson : {};
  const acknowledgedSafetyFlags = isPlainObject(request.acknowledgedSafetyFlags) ? request.acknowledgedSafetyFlags : {};

  if (request.riskConfirmationJson !== undefined && !isPlainObject(request.riskConfirmationJson)) messages.push("riskConfirmationJson must be a JSON object when provided.");
  if (request.holdConfirmationJson !== undefined && !isPlainObject(request.holdConfirmationJson)) messages.push("holdConfirmationJson must be a JSON object when provided.");
  if (request.purgeProhibitionReviewJson !== undefined && !isPlainObject(request.purgeProhibitionReviewJson)) messages.push("purgeProhibitionReviewJson must be a JSON object when provided.");
  if (request.evidenceCompletenessJson !== undefined && !isPlainObject(request.evidenceCompletenessJson)) messages.push("evidenceCompletenessJson must be a JSON object when provided.");
  if (request.acknowledgedSafetyFlags !== undefined && !isPlainObject(request.acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (governanceReviewDecision === "approve_retention_governance_evidence_only") {
    if (Object.keys(riskConfirmationJson).length === 0) messages.push("riskConfirmationJson is required for retention governance approval evidence.");
    if (Object.keys(holdConfirmationJson).length === 0) messages.push("holdConfirmationJson is required for retention governance approval evidence.");
    if (Object.keys(purgeProhibitionReviewJson).length === 0) messages.push("purgeProhibitionReviewJson is required for retention governance approval evidence.");
    if (Object.keys(evidenceCompletenessJson).length === 0) messages.push("evidenceCompletenessJson is required for retention governance approval evidence.");
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
  const unsafePayloads = [request, riskConfirmationJson, holdConfirmationJson, purgeProhibitionReviewJson, evidenceCompletenessJson, acknowledgedSafetyFlags];
  if (unsafePayloads.some((payload) => objectHasTruthyUnsafeKey(payload, unsafeKeys))) {
    messages.push("Retention evidence governance review payload requests unsafe execution, inference, activation, production integration, retention job, deletion, purge, file output, artifact bytes, or business mutation.");
  }

  let governanceReviewEnvelopeSizeBytes = 0;
  try {
    governanceReviewEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      retentionPolicyEvidenceId,
      governanceReviewDecision,
      governanceReviewPurpose,
      reviewerNotes,
      rejectionReason,
      governanceReviewerDisplayName,
      riskConfirmationJson,
      holdConfirmationJson,
      purgeProhibitionReviewJson,
      evidenceCompletenessJson,
      acknowledgedSafetyFlags,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Retention evidence governance review envelope could not be canonicalized.");
  }
  if (governanceReviewEnvelopeSizeBytes > OFFLINE_ARTIFACT_RETENTION_EVIDENCE_GOVERNANCE_REVIEW_SAFE_ENVELOPE_BYTES_LIMIT) {
    messages.push(`Retention evidence governance review envelope exceeds safe metadata-only limit (${governanceReviewEnvelopeSizeBytes}/${OFFLINE_ARTIFACT_RETENTION_EVIDENCE_GOVERNANCE_REVIEW_SAFE_ENVELOPE_BYTES_LIMIT} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Retention evidence governance review validated for offline metadata-only human review readiness."],
    normalized: {
      retentionPolicyEvidenceId,
      governanceReviewDecision,
      governanceReviewStatus: decisionToStatus(governanceReviewDecision),
      governanceReviewPurpose,
      reviewerNotes,
      rejectionReason,
      governanceReviewerDisplayName,
      riskConfirmationJson,
      holdConfirmationJson,
      purgeProhibitionReviewJson,
      evidenceCompletenessJson,
      acknowledgedSafetyFlags,
      governanceReviewEnvelopeSizeBytes,
    },
  };
}
