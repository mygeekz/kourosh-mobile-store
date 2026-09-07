// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { BaselineBenchmarkMetrics } from "./benchmarkTypes";
import type { DatasetSplitStrategy } from "./datasetSplitTypes";

export type ExternalModelImportStatus = "validated" | "warning" | "rejected" | "insufficient_data";

export type ExternalModelImportPredictionRow = {
  rowKey: string;
  predictedProbability: number;
  predictedLabel?: 0 | 1;
};

export type ExternalModelImportRequest = {
  modelKey?: string;
  modelVersion?: string;
  packageKey?: string;
  packageVersion?: string;
  datasetKey?: string;
  datasetVersion?: string;
  splitKey?: string;
  seed?: string;
  testRatio?: number;
  strategy?: DatasetSplitStrategy;
  threshold?: number;
  predictions?: ExternalModelImportPredictionRow[];
  modelCard?: Record<string, unknown>;
  userId?: number | null;
};

export type ExternalModelImportIssue = {
  key: string;
  severity: "info" | "warning" | "blocker";
  message: string;
};

export type ExternalModelImportContract = {
  contractKey: "inventory_stockout_external_model_result_import_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDatasetKey: "inventory_stockout_baseline_v1";
  acceptedPackageKey: "inventory_stockout_external_training_package_v1";
  labelKey: "actual_stockout_within_horizon";
  expectedPredictionSchema: {
    rowKey: "string";
    predictedProbability: "number:0..1";
    predictedLabel: "optional binary 0|1; if omitted, threshold is applied";
  };
  requiredTopLevelFields: string[];
  optionalTopLevelFields: string[];
  validationRules: string[];
  forbiddenBehavior: string[];
  exampleRequest: Record<string, unknown>;
};

export type ExternalModelImportValidationSummary = {
  contractKey: "inventory_stockout_external_model_result_import_v1";
  generatedAt: string;
  modelKey: string | null;
  modelVersion: string | null;
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  packageKey: "inventory_stockout_external_training_package_v1";
  packageVersion: "v1";
  splitKey: string;
  splitStrategy: DatasetSplitStrategy;
  seed: string;
  testRatio: number;
  labelKey: "actual_stockout_within_horizon";
  threshold: number;
  expectedTestRows: number;
  importedRows: number;
  matchedTestRows: number;
  missingTestRows: number;
  unexpectedRows: number;
  duplicateRows: number;
  metrics: BaselineBenchmarkMetrics;
  baseline: {
    bestCandidateKey: string | null;
    bestCandidateLabel: string | null;
    f1Pct: number | null;
    balancedAccuracyPct: number | null;
  };
  comparison: {
    deltaF1Pct: number | null;
    deltaBalancedAccuracyPct: number | null;
    beatsBaselineOnF1: boolean | null;
    beatsBaselineOnBalancedAccuracy: boolean | null;
  };
  status: ExternalModelImportStatus;
  issues: ExternalModelImportIssue[];
  recommendedNextAction: string;
};

export type ExternalModelImportValidationResponse = {
  generatedAt: string;
  contract: ExternalModelImportContract;
  summary: ExternalModelImportValidationSummary;
  acceptedPredictions: Array<ExternalModelImportPredictionRow & { actualLabel: 0 | 1; predictedLabelResolved: 0 | 1 }>;
  importRecord?: Record<string, unknown> | null;
};

export type ExternalModelApprovalDecision = "approved_candidate" | "rejected" | "needs_changes";

export type ExternalModelApprovalStatus = "pending_review" | "approved_candidate" | "rejected" | "needs_changes" | "blocked";

export type ExternalModelApprovalGateCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type ExternalModelApprovalPolicyGate = {
  gateKey: "inventory_stockout_external_model_approval_gate_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  status: "pass" | "warning" | "block";
  canApprove: boolean;
  requiresMetricOverride: boolean;
  checks: ExternalModelApprovalGateCheck[];
  blockers: string[];
  warnings: string[];
  recommendedDecision: ExternalModelApprovalDecision;
  recommendedNextAction: string;
};

export type ExternalModelApprovalPolicyContract = {
  contractKey: "inventory_stockout_external_model_approval_workflow_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDatasetKey: "inventory_stockout_baseline_v1";
  acceptedPackageKey: "inventory_stockout_external_training_package_v1";
  allowedDecisions: ExternalModelApprovalDecision[];
  approvalScope: "offline_candidate_review_only";
  policyChecks: string[];
  overrideRules: string[];
  forbiddenBehavior: string[];
};

export type ExternalModelApprovalReviewRequest = {
  importId?: number | string;
  decision?: ExternalModelApprovalDecision;
  reason?: string;
  reviewerNotes?: string;
  allowMetricOverride?: boolean;
  requestedPromotionStage?: "candidate" | "none";
  userId?: number | null;
};

export type ExternalModelApprovalReviewResponse = {
  generatedAt: string;
  contract: ExternalModelApprovalPolicyContract;
  gate: ExternalModelApprovalPolicyGate;
  review: Record<string, unknown> | null;
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    promotionStage: ExternalModelApprovalStatus;
    message: string;
  };
};

export type MlModelApprovalCatalogSummary = {
  generatedAt: string;
  contract: ExternalModelApprovalPolicyContract;
  currentGate: ExternalModelApprovalPolicyGate;
  lastApprovedCandidate: Record<string, unknown> | null;
  pendingReviewCount: number;
  lastApprovalReviews: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlModelApprovalSummaryPayload = {
  generatedAt?: string;
  currentGate?: {
    status?: string;
    canApprove?: boolean;
    requiresMetricOverride?: boolean;
    modelKey?: string | null;
    modelVersion?: string | null;
    blockers?: string[];
    warnings?: string[];
    recommendedDecision?: string;
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastApprovedCandidate?: Record<string, unknown> | null;
  pendingReviewCount?: number;
  lastApprovalReviews?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};

export type ShadowEvaluationStatus = "ready" | "watch" | "underperforming" | "blocked" | "insufficient_data";

export type InventoryStockoutShadowEvaluationContract = {
  contractKey: "inventory_stockout_approved_candidate_shadow_evaluation_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDatasetKey: "inventory_stockout_baseline_v1";
  acceptedPackageKey: "inventory_stockout_external_training_package_v1";
  acceptedApprovalScope: "offline_candidate_review_only";
  shadowMode: {
    enabled: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    canChangeInventoryOrAccounting: false;
  };
  evaluationRules: string[];
  forbiddenBehavior: string[];
};

export type InventoryStockoutShadowEvaluationSummary = {
  evaluationKey: "inventory_stockout_shadow_evaluation_v1";
  generatedAt: string;
  importId: number | null;
  approvalReviewId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  evaluatedOn: "approved_import_test_split_replay";
  shadowModeEnabled: true;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  evaluatedRows: number;
  candidateF1Pct: number | null;
  baselineF1Pct: number | null;
  deltaF1Pct: number | null;
  candidateBalancedAccuracyPct: number | null;
  baselineBalancedAccuracyPct: number | null;
  deltaBalancedAccuracyPct: number | null;
  status: ShadowEvaluationStatus;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowEvaluationResponse = {
  generatedAt: string;
  contract: InventoryStockoutShadowEvaluationContract;
  summary: InventoryStockoutShadowEvaluationSummary;
  approvedCandidate: Record<string, unknown> | null;
  sourceImport: Record<string, unknown> | null;
  metricsComparison: {
    beatsBaselineOnF1: boolean | null;
    beatsBaselineOnBalancedAccuracy: boolean | null;
    stableEnoughForPilot: false;
    explanation: string;
  };
  operationalPolicy: {
    shadowOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  evaluationRecord?: Record<string, unknown> | null;
};

export type MlShadowEvaluationCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowEvaluationContract;
  currentShadowEvaluation: InventoryStockoutShadowEvaluationSummary;
  lastShadowEvaluations: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlShadowEvaluationSummaryPayload = {
  generatedAt?: string;
  currentShadowEvaluation?: {
    status?: string;
    importId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    evaluatedRows?: number;
    candidateF1Pct?: number | null;
    baselineF1Pct?: number | null;
    deltaF1Pct?: number | null;
    candidateBalancedAccuracyPct?: number | null;
    baselineBalancedAccuracyPct?: number | null;
    deltaBalancedAccuracyPct?: number | null;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastShadowEvaluations?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};

export type ShadowStabilityGateStatus = "stable_candidate" | "watch" | "unstable" | "blocked" | "insufficient_history";

export type InventoryStockoutShadowStabilityContract = {
  contractKey: "inventory_stockout_shadow_monitoring_stability_gate_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedEvaluationKey: "inventory_stockout_shadow_evaluation_v1";
  minimumEvaluations: number;
  lookbackEvaluations: number;
  stabilityRules: string[];
  shadowOnlyPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
  forbiddenBehavior: string[];
};

export type InventoryStockoutShadowStabilitySummary = {
  gateKey: "inventory_stockout_shadow_stability_gate_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  evaluationsConsidered: number;
  minimumEvaluations: number;
  candidateAvgF1Pct: number | null;
  baselineAvgF1Pct: number | null;
  avgDeltaF1Pct: number | null;
  candidateAvgBalancedAccuracyPct: number | null;
  baselineAvgBalancedAccuracyPct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  positiveDeltaF1Count: number;
  positiveDeltaBalancedAccuracyCount: number;
  underperformingCount: number;
  blockedCount: number;
  readyCount: number;
  watchCount: number;
  status: ShadowStabilityGateStatus;
  stableEnoughForOfflinePilot: boolean;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowStabilityResponse = {
  generatedAt: string;
  contract: InventoryStockoutShadowStabilityContract;
  summary: InventoryStockoutShadowStabilitySummary;
  evaluations: Array<Record<string, unknown>>;
  operationalPolicy: {
    shadowOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  stabilityRecord?: Record<string, unknown> | null;
};

export type MlShadowStabilityCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowStabilityContract;
  currentStabilityGate: InventoryStockoutShadowStabilitySummary;
  lastStabilityChecks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlShadowStabilitySummaryPayload = {
  generatedAt?: string;
  currentStabilityGate?: {
    status?: string;
    importId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    evaluationsConsidered?: number;
    minimumEvaluations?: number;
    avgDeltaF1Pct?: number | null;
    avgDeltaBalancedAccuracyPct?: number | null;
    stableEnoughForOfflinePilot?: boolean;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastStabilityChecks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
