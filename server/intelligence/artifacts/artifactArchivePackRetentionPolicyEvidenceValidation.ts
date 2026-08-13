import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactArchivePackRetentionPolicyEvidenceDecision,
  OfflineArtifactArchivePackRetentionPolicyEvidenceRequest,
  OfflineArtifactArchivePackRetentionPolicyEvidenceStatus,
  OfflineArtifactArchivePackRetentionPolicyEvidenceValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_ARCHIVE_PACK_RETENTION_POLICY_EVIDENCE_SAFE_ENVELOPE_BYTES_LIMIT = 850_000;

const allowedRetentionDecisions: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision[] = [
  "needs_retention_policy_review",
  "prepare_retention_policy_evidence_only",
  "reject_retention_policy_evidence",
  "archive_policy_evidence_without_job",
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const trimString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const normalizePositiveNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const truthyUnsafe = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes", "enabled", "allow", "allowed"].includes(value.trim().toLowerCase());
  return false;
};

const unsafeRetentionPolicyKeyPatterns = [
  /(execute|execution|run|runtimeInvocation|runtimeLoad|loadModel|modelExecution|infer|inference|predict|scoreLive)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|releaseToProduction|decisionAutomation)/i,
  /(createFile|writeFile|download|fileOutput|exportFile|archiveFile|zipFile|exportArtifactBytes|includeArtifactBytes|exportModelBytes|artifactBytesIncluded|rawArtifact|binaryPayload|modelPayload)/i,
  /(retentionJob|scheduleRetention|retentionQueue|purge|delete|deletion|destructive|overwrite|dropTable|truncate)/i,
  /(allowPurge|purgeAllowed|deleteAllowed|deletionAllowed|legalDelete|retentionDelete|expiryDelete)/i,
  /(canChangeInventory|canChangeAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeRetentionPolicyStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|promote|deploy|release to production|production integration|create file|write file|download file|file output|export file|archive file|zip file|export artifact bytes|include artifact bytes|model bytes|schedule retention job|retention job|purge|delete|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision)\b/i;

const inspectUnsafeRetentionPolicyIntent = (value: unknown, path = "retentionPolicyEvidence"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeRetentionPolicyStringPattern.test(value)) {
    messages.push(`${path} contains forbidden retention policy evidence intent: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeRetentionPolicyIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeRetentionPolicyKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeRetentionPolicyIntent(nestedValue, nestedPath));
  }
  return messages;
};

const decisionToStatus = (
  decision: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision,
): OfflineArtifactArchivePackRetentionPolicyEvidenceStatus => {
  if (decision === "prepare_retention_policy_evidence_only") return "prepared_retention_policy_evidence";
  if (decision === "reject_retention_policy_evidence") return "rejected";
  if (decision === "archive_policy_evidence_without_job") return "archived";
  return "needs_retention_policy_review";
};

export function validateOfflineArtifactArchivePackRetentionPolicyEvidenceRequest(
  archivePackIdInput: unknown,
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_ARCHIVE_PACK_RETENTION_POLICY_EVIDENCE_SAFE_ENVELOPE_BYTES_LIMIT,
): OfflineArtifactArchivePackRetentionPolicyEvidenceValidationResult {
  const messages: string[] = [];
  const archivePackId = archivePackIdInput == null || archivePackIdInput === "" ? (isPlainObject(input) ? input.archivePackId : "") : archivePackIdInput;
  const numericArchivePackId = Number(archivePackId);
  if (!Number.isFinite(numericArchivePackId) || numericArchivePackId <= 0) {
    messages.push("archivePackId must reference an existing offline artifact governance signoff archive-pack record.");
  }

  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Offline artifact archive-pack retention policy evidence request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineArtifactArchivePackRetentionPolicyEvidenceRequest>;
  const retentionDecision = trimString(request.retentionDecision) as OfflineArtifactArchivePackRetentionPolicyEvidenceDecision;
  const retentionPolicyPurpose = trimString(request.retentionPolicyPurpose) || "metadata-only archive-pack retention policy evidence readiness";
  const retentionWindowDays = normalizePositiveNumber(request.retentionWindowDays);
  const retainUntil = request.retainUntil == null ? null : trimString(request.retainUntil);
  const legalHoldReason = request.legalHoldReason == null ? null : trimString(request.legalHoldReason);
  const policyNotes = trimString(request.policyNotes);
  const rejectionReason = request.rejectionReason == null ? null : trimString(request.rejectionReason);
  const policyReviewerDisplayName = request.policyReviewerDisplayName == null ? null : trimString(request.policyReviewerDisplayName);
  const retentionPolicyManifestJson = request.retentionPolicyManifestJson == null ? {} : request.retentionPolicyManifestJson;
  const holdEvidenceJson = request.holdEvidenceJson == null ? {} : request.holdEvidenceJson;
  const expiryMetadataJson = request.expiryMetadataJson == null ? {} : request.expiryMetadataJson;
  const purgeProhibitionEvidenceJson = request.purgeProhibitionEvidenceJson == null ? {} : request.purgeProhibitionEvidenceJson;
  const acknowledgedSafetyFlags = request.acknowledgedSafetyFlags == null ? {} : request.acknowledgedSafetyFlags;

  if (!allowedRetentionDecisions.includes(retentionDecision)) {
    messages.push(`retentionDecision must be one of: ${allowedRetentionDecisions.join(", ")}.`);
  }
  if (!policyNotes) messages.push("policyNotes is required for metadata-only retention policy evidence.");
  if (retentionDecision === "reject_retention_policy_evidence" && !rejectionReason) {
    messages.push("rejectionReason is required when rejecting retention policy evidence.");
  }
  if (retentionDecision === "prepare_retention_policy_evidence_only" && !retentionWindowDays && !retainUntil && !legalHoldReason) {
    messages.push("retentionWindowDays, retainUntil, or legalHoldReason is required before retention policy evidence can be prepared.");
  }
  if (!isPlainObject(retentionPolicyManifestJson)) messages.push("retentionPolicyManifestJson must be a JSON object when provided.");
  if (!isPlainObject(holdEvidenceJson)) messages.push("holdEvidenceJson must be a JSON object when provided.");
  if (!isPlainObject(expiryMetadataJson)) messages.push("expiryMetadataJson must be a JSON object when provided.");
  if (!isPlainObject(purgeProhibitionEvidenceJson)) messages.push("purgeProhibitionEvidenceJson must be a JSON object when provided.");
  if (!isPlainObject(acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  messages.push(...inspectUnsafeRetentionPolicyIntent({
    retentionDecision,
    retentionPolicyPurpose,
    retentionWindowDays,
    retainUntil,
    legalHoldReason,
    policyNotes,
    rejectionReason,
    retentionPolicyManifestJson,
    holdEvidenceJson,
    expiryMetadataJson,
    purgeProhibitionEvidenceJson,
    acknowledgedSafetyFlags,
  }));

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false during retention policy evidence.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false during retention policy evidence.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false during retention policy evidence.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false during retention policy evidence.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false during retention policy evidence.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false during retention policy evidence.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanScheduleRetentionJobs !== false) messages.push("Retention policy evidence must not schedule retention jobs.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanDeleteOrPurge !== false) messages.push("Retention policy evidence must not delete or purge records.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanCreateFiles !== false) messages.push("Retention policy evidence must not create files.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanIncludeArtifactBytes !== false) messages.push("Retention policy evidence must not include artifact bytes.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanExecuteArtifact !== false) messages.push("Retention policy evidence must not execute artifacts.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanActivateArtifact !== false) messages.push("Retention policy evidence must not activate artifacts.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanReleaseToProduction !== false) messages.push("Retention policy evidence must not release artifacts to production.");
  if (safetyGate.archivePackRetentionPolicyEvidenceCanMutateBusinessRecords !== false) messages.push("Retention policy evidence must not mutate business records.");
  if (safetyGate.archivePackRetentionPolicyEvidenceMetadataOnly !== true) messages.push("Retention policy evidence must remain metadata-only.");
  if (safetyGate.archivePackRetentionPolicyEvidenceRequiresPurgeProhibition !== true) messages.push("Retention policy evidence must include purge-prohibition semantics.");

  let retentionPolicyEnvelopeSizeBytes = 0;
  try {
    retentionPolicyEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      archivePackId: numericArchivePackId,
      retentionDecision,
      retentionPolicyPurpose,
      retentionWindowDays,
      retainUntil,
      legalHoldReason,
      policyNotes,
      rejectionReason,
      policyReviewerDisplayName,
      retentionPolicyManifestJson: isPlainObject(retentionPolicyManifestJson) ? retentionPolicyManifestJson : null,
      holdEvidenceJson: isPlainObject(holdEvidenceJson) ? holdEvidenceJson : null,
      expiryMetadataJson: isPlainObject(expiryMetadataJson) ? expiryMetadataJson : null,
      purgeProhibitionEvidenceJson: isPlainObject(purgeProhibitionEvidenceJson) ? purgeProhibitionEvidenceJson : null,
      acknowledgedSafetyFlags: isPlainObject(acknowledgedSafetyFlags) ? acknowledgedSafetyFlags : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Retention policy evidence envelope could not be canonicalized.");
  }
  if (retentionPolicyEnvelopeSizeBytes > sizeLimitBytes) {
    messages.push(`Retention policy evidence envelope exceeds safe metadata-only limit (${retentionPolicyEnvelopeSizeBytes}/${sizeLimitBytes} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Archive-pack retention policy evidence validated for offline metadata-only purge-prohibition readiness."],
    normalized: {
      archivePackId: numericArchivePackId,
      retentionDecision,
      retentionStatus: decisionToStatus(retentionDecision),
      retentionPolicyPurpose,
      retentionWindowDays,
      retainUntil,
      legalHoldReason,
      policyNotes,
      rejectionReason,
      policyReviewerDisplayName,
      retentionPolicyManifestJson: retentionPolicyManifestJson as Record<string, unknown>,
      holdEvidenceJson: holdEvidenceJson as Record<string, unknown>,
      expiryMetadataJson: expiryMetadataJson as Record<string, unknown>,
      purgeProhibitionEvidenceJson: purgeProhibitionEvidenceJson as Record<string, unknown>,
      acknowledgedSafetyFlags: acknowledgedSafetyFlags as Record<string, unknown>,
      retentionPolicyEnvelopeSizeBytes,
    },
  };
}
