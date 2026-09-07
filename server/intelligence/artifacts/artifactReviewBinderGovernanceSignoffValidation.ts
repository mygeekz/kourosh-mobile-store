import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactReviewBinderGovernanceSignoffDecision,
  OfflineArtifactReviewBinderGovernanceSignoffRequest,
  OfflineArtifactReviewBinderGovernanceSignoffValidationResult,
  OfflineArtifactReviewBinderGovernanceSignoffStatus,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_REVIEW_BINDER_GOVERNANCE_SIGNOFF_SAFE_ENVELOPE_BYTES_LIMIT = 750_000;

const allowedSignoffDecisions: OfflineArtifactReviewBinderGovernanceSignoffDecision[] = [
  "needs_governance_review",
  "approve_binder_governance_readiness_only",
  "reject_binder_governance_readiness",
  "archive_binder_governance_signoff",
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

const unsafeGovernanceSignoffKeyPatterns = [
  /(execute|execution|run|runtimeInvocation|runtimeLoad|loadModel|modelExecution|infer|inference|predict|scoreLive)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|releaseToProduction|decisionAutomation)/i,
  /(exportFile|createFile|download|fileOutput|exportArtifactBytes|includeArtifactBytes|exportModelBytes|artifactBytesIncluded|rawArtifact|binaryPayload|modelPayload)/i,
  /(canChangeInventory|canChangeAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeGovernanceSignoffStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|promote|deploy|release to production|production integration|export file|download file|file output|export artifact bytes|include artifact bytes|model bytes|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision)\b/i;

const inspectUnsafeGovernanceSignoffIntent = (value: unknown, path = "governanceSignoff"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeGovernanceSignoffStringPattern.test(value)) {
    messages.push(`${path} contains forbidden governance signoff intent: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeGovernanceSignoffIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeGovernanceSignoffKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeGovernanceSignoffIntent(nestedValue, nestedPath));
  }
  return messages;
};

const decisionToStatus = (
  decision: OfflineArtifactReviewBinderGovernanceSignoffDecision,
): OfflineArtifactReviewBinderGovernanceSignoffStatus => {
  if (decision === "approve_binder_governance_readiness_only") return "approved_governance_readiness";
  if (decision === "reject_binder_governance_readiness") return "rejected";
  if (decision === "archive_binder_governance_signoff") return "archived";
  return "needs_governance_review";
};

export function validateOfflineArtifactReviewBinderGovernanceSignoffRequest(
  binderIdInput: unknown,
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_REVIEW_BINDER_GOVERNANCE_SIGNOFF_SAFE_ENVELOPE_BYTES_LIMIT,
): OfflineArtifactReviewBinderGovernanceSignoffValidationResult {
  const messages: string[] = [];
  const binderId = typeof binderIdInput === "number" || typeof binderIdInput === "string" ? binderIdInput : "";
  const numericBinderId = Number(binderId);
  if (!Number.isFinite(numericBinderId) || numericBinderId <= 0) {
    messages.push("binderId must reference an existing offline artifact review binder readiness record.");
  }

  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Offline artifact review binder governance signoff request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineArtifactReviewBinderGovernanceSignoffRequest>;
  const signoffDecision = trimString(request.signoffDecision) as OfflineArtifactReviewBinderGovernanceSignoffDecision;
  const signerNotes = trimString(request.signerNotes);
  const rejectionReason = request.rejectionReason == null ? null : trimString(request.rejectionReason);
  const signerDisplayName = request.signerDisplayName == null ? null : trimString(request.signerDisplayName);
  const governanceFindingsJson = request.governanceFindingsJson == null ? {} : request.governanceFindingsJson;
  const evidenceCompletenessJson = request.evidenceCompletenessJson == null ? {} : request.evidenceCompletenessJson;
  const riskAcceptanceJson = request.riskAcceptanceJson == null ? {} : request.riskAcceptanceJson;
  const acknowledgedSafetyFlags = request.acknowledgedSafetyFlags == null ? {} : request.acknowledgedSafetyFlags;

  if (!allowedSignoffDecisions.includes(signoffDecision)) {
    messages.push(`signoffDecision must be one of: ${allowedSignoffDecisions.join(", ")}.`);
  }
  if (!signerNotes) messages.push("signerNotes is required for human governance signoff evidence.");
  if (signoffDecision === "reject_binder_governance_readiness" && !rejectionReason) {
    messages.push("rejectionReason is required when rejecting binder governance readiness.");
  }
  if (signoffDecision === "approve_binder_governance_readiness_only" && !isPlainObject(evidenceCompletenessJson)) {
    messages.push("evidenceCompletenessJson must be a JSON object before governance readiness can be approved.");
  }
  if (!isPlainObject(governanceFindingsJson)) messages.push("governanceFindingsJson must be a JSON object when provided.");
  if (!isPlainObject(evidenceCompletenessJson)) messages.push("evidenceCompletenessJson must be a JSON object when provided.");
  if (!isPlainObject(riskAcceptanceJson)) messages.push("riskAcceptanceJson must be a JSON object when provided.");
  if (!isPlainObject(acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  messages.push(...inspectUnsafeGovernanceSignoffIntent({
    signoffDecision,
    signerNotes,
    rejectionReason,
    governanceFindingsJson,
    evidenceCompletenessJson,
    riskAcceptanceJson,
    acknowledgedSafetyFlags,
  }));

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false during governance signoff.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false during governance signoff.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false during governance signoff.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false during governance signoff.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false during governance signoff.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false during governance signoff.");
  if (safetyGate.binderGovernanceSignoffCanExportFiles !== false) messages.push("Binder governance signoff must not export files.");
  if (safetyGate.binderGovernanceSignoffCanExecuteArtifact !== false) messages.push("Binder governance signoff must not execute artifacts.");
  if (safetyGate.binderGovernanceSignoffCanActivateArtifact !== false) messages.push("Binder governance signoff must not activate artifacts.");
  if (safetyGate.binderGovernanceSignoffCanReleaseToProduction !== false) messages.push("Binder governance signoff must not release artifacts to production.");
  if (safetyGate.binderGovernanceSignoffCanMutateBusinessRecords !== false) messages.push("Binder governance signoff must not mutate business records.");
  if (safetyGate.binderGovernanceSignoffMetadataOnly !== true) messages.push("Binder governance signoff must remain metadata-only.");
  if (safetyGate.binderGovernanceSignoffRequiresHumanApproval !== true) messages.push("Binder governance signoff must require human approval evidence.");

  let signoffEnvelopeSizeBytes = 0;
  try {
    signoffEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      binderId: numericBinderId,
      signoffDecision,
      signerNotes,
      rejectionReason,
      signerDisplayName,
      governanceFindingsJson: isPlainObject(governanceFindingsJson) ? governanceFindingsJson : null,
      evidenceCompletenessJson: isPlainObject(evidenceCompletenessJson) ? evidenceCompletenessJson : null,
      riskAcceptanceJson: isPlainObject(riskAcceptanceJson) ? riskAcceptanceJson : null,
      acknowledgedSafetyFlags: isPlainObject(acknowledgedSafetyFlags) ? acknowledgedSafetyFlags : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Governance signoff envelope could not be canonicalized.");
  }
  if (signoffEnvelopeSizeBytes > sizeLimitBytes) {
    messages.push(`Governance signoff envelope exceeds safe metadata-only limit (${signoffEnvelopeSizeBytes}/${sizeLimitBytes} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Review binder governance signoff validated for offline metadata-only human governance evidence."],
    normalized: {
      binderId: numericBinderId,
      signoffDecision,
      signoffStatus: decisionToStatus(signoffDecision),
      signerNotes,
      rejectionReason,
      signerDisplayName,
      governanceFindingsJson: governanceFindingsJson as Record<string, unknown>,
      evidenceCompletenessJson: evidenceCompletenessJson as Record<string, unknown>,
      riskAcceptanceJson: riskAcceptanceJson as Record<string, unknown>,
      acknowledgedSafetyFlags: acknowledgedSafetyFlags as Record<string, unknown>,
      signoffEnvelopeSizeBytes,
    },
  };
}
