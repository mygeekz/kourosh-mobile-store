export type ShadowRuntimeMode = "disabled" | "dry_run" | "shadow_readonly";

export type ShadowRuntimeValidationStatus = "valid" | "invalid";

export type ShadowRuntimeValidationIssue = {
  field: string;
  message: string;
};

export type ShadowRuntimeValidationResult = {
  status: ShadowRuntimeValidationStatus;
  valid: boolean;
  issues: ShadowRuntimeValidationIssue[];
};

export interface ExternalModelShadowRuntimeInput {
  modelImportId: string | number;
  modelKey: string;
  modelVersion: string;
  entityType: string;
  entityId: string | number | null;
  predictionType: string;
  horizonDays: number | null;
  featureSnapshot: Record<string, unknown>;
  baselinePrediction: Record<string, unknown> | null;
  requestedAt: string;
  requestedByUserId?: string | number | null;
}

export interface ExternalModelShadowRuntimeOutput {
  allowed: boolean;
  mode: ShadowRuntimeMode;
  modelExecutionAttempted: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  score: number | null;
  label: string | null;
  confidence: number | null;
  rawOutput: Record<string, unknown> | null;
  explanation: string;
  safetyNotes: string[];
  generatedAt: string;
}

export type ShadowRuntimeDryRunResult = ExternalModelShadowRuntimeOutput & {
  validation: ShadowRuntimeValidationResult;
  inputContractSnapshot: Record<string, unknown>;
};

export type ShadowRuntimeAttemptStatus = "validation_failed" | "dry_run_recorded" | "disabled";

export type ShadowRuntimeAttemptRecord = {
  id: number;
  modelImportId: number | string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  entityType: string | null;
  entityId: string | number | null;
  runtimeMode: ShadowRuntimeMode;
  allowed: boolean;
  modelExecutionAttempted: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  inputSnapshot: Record<string, unknown> | null;
  outputSnapshot: Record<string, unknown> | null;
  safetyNotes: string[];
  status: ShadowRuntimeAttemptStatus | string;
  createdAt: string;
  createdByUserId: number | string | null;
};
