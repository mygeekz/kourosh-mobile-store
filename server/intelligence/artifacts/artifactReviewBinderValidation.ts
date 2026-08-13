import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  OfflineArtifactReviewBinderRequest,
  OfflineArtifactReviewBinderValidationResult,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_REVIEW_BINDER_SAFE_ENVELOPE_BYTES_LIMIT = 750_000;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const trimString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const truthyUnsafe = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes", "enabled", "allow", "allowed"].includes(value.trim().toLowerCase());
  return false;
};

const unsafeBinderKeyPatterns = [
  /(execute|execution|run|runtimeInvocation|runtimeLoad|loadModel|modelExecution|infer|inference|predict|scoreLive)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|releaseToProduction|decisionAutomation)/i,
  /(exportArtifactBytes|includeArtifactBytes|exportModelBytes|artifactBytesIncluded|rawArtifact|binaryPayload|modelPayload)/i,
  /(canChangeInventory|canChangeAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeBinderStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|promote|deploy|release to production|production integration|export artifact bytes|include artifact bytes|model bytes|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision)\b/i;

const inspectUnsafeBinderIntent = (value: unknown, path = "binder"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeBinderStringPattern.test(value)) {
    messages.push(`${path} contains forbidden binder intent: ${value.slice(0, 100)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeBinderIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeBinderKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeBinderIntent(nestedValue, nestedPath));
  }
  return messages;
};

export function validateOfflineArtifactReviewBinderRequest(
  artifactIdInput: unknown,
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_REVIEW_BINDER_SAFE_ENVELOPE_BYTES_LIMIT,
): OfflineArtifactReviewBinderValidationResult {
  const messages: string[] = [];
  const artifactId = typeof artifactIdInput === "number" || typeof artifactIdInput === "string" ? artifactIdInput : "";
  const numericArtifactId = Number(artifactId);
  if (!Number.isFinite(numericArtifactId) || numericArtifactId <= 0) messages.push("artifactId must reference an existing quarantined artifact record for binder readiness.");

  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Offline artifact review binder readiness request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineArtifactReviewBinderRequest>;
  const binderPurpose = trimString(request.binderPurpose) || "Offline artifact review binder export readiness";
  const reviewerNotes = request.reviewerNotes == null ? null : trimString(request.reviewerNotes);
  const requestedSectionsJson = request.requestedSectionsJson == null ? {} : request.requestedSectionsJson;
  const traceabilityManifestJson = request.traceabilityManifestJson == null ? {} : request.traceabilityManifestJson;
  const evidenceIndexJson = request.evidenceIndexJson == null ? {} : request.evidenceIndexJson;
  const exportReadinessNotesJson = request.exportReadinessNotesJson == null ? {} : request.exportReadinessNotesJson;
  const acknowledgedSafetyFlags = request.acknowledgedSafetyFlags == null ? {} : request.acknowledgedSafetyFlags;

  if (!binderPurpose) messages.push("binderPurpose is required for offline review binder readiness.");
  if (!isPlainObject(requestedSectionsJson)) messages.push("requestedSectionsJson must be a JSON object when provided.");
  if (!isPlainObject(traceabilityManifestJson)) messages.push("traceabilityManifestJson must be a JSON object when provided.");
  if (!isPlainObject(evidenceIndexJson)) messages.push("evidenceIndexJson must be a JSON object when provided.");
  if (!isPlainObject(exportReadinessNotesJson)) messages.push("exportReadinessNotesJson must be a JSON object when provided.");
  if (!isPlainObject(acknowledgedSafetyFlags)) messages.push("acknowledgedSafetyFlags must be a JSON object when provided.");

  messages.push(...inspectUnsafeBinderIntent({
    binderPurpose,
    reviewerNotes,
    requestedSectionsJson,
    traceabilityManifestJson,
    evidenceIndexJson,
    exportReadinessNotesJson,
    acknowledgedSafetyFlags,
  }));

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false during binder readiness.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false during binder readiness.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false during binder readiness.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false during binder readiness.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false during binder readiness.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false during binder readiness.");
  if (safetyGate.binderReadinessCanExportArtifactBytes !== false) messages.push("Binder readiness must not export artifact bytes.");
  if (safetyGate.binderReadinessCanExecuteArtifact !== false) messages.push("Binder readiness must not execute artifacts.");
  if (safetyGate.binderReadinessCanActivateArtifact !== false) messages.push("Binder readiness must not activate artifacts.");
  if (safetyGate.binderReadinessCanReleaseToProduction !== false) messages.push("Binder readiness must not release artifacts to production.");
  if (safetyGate.binderReadinessCanMutateBusinessRecords !== false) messages.push("Binder readiness must not mutate business records.");
  if (safetyGate.binderReadinessMetadataOnly !== true) messages.push("Binder readiness must remain metadata-only.");

  let binderEnvelopeSizeBytes = 0;
  try {
    binderEnvelopeSizeBytes = measureCanonicalArtifactEnvelopeBytes({
      artifactId: numericArtifactId,
      binderPurpose,
      reviewerNotes,
      requestedSectionsJson: isPlainObject(requestedSectionsJson) ? requestedSectionsJson : null,
      traceabilityManifestJson: isPlainObject(traceabilityManifestJson) ? traceabilityManifestJson : null,
      evidenceIndexJson: isPlainObject(evidenceIndexJson) ? evidenceIndexJson : null,
      exportReadinessNotesJson: isPlainObject(exportReadinessNotesJson) ? exportReadinessNotesJson : null,
      acknowledgedSafetyFlags: isPlainObject(acknowledgedSafetyFlags) ? acknowledgedSafetyFlags : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Review binder envelope could not be canonicalized.");
  }
  if (binderEnvelopeSizeBytes > sizeLimitBytes) {
    messages.push(`Review binder envelope exceeds safe binder readiness limit (${binderEnvelopeSizeBytes}/${sizeLimitBytes} bytes).`);
  }

  if (messages.length > 0) return { valid: false, messages, normalized: null };

  return {
    valid: true,
    messages: ["Review binder export readiness validated for offline metadata-only manifest preparation."],
    normalized: {
      artifactId: numericArtifactId,
      binderPurpose,
      reviewerNotes,
      requestedSectionsJson: requestedSectionsJson as Record<string, unknown>,
      traceabilityManifestJson: traceabilityManifestJson as Record<string, unknown>,
      evidenceIndexJson: evidenceIndexJson as Record<string, unknown>,
      exportReadinessNotesJson: exportReadinessNotesJson as Record<string, unknown>,
      acknowledgedSafetyFlags: acknowledgedSafetyFlags as Record<string, unknown>,
      binderEnvelopeSizeBytes,
    },
  };
}
