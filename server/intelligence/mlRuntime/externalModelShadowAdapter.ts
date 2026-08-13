import {
  buildShadowRuntimeSafetyNotes,
  getShadowRuntimeSafetyGate,
} from "./shadowRuntimeSafety";
import type {
  ExternalModelShadowRuntimeInput,
  ExternalModelShadowRuntimeOutput,
  ShadowRuntimeDryRunResult,
  ShadowRuntimeValidationIssue,
  ShadowRuntimeValidationResult,
} from "./shadowRuntimeTypes";

const SUPPORTED_PREDICTION_TYPES = new Set([
  "inventory_stockout",
  "inventory_stockout_risk",
  "sales_forecast",
  "collection_pressure",
  "cashflow_pressure",
]);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const hasStructuralId = (value: unknown): boolean => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
};

const normalizeDate = (value: unknown): string => {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
};

export const validateShadowRuntimeInput = (
  input: Partial<ExternalModelShadowRuntimeInput> | null | undefined,
): ShadowRuntimeValidationResult => {
  const issues: ShadowRuntimeValidationIssue[] = [];

  if (!input) {
    return {
      status: "invalid",
      valid: false,
      issues: [{ field: "input", message: "Shadow runtime input payload is required." }],
    };
  }

  if (!hasStructuralId(input.modelImportId)) {
    issues.push({ field: "modelImportId", message: "modelImportId must be a positive number or non-empty string." });
  }

  if (!hasText(input.modelKey)) {
    issues.push({ field: "modelKey", message: "modelKey is required." });
  }

  if (!hasText(input.modelVersion)) {
    issues.push({ field: "modelVersion", message: "modelVersion is required." });
  }

  if (!hasText(input.predictionType)) {
    issues.push({ field: "predictionType", message: "predictionType is required." });
  } else if (!SUPPORTED_PREDICTION_TYPES.has(input.predictionType.trim())) {
    issues.push({ field: "predictionType", message: "predictionType is not supported by the Phase 5A shadow runtime contract." });
  }

  if (!hasText(input.entityType)) {
    issues.push({ field: "entityType", message: "entityType is required." });
  }

  if (input.entityId !== null && input.entityId !== undefined && !hasStructuralId(input.entityId)) {
    issues.push({ field: "entityId", message: "entityId must be null, a positive number, or a non-empty string." });
  }

  if (input.horizonDays !== null && input.horizonDays !== undefined) {
    const horizon = Number(input.horizonDays);
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 365) {
      issues.push({ field: "horizonDays", message: "horizonDays must be null or an integer between 1 and 365." });
    }
  }

  if (!isPlainRecord(input.featureSnapshot) || Object.keys(input.featureSnapshot).length === 0) {
    issues.push({ field: "featureSnapshot", message: "featureSnapshot must be a non-empty object." });
  }

  if (input.baselinePrediction !== null && input.baselinePrediction !== undefined && !isPlainRecord(input.baselinePrediction)) {
    issues.push({ field: "baselinePrediction", message: "baselinePrediction must be null or an object." });
  }

  if (input.baselinePrediction == null) {
    issues.push({ field: "baselinePrediction", message: "baselinePrediction is required for baseline comparison in Phase 5A dry-run validation." });
  }

  return {
    status: issues.length ? "invalid" : "valid",
    valid: issues.length === 0,
    issues,
  };
};

const buildBaseDisabledOutput = (
  mode: "disabled" | "dry_run",
  explanation: string,
  generatedAt = new Date().toISOString(),
): ExternalModelShadowRuntimeOutput => {
  const safetyGate = getShadowRuntimeSafetyGate();
  return {
    allowed: false,
    mode,
    modelExecutionAttempted: false,
    modelExecutionAllowed: safetyGate.modelExecutionAllowed,
    inferenceEndpointExposed: safetyGate.inferenceEndpointExposed,
    productionIntegrationAllowed: safetyGate.productionIntegrationAllowed,
    decisionAutomationAllowed: safetyGate.decisionAutomationAllowed,
    canChangeInventoryOrAccounting: safetyGate.canChangeInventoryOrAccounting,
    score: null,
    label: null,
    confidence: null,
    rawOutput: null,
    explanation,
    safetyNotes: buildShadowRuntimeSafetyNotes(),
    generatedAt,
  };
};

export const buildShadowRuntimeDryRunResult = (
  input: Partial<ExternalModelShadowRuntimeInput> | null | undefined,
): ShadowRuntimeDryRunResult => {
  const generatedAt = new Date().toISOString();
  const validation = validateShadowRuntimeInput(input);
  const output = buildBaseDisabledOutput(
    validation.valid ? "dry_run" : "disabled",
    validation.valid
      ? "Phase 5A dry-run validation succeeded, but runtime model execution remains disabled and no external model was called."
      : "Phase 5A dry-run validation failed safely; runtime model execution remains disabled and no external model was called.",
    generatedAt,
  );

  return {
    ...output,
    validation,
    inputContractSnapshot: {
      modelImportId: input?.modelImportId ?? null,
      modelKey: input?.modelKey ?? null,
      modelVersion: input?.modelVersion ?? null,
      entityType: input?.entityType ?? null,
      entityId: input?.entityId ?? null,
      predictionType: input?.predictionType ?? null,
      horizonDays: input?.horizonDays ?? null,
      featureSnapshotPresent: isPlainRecord(input?.featureSnapshot),
      baselinePredictionPresent: isPlainRecord(input?.baselinePrediction),
      requestedAt: normalizeDate(input?.requestedAt),
      requestedByUserId: input?.requestedByUserId ?? null,
    },
  };
};

export async function runExternalModelShadowAdapter(
  input: ExternalModelShadowRuntimeInput,
): Promise<ShadowRuntimeDryRunResult> {
  return buildShadowRuntimeDryRunResult(input);
}
