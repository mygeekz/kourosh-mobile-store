import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactGovernanceSignoffArchivePackDecision,
  OfflineArtifactGovernanceSignoffArchivePackRequest,
  OfflineArtifactGovernanceSignoffArchivePackStatus,
  OfflineArtifactGovernanceSignoffArchivePackValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_GOVERNANCE_SIGNOFF_ARCHIVE_PACK_SAFE_ENVELOPE_BYTES_LIMIT = 850_000;

const allowedArchivePackDecisions: OfflineArtifactGovernanceSignoffArchivePackDecision[] = [
  "needs_archive_pack_review",
  "prepare_archive_pack_readiness_only",
  "reject_archive_pack_readiness",
  "archive_without_file_export",
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const trimString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const truthyUnsafe = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes", "enabled", "allow", "allowed"].includes(value.trim().toLowerCase());
  return false;
};

const unsafeArchivePackKeyPatterns = [
  /(execute|execution|run|runtimeInvocation|runtimeLoad|loadModel|modelExecution|infer|inference|predict|scoreLive)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|releaseToProduction|decisionAutomation)/i,
  /(createFile|writeFile|download|fileOutput|exportFile|archiveFile|zipFile|exportArtifactBytes|includeArtifactBytes|exportModelBytes|artifactBytesIncluded|rawArtifact|binaryPayload|modelPayload)/i,
  /(retentionJob|scheduleRetention|purge|delete|deletion|destructive|overwrite|dropTable|truncate)/i,
  /(canChangeInventory|canChangeAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeArchivePackStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|promote|deploy|release to production|production integration|create file|write file|download file|file output|export file|archive file|zip file|export artifact bytes|include artifact bytes|model bytes|schedule retention job|purge|delete|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision)\b/i;

const inspectUnsafeArchivePackIntent = (value: unknown, path = "archivePack"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeArchivePackStringPattern.test(value)) {
    messages.push(`${path} contains forbidden archive-pack readiness intent: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeArchivePackIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeArchivePackKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeArchivePackIntent(nestedValue, nestedPath));
  }
  return messages;
};

const decisionToStatus = (
  decision: OfflineArtifactGovernanceSignoffArchivePackDecision,
): OfflineArtifactGovernanceSignoffArchivePackStatus => {
  if (decision === "prepare_archive_pack_readiness_only") return "prepared_archive_pack_readiness";
  if (decision === "reject_archive_pack_readiness") return "rejected";
  if (decision === "archive_without_file_export") return "archived";
  return "needs_archive_pack_review";
};

export function validateOfflineArtifactGovernanceSignoffArchivePackRequest(
  signoffIdInput: unknown,
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_GOVERNANCE_SIGNOFF_ARCHIVE_PACK_SAFE_ENVELOPE_BYTES_LIMIT,
): OfflineArtifactGovernanceSignoffArchivePackValidationResult {
  const messages: string[] = [];
  const signoffId = signoffIdInput == null || signoffIdInput === "" ? (isPlainObject(input) ? input.signoffId : "") : signoffIdInput;
  const numericSignoffId = Number(signoffId);
  if (!Number.isFinite(numericSignoffId) || numericSignoffId <= 0) {
    messages.push("signoffId must reference an existing offline artifact review binder governance signoff record.");
  }

  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Offline artifact governance signoff archive-pack readiness request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineArtifactGovernanceSignoffArchivePackRequest>;
  const archivePackDecision = trimString(request.archivePackDecision) as OfflineArtifactGovernanceSignoffArchivePackDecision;
  const archivePackPurpose = trimString(request.archivePackPurpose) || "metadata-only governance signoff archive-pack readiness";
  const archivistNotes = trimString(request.archivistNotes);
  const rejectionReason = request.rejectionReason == null ? null : trimString(request.rejectionReason);
  const archivistDisplayName = request.archivistDisplayName == null ? null : trimString(request.archivistDisplayName);
  const archiveManifestJson = request.archiveManifestJson == null ? {} : request.archiveManifestJson;
  const retentionManifestJson = request.retentionManifestJson == null ? {} : request.retentionManifestJson;
  const evidenceIndexJson = request.evidenceIndexJson == null ? {} : request.evidenceIndexJson;
  const archiveReadinessNotesJson = request.archiveReadinessNotesJson == null ? {} : request.archiveReadinessNotesJson;
  const acknowledgedSafetyFlags = request.acknowledgedSafetyFlags == null ? {} : request.acknowledgedSafetyFlags;

  if (!allowedArchivePackDecisions.includes(archivePackDecision)) {
    messages.push(`archivePackDecision must be one of: ${allowedArchivePackDecisions.join(", ")}.`);
  }
  if (!archivistNotes) messages.push("archivistNotes is required for metadata-only archive-pack readiness evidence.");
  if (archivePackDecision === "reject_archive_pack_readiness" && !rejectionReason) {
    messages.push("rejectionReason is required when rejecting archive-pack readiness.");
  }
  if (archivePackDecision === "prepare_archive_pack_readiness_only" && !isPlainObject(archiveManifestJson)) {
    messages.push("archiveManifestJson must be a JSON object before archive-pack readiness can be prepared.");
  }
  if (!isPlainObject(archiveManifestJson)) messages.push("archiveManifestJson must be a JSON object when provided.");
  if (!isPlainObject(retentionManifestJson)) messages.push("retentionManifestJson must be a JSON object when provided.");
  if (!isPlainObject(evidenceIndexJson)) messages.push("evidenceIndexJson must be a JSON object when provided.");
  if (!isPlainObject(archiveReadinessNotesJson)) messages.push("archiveReadinessNotesJson must be a JSON object when provided.");
  if (!isPlainObject(acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  messages.push(...inspectUnsafeArchivePackIntent({
    archivePackDecision,
    archivePackPurpose,
    archivistNotes,
    rejectionReason,
    archiveManifestJson,
    retentionManifestJson,
    evidenceIndexJson,
    archiveReadinessNotesJson,
    acknowledgedSafetyFlags,
  }));

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false during archive-pack readiness.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false during archive-pack readiness.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false during archive-pack readiness.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false during archive-pack readiness.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false during archive-pack readiness.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false during archive-pack readiness.");
  if (safetyGate.archivePackReadinessCanCreateFiles !== false) messages.push("Archive-pack readiness must not create files.");
  if (safetyGate.archivePackReadinessCanIncludeArtifactBytes !== false) messages.push("Archive-pack readiness must not include artifact bytes.");
  if (safetyGate.archivePackReadinessCanExecuteArtifact !== false) messages.push("Archive-pack readiness must not execute artifacts.");
  if (safetyGate.archivePackReadinessCanActivateArtifact !== false) messages.push("Archive-pack readiness must not activate artifacts.");
  if (safetyGate.archivePackReadinessCanReleaseToProduction !== false) messages.push("Archive-pack readiness must not release artifacts to production.");
  if (safetyGate.archivePackReadinessCanMutateBusinessRecords !== false) messages.push("Archive-pack readiness must not mutate business records.");
  if (safetyGate.archivePackReadinessCanScheduleRetentionJobs !== false) messages.push("Archive-pack readiness must not schedule retention jobs.");
  if (safetyGate.archivePackReadinessCanDeleteOrPurge !== false) messages.push("Archive-pack readiness must not delete or purge records.");
  if (safetyGate.archivePackReadinessMetadataOnly !== true) messages.push("Archive-pack readiness must remain metadata-only.");
  if (safetyGate.archivePackReadinessRetentionReady !== true) messages.push("Archive-pack readiness must be retention-readiness metadata only.");

  let archiveEnvelopeSizeBytes = 0;
  try {
    archiveEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      signoffId: numericSignoffId,
      archivePackDecision,
      archivePackPurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      archiveManifestJson: isPlainObject(archiveManifestJson) ? archiveManifestJson : null,
      retentionManifestJson: isPlainObject(retentionManifestJson) ? retentionManifestJson : null,
      evidenceIndexJson: isPlainObject(evidenceIndexJson) ? evidenceIndexJson : null,
      archiveReadinessNotesJson: isPlainObject(archiveReadinessNotesJson) ? archiveReadinessNotesJson : null,
      acknowledgedSafetyFlags: isPlainObject(acknowledgedSafetyFlags) ? acknowledgedSafetyFlags : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Archive-pack readiness envelope could not be canonicalized.");
  }
  if (archiveEnvelopeSizeBytes > sizeLimitBytes) {
    messages.push(`Archive-pack readiness envelope exceeds safe metadata-only limit (${archiveEnvelopeSizeBytes}/${sizeLimitBytes} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Governance signoff archive-pack readiness validated for offline metadata-only retention-ready evidence."],
    normalized: {
      signoffId: numericSignoffId,
      archivePackDecision,
      archivePackStatus: decisionToStatus(archivePackDecision),
      archivePackPurpose,
      archivistNotes,
      rejectionReason,
      archivistDisplayName,
      archiveManifestJson: archiveManifestJson as Record<string, unknown>,
      retentionManifestJson: retentionManifestJson as Record<string, unknown>,
      evidenceIndexJson: evidenceIndexJson as Record<string, unknown>,
      archiveReadinessNotesJson: archiveReadinessNotesJson as Record<string, unknown>,
      acknowledgedSafetyFlags: acknowledgedSafetyFlags as Record<string, unknown>,
      archiveEnvelopeSizeBytes,
    },
  };
}
