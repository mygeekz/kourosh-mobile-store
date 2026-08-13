import type {
  ExternalModelShadowRuntimeInput,
  ExternalModelShadowRuntimeOutput,
  ShadowRuntimeAttemptStatus,
} from "./shadowRuntimeTypes";

export const mapShadowRuntimeAttemptInputSnapshot = (
  input: ExternalModelShadowRuntimeInput,
): Record<string, unknown> => ({
  modelImportId: input.modelImportId,
  modelKey: input.modelKey,
  modelVersion: input.modelVersion,
  entityType: input.entityType,
  entityId: input.entityId,
  predictionType: input.predictionType,
  horizonDays: input.horizonDays,
  featureSnapshot: input.featureSnapshot,
  baselinePrediction: input.baselinePrediction,
  requestedAt: input.requestedAt,
  requestedByUserId: input.requestedByUserId ?? null,
});

export const mapShadowRuntimeAttemptOutputSnapshot = (
  output: ExternalModelShadowRuntimeOutput,
): Record<string, unknown> => ({
  allowed: output.allowed,
  mode: output.mode,
  modelExecutionAttempted: output.modelExecutionAttempted,
  modelExecutionAllowed: output.modelExecutionAllowed,
  inferenceEndpointExposed: output.inferenceEndpointExposed,
  productionIntegrationAllowed: output.productionIntegrationAllowed,
  decisionAutomationAllowed: output.decisionAutomationAllowed,
  canChangeInventoryOrAccounting: output.canChangeInventoryOrAccounting,
  score: output.score,
  label: output.label,
  confidence: output.confidence,
  rawOutput: output.rawOutput,
  explanation: output.explanation,
  safetyNotes: output.safetyNotes,
  generatedAt: output.generatedAt,
});

export const mapShadowRuntimeAttemptStatus = (
  output: ExternalModelShadowRuntimeOutput,
  validationValid: boolean,
): ShadowRuntimeAttemptStatus => {
  if (!validationValid) return "validation_failed";
  if (output.mode === "dry_run") return "dry_run_recorded";
  return "disabled";
};
