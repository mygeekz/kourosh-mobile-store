import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactQuarantineReviewRequest,
  OfflineArtifactQuarantineReviewValidationResult,
  OfflineArtifactReviewDecision,
  OfflineArtifactReviewStatus,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_REVIEW_SAFE_ENVELOPE_BYTES_LIMIT = 500_000;

export const ALLOWED_OFFLINE_ARTIFACT_REVIEW_DECISIONS: OfflineArtifactReviewDecision[] = [
  "needs_more_evidence",
  "approve_for_shadow_review_only",
  "reject_quarantine_artifact",
  "archive_without_activation",
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

const unsafeReviewKeyPatterns = [
  /(execute|execution|run|runtimeInvocation|runtimeLoad|loadModel|modelExecution|infer|inference|predict|scoreLive)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|releaseToProduction|decisionAutomation)/i,
  /(canChangeInventory|canChangeAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeReviewStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|promote|deploy|release to production|production integration|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision)\b/i;

const inspectUnsafeReviewIntent = (value: unknown, path = "review"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeReviewStringPattern.test(value)) {
    messages.push(`${path} contains forbidden review intent: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeReviewIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeReviewKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeReviewIntent(nestedValue, nestedPath));
  }
  return messages;
};

export const reviewStatusForDecision = (decision: OfflineArtifactReviewDecision): OfflineArtifactReviewStatus => {
  if (decision === "approve_for_shadow_review_only") return "approved_for_shadow_review";
  if (decision === "reject_quarantine_artifact") return "rejected";
  if (decision === "archive_without_activation") return "archived";
  return "needs_more_evidence";
};

export function validateOfflineArtifactQuarantineReviewRequest(
  artifactIdInput: unknown,
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_REVIEW_SAFE_ENVELOPE_BYTES_LIMIT,
): OfflineArtifactQuarantineReviewValidationResult {
  const messages: string[] = [];
  const artifactId = typeof artifactIdInput === "number" || typeof artifactIdInput === "string" ? artifactIdInput : "";
  const numericArtifactId = Number(artifactId);
  if (!Number.isFinite(numericArtifactId) || numericArtifactId <= 0) messages.push("artifactId must reference an existing quarantined artifact record.");

  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Offline artifact quarantine review request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineArtifactQuarantineReviewRequest>;
  const reviewDecisionRaw = trimString(request.reviewDecision);
  const reviewerNotes = trimString(request.reviewerNotes);
  const rejectionReason = request.rejectionReason == null ? null : trimString(request.rejectionReason);
  const reviewerDisplayName = request.reviewerDisplayName == null ? null : trimString(request.reviewerDisplayName);
  const validationFindingsJson = request.validationFindingsJson == null ? {} : request.validationFindingsJson;
  const lineageComparisonJson = request.lineageComparisonJson == null ? {} : request.lineageComparisonJson;
  const evidenceJson = request.evidenceJson == null ? {} : request.evidenceJson;
  const acknowledgedSafetyFlags = request.acknowledgedSafetyFlags == null ? {} : request.acknowledgedSafetyFlags;

  if (!reviewDecisionRaw) messages.push("reviewDecision is required.");
  if (reviewDecisionRaw && !ALLOWED_OFFLINE_ARTIFACT_REVIEW_DECISIONS.includes(reviewDecisionRaw as OfflineArtifactReviewDecision)) {
    messages.push(`reviewDecision is not allowed for offline quarantine review: ${reviewDecisionRaw}`);
  }
  if (!reviewerNotes) messages.push("reviewerNotes is required for signed quarantine review evidence.");
  if (!isPlainObject(validationFindingsJson)) messages.push("validationFindingsJson must be a JSON object when provided.");
  if (!isPlainObject(lineageComparisonJson)) messages.push("lineageComparisonJson must be a JSON object when provided.");
  if (!isPlainObject(evidenceJson)) messages.push("evidenceJson must be a JSON object when provided.");
  if (!isPlainObject(acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  if (reviewDecisionRaw === "reject_quarantine_artifact" && !rejectionReason) {
    messages.push("rejectionReason is required when rejecting a quarantined artifact.");
  }
  if (reviewDecisionRaw === "approve_for_shadow_review_only" && Object.keys(evidenceJson as Record<string, unknown>).length === 0) {
    messages.push("evidenceJson is required when approving only for shadow review.");
  }

  messages.push(...inspectUnsafeReviewIntent({
    reviewDecision: reviewDecisionRaw,
    reviewerNotes,
    rejectionReason,
    reviewerDisplayName,
    validationFindingsJson,
    lineageComparisonJson,
    evidenceJson,
    acknowledgedSafetyFlags,
  }));

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false during quarantine review.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false during quarantine review.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false during quarantine review.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false during quarantine review.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false during quarantine review.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false during quarantine review.");
  if (safetyGate.quarantineReviewCanExecuteArtifact !== false) messages.push("Quarantine review must not execute artifacts.");
  if (safetyGate.quarantineReviewCanActivateArtifact !== false) messages.push("Quarantine review must not activate artifacts.");
  if (safetyGate.quarantineReviewCanReleaseToProduction !== false) messages.push("Quarantine review must not release artifacts to production.");
  if (safetyGate.quarantineReviewCanMutateBusinessRecords !== false) messages.push("Quarantine review must not mutate business records.");
  if (safetyGate.quarantineReviewRequiresHumanEvidence !== true) messages.push("Quarantine review must require human evidence.");
  if (safetyGate.quarantineReviewStatusMetadataOnly !== true) messages.push("Quarantine review status must remain metadata-only.");

  let reviewEnvelopeSizeBytes = 0;
  try {
    reviewEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      artifactId: numericArtifactId,
      reviewDecision: reviewDecisionRaw,
      reviewerNotes,
      rejectionReason,
      reviewerDisplayName,
      validationFindingsJson: isPlainObject(validationFindingsJson) ? validationFindingsJson : null,
      lineageComparisonJson: isPlainObject(lineageComparisonJson) ? lineageComparisonJson : null,
      evidenceJson: isPlainObject(evidenceJson) ? evidenceJson : null,
      acknowledgedSafetyFlags: isPlainObject(acknowledgedSafetyFlags) ? acknowledgedSafetyFlags : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Quarantine review envelope could not be canonicalized.");
  }
  if (reviewEnvelopeSizeBytes > sizeLimitBytes) {
    messages.push(`Quarantine review envelope exceeds safe review limit (${reviewEnvelopeSizeBytes}/${sizeLimitBytes} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  const reviewDecision = reviewDecisionRaw as OfflineArtifactReviewDecision;
  return {
    valid: true,
    messages: ["Quarantine review evidence validated for offline metadata-only review."],
    normalized: {
      artifactId: numericArtifactId,
      reviewDecision,
      reviewStatus: reviewStatusForDecision(reviewDecision),
      reviewerNotes,
      rejectionReason,
      reviewerDisplayName,
      validationFindingsJson: validationFindingsJson as Record<string, unknown>,
      lineageComparisonJson: lineageComparisonJson as Record<string, unknown>,
      evidenceJson: evidenceJson as Record<string, unknown>,
      acknowledgedSafetyFlags: acknowledgedSafetyFlags as Record<string, unknown>,
      reviewEnvelopeSizeBytes,
    },
  };
}
