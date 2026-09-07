import { measureCanonicalArtifactEnvelopeBytes } from "./artifactHashing";
import type {
  ArtifactIntakeValidationResult,
  NormalizedArtifactIntakeInput,
  OfflineModelArtifactIntakeRequest,
  OfflineModelArtifactKind,
  OfflineModelArtifactSafetyGate,
} from "./artifactIntakeTypes";

export const OFFLINE_ARTIFACT_SAFE_ENVELOPE_BYTES_LIMIT = 1_000_000;

export const ALLOWED_OFFLINE_ARTIFACT_KINDS: OfflineModelArtifactKind[] = [
  "json_model_result_bundle",
  "csv_score_bundle",
  "training_package_result",
  "external_model_metadata_bundle",
  "serialized_model_artifact_pending_review",
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

const unsafeKeyPatterns = [
  /(^|_)(execute|execution|run|runtime_load|runtimeInvocation|loadModel|modelLoad|modelExecution|infer|inference|predictLive|productionScore)($|_)/i,
  /(autoActivation|autoActivate|activate|activation|promote|promotion|deploy|productionIntegration|decisionAutomation)/i,
  /(canChangeInventory|canChangeAccounting|canChangeInventoryOrAccounting|canChangePricing|canChangeReports|canChangeLedger|canMutateBusinessRecords|businessMutation|inventoryMutation|accountingMutation|ledgerMutation|pricingMutation|reportMutation)/i,
];

const unsafeStringPattern = /\b(execute|run inference|infer live|activate|auto-activate|production integration|mutate inventory|mutate accounting|mutate ledger|change pricing|change reports|production decision|deploy model)\b/i;

const inspectUnsafeIntent = (value: unknown, path = "artifact"): string[] => {
  const messages: string[] = [];
  if (typeof value === "string" && unsafeStringPattern.test(value)) {
    messages.push(`${path} contains unsafe operational intent: ${value.slice(0, 80)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => messages.push(...inspectUnsafeIntent(item, `${path}[${index}]`)));
    return messages;
  }
  if (!isPlainObject(value)) return messages;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (unsafeKeyPatterns.some((pattern) => pattern.test(key)) && truthyUnsafe(nestedValue)) {
      messages.push(`${nestedPath} requests a forbidden operational capability.`);
    }
    messages.push(...inspectUnsafeIntent(nestedValue, nestedPath));
  }
  return messages;
};

export function validateOfflineArtifactIntakeRequest(
  input: unknown,
  safetyGate: OfflineModelArtifactSafetyGate,
  sizeLimitBytes = OFFLINE_ARTIFACT_SAFE_ENVELOPE_BYTES_LIMIT,
): ArtifactIntakeValidationResult {
  const messages: string[] = [];
  if (!isPlainObject(input)) {
    return {
      valid: false,
      messages: ["Artifact intake request must be a JSON object."],
      normalized: null,
    };
  }

  const request = input as Partial<OfflineModelArtifactIntakeRequest>;
  const artifactName = trimString(request.artifactName);
  const artifactKindRaw = trimString(request.artifactKind);
  const modelKey = trimString(request.modelKey);
  const modelVersion = trimString(request.modelVersion);
  const source = trimString(request.source) || "offline_intake";
  const declaredFormat = trimString(request.declaredFormat);
  const declaredPurpose = trimString(request.declaredPurpose);

  if (!artifactName) messages.push("artifactName is required.");
  if (!artifactKindRaw) messages.push("artifactKind is required.");
  if (artifactKindRaw && !ALLOWED_OFFLINE_ARTIFACT_KINDS.includes(artifactKindRaw as OfflineModelArtifactKind)) {
    messages.push(`artifactKind is not allowed for offline intake: ${artifactKindRaw}`);
  }
  if (!modelKey) messages.push("modelKey is required.");
  if (!modelVersion) messages.push("modelVersion is required.");
  if (!declaredFormat) messages.push("declaredFormat is required.");
  if (!declaredPurpose) messages.push("declaredPurpose is required.");

  const metadataJson = request.metadataJson == null ? {} : request.metadataJson;
  const artifactPayloadJson = request.artifactPayloadJson == null ? null : request.artifactPayloadJson;
  if (!isPlainObject(metadataJson)) messages.push("metadataJson must be a JSON object when provided.");
  if (artifactPayloadJson !== null && !isPlainObject(artifactPayloadJson)) {
    messages.push("artifactPayloadJson must be a JSON object when provided.");
  }

  const safetyViolations = inspectUnsafeIntent({
    artifactName,
    artifactKind: artifactKindRaw,
    modelKey,
    modelVersion,
    source,
    declaredFormat,
    declaredPurpose,
    notes: request.notes ?? null,
    metadataJson,
    artifactPayloadJson,
  });
  messages.push(...safetyViolations);

  if (safetyGate.artifactExecutionAllowed !== false) messages.push("Central safety gate must keep artifactExecutionAllowed=false.");
  if (safetyGate.artifactAutoActivationAllowed !== false) messages.push("Central safety gate must keep artifactAutoActivationAllowed=false.");
  if (safetyGate.modelExecutionAllowed !== false) messages.push("Central safety gate must keep modelExecutionAllowed=false.");
  if (safetyGate.inferenceEndpointExposed !== false) messages.push("Central safety gate must keep inferenceEndpointExposed=false.");
  if (safetyGate.productionIntegrationAllowed !== false) messages.push("Central safety gate must keep productionIntegrationAllowed=false.");
  if (safetyGate.canMutateBusinessRecords !== false) messages.push("Central safety gate must keep canMutateBusinessRecords=false.");

  let sizeBytes = 0;
  try {
    sizeBytes = measureCanonicalArtifactEnvelopeBytes({
      artifactName,
      artifactKind: artifactKindRaw,
      modelKey,
      modelVersion,
      source,
      declaredFormat,
      declaredPurpose,
      relatedModelImportId: request.relatedModelImportId ?? null,
      notes: request.notes ?? null,
      metadataJson: isPlainObject(metadataJson) ? metadataJson : null,
      artifactPayloadJson: isPlainObject(artifactPayloadJson) ? artifactPayloadJson : null,
    });
  } catch (err) {
    messages.push(err instanceof Error ? err.message : "Artifact envelope could not be canonicalized.");
  }
  if (sizeBytes > sizeLimitBytes) messages.push(`Artifact envelope exceeds safe offline intake limit (${sizeBytes}/${sizeLimitBytes} bytes).`);

  if (messages.length > 0) {
    return { valid: false, messages, normalized: null };
  }

  const normalized: NormalizedArtifactIntakeInput = {
    artifactName,
    artifactKind: artifactKindRaw as OfflineModelArtifactKind,
    modelKey,
    modelVersion,
    source,
    declaredFormat,
    declaredPurpose,
    relatedModelImportId: request.relatedModelImportId ?? null,
    notes: request.notes == null ? null : String(request.notes),
    metadataJson: metadataJson as Record<string, unknown>,
    artifactPayloadJson: artifactPayloadJson as Record<string, unknown> | null,
    sizeBytes,
  };

  return {
    valid: true,
    messages: ["Artifact envelope validated for offline quarantine intake only."],
    normalized,
  };
}
