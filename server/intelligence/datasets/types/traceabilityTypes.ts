// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { InventoryStockoutShadowObservationEventStoreSummary } from "./compatibilityMatrixTypes";

export type ShadowObservationReviewDashboardStatus = "review_ready" | "needs_observation_events" | "needs_event_store" | "blocked";

export type ShadowObservationReviewDashboardRecommendation =
  | "review_and_export_audit_only_events"
  | "record_audit_only_observation_events_first"
  | "complete_shadow_observation_event_store_first"
  | "resolve_audit_safety_blocks_first";

export type InventoryStockoutShadowObservationReviewDashboardContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredEventStoreContractKey: string;
  dashboardScope: string;
  exportVersions: {
    csv: string;
    json: string;
  };
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowObservationReviewDashboardGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowObservationReviewDashboardSummary = {
  generatedAt: string;
  importId: number | null;
  dashboardStatus: ShadowObservationReviewDashboardStatus;
  recommendation: ShadowObservationReviewDashboardRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  dashboardRuntimeEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  exportOnly: boolean;
  eventCount: number;
  auditOnlyEventCount: number;
  unsafeEventCount: number;
  forbiddenFieldAttemptCount: number;
  observationContractCount: number;
  baselineComparisonAvailable: boolean;
  baselineF1Pct: number | null;
  candidateF1Pct: number | null;
  deltaF1Pct: number | null;
  baselineBalancedAccuracyPct: number | null;
  candidateBalancedAccuracyPct: number | null;
  deltaBalancedAccuracyPct: number | null;
  csvExportVersion: string;
  jsonExportVersion: string;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowObservationReviewDashboardResponse = {
  success: true;
  contract: InventoryStockoutShadowObservationReviewDashboardContract;
  summary: InventoryStockoutShadowObservationReviewDashboardSummary;
  gates: InventoryStockoutShadowObservationReviewDashboardGate[];
  baselineComparison: Record<string, unknown>;
  reviewRows: Array<Record<string, unknown>>;
  exportManifest: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  eventStoreSummary: InventoryStockoutShadowObservationEventStoreSummary;
  recentObservationEvents: Array<Record<string, unknown>>;
  recentObservationContracts: Array<Record<string, unknown>>;
  latestBenchmark: Record<string, unknown> | null;
  latestModelImport: Record<string, unknown> | null;
};

export type MlShadowObservationReviewDashboardCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowObservationReviewDashboardContract;
  currentShadowObservationReviewDashboard: InventoryStockoutShadowObservationReviewDashboardSummary;
  baselineComparison: Record<string, unknown>;
  reviewRows: Array<Record<string, unknown>>;
  exportManifest: Record<string, unknown>;
  recommendedNextAction: string;
};

export type ShadowObservationReviewDecisionLogStatus = "decision_log_ready" | "needs_review_dashboard" | "needs_observation_events" | "blocked";

export type ShadowObservationReviewDecisionLogRecommendation =
  | "record_human_audit_decision"
  | "review_dashboard_first"
  | "record_observation_events_first"
  | "resolve_audit_safety_blocks_first";

export type InventoryStockoutShadowObservationReviewDecisionLogContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredReviewDashboardKey: string;
  decisionLogScope: string;
  allowedDecisionTypes: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowObservationReviewDecisionLogGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowObservationReviewDecisionLogSummary = {
  generatedAt: string;
  importId: number | null;
  decisionLogStatus: ShadowObservationReviewDecisionLogStatus;
  recommendation: ShadowObservationReviewDecisionLogRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  decisionLogEnabled: boolean;
  humanReviewOnly: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  operationalDecisionAllowed: boolean;
  customerSupplierMessageAllowed: boolean;
  reviewDashboardStatus: string | null;
  eventCount: number;
  decisionCount: number;
  pendingDecisionCount: number;
  acceptedForAuditCount: number;
  needsMoreEvidenceCount: number;
  blockedFuturePhaseCount: number;
  forbiddenFieldAttemptCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowObservationReviewDecisionLogResponse = {
  success: true;
  contract: InventoryStockoutShadowObservationReviewDecisionLogContract;
  summary: InventoryStockoutShadowObservationReviewDecisionLogSummary;
  gates: InventoryStockoutShadowObservationReviewDecisionLogGate[];
  decisionPolicy: Record<string, unknown>;
  decisionRows: Array<Record<string, unknown>>;
  recentObservationEvents: Array<Record<string, unknown>>;
  reviewDashboardSummary: InventoryStockoutShadowObservationReviewDashboardSummary;
  auditExport: Record<string, unknown>;
  decisionRecord?: Record<string, unknown> | null;
};

export type MlShadowObservationReviewDecisionLogCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowObservationReviewDecisionLogContract;
  currentShadowObservationReviewDecisionLog: InventoryStockoutShadowObservationReviewDecisionLogSummary;
  lastShadowObservationReviewDecisions: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ShadowObservationDecisionReviewExportBinderStatus = "binder_ready" | "needs_review_dashboard" | "needs_decision_log" | "needs_observation_events" | "blocked";

export type ShadowObservationDecisionReviewExportBinderRecommendation =
  | "export_governance_evidence_binder"
  | "complete_review_dashboard_first"
  | "record_human_review_decisions_first"
  | "record_observation_events_first"
  | "resolve_audit_safety_blocks_first";

export type InventoryStockoutShadowObservationDecisionReviewExportBinderContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredReviewDashboardKey: string;
  requiredDecisionLogKey: string;
  binderScope: string;
  exportVersions: {
    json: string;
    csv: string;
    manifest: string;
  };
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowObservationDecisionReviewExportBinderGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowObservationDecisionReviewExportBinderSummary = {
  generatedAt: string;
  importId: number | null;
  binderStatus: ShadowObservationDecisionReviewExportBinderStatus;
  recommendation: ShadowObservationDecisionReviewExportBinderRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  binderRuntimeEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  exportOnly: boolean;
  humanReviewOnly: boolean;
  baselineOnlySourceOfTruth: boolean;
  operationalDecisionAllowed: boolean;
  customerSupplierMessageAllowed: boolean;
  reviewDashboardStatus: string | null;
  decisionLogStatus: string | null;
  eventCount: number;
  reviewRowCount: number;
  decisionCount: number;
  evidenceSectionCount: number;
  completedEvidenceSectionCount: number;
  baselineComparisonAvailable: boolean;
  unsafeEventCount: number;
  forbiddenFieldAttemptCount: number;
  binderComplete: boolean;
  jsonExportVersion: string;
  csvExportVersion: string;
  manifestVersion: string;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowObservationDecisionReviewExportBinderResponse = {
  success: true;
  contract: InventoryStockoutShadowObservationDecisionReviewExportBinderContract;
  summary: InventoryStockoutShadowObservationDecisionReviewExportBinderSummary;
  gates: InventoryStockoutShadowObservationDecisionReviewExportBinderGate[];
  evidenceSections: Array<Record<string, unknown>>;
  exportManifest: Record<string, unknown>;
  binderPayload: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  reviewDashboardSummary: InventoryStockoutShadowObservationReviewDashboardSummary;
  decisionLogSummary: InventoryStockoutShadowObservationReviewDecisionLogSummary;
  baselineComparison: Record<string, unknown>;
};

export type MlShadowObservationDecisionReviewExportBinderCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowObservationDecisionReviewExportBinderContract;
  currentShadowObservationDecisionReviewExportBinder: InventoryStockoutShadowObservationDecisionReviewExportBinderSummary;
  evidenceSections: Array<Record<string, unknown>>;
  exportManifest: Record<string, unknown>;
  recommendedNextAction: string;
};

export type ShadowObservationBinderReviewSignoffGateStatus = "signoff_ready" | "needs_binder" | "needs_binder_completion" | "needs_human_signoff" | "blocked";

export type ShadowObservationBinderReviewSignoffGateRecommendation =
  | "archive_signed_binder_evidence"
  | "build_export_binder_first"
  | "complete_export_binder_first"
  | "record_human_binder_signoff"
  | "resolve_audit_safety_blocks_first";

export type InventoryStockoutShadowObservationBinderReviewSignoffGateContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredExportBinderKey: string;
  signoffGateScope: string;
  allowedSignoffTypes: string[];
  exportVersions: {
    json: string;
    csv: string;
  };
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowObservationBinderReviewSignoffGateGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowObservationBinderReviewSignoffGateSummary = {
  generatedAt: string;
  importId: number | null;
  signoffGateStatus: ShadowObservationBinderReviewSignoffGateStatus;
  recommendation: ShadowObservationBinderReviewSignoffGateRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  signoffGateEnabled: boolean;
  humanSignoffOnly: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  operationalDecisionAllowed: boolean;
  customerSupplierMessageAllowed: boolean;
  requiredExportBinderKey: string;
  exportBinderStatus: string | null;
  binderComplete: boolean;
  binderFingerprint: string;
  eventCount: number;
  decisionCount: number;
  evidenceSectionCount: number;
  completedEvidenceSectionCount: number;
  signoffCount: number;
  signedCount: number;
  revisionRequestedCount: number;
  blockedFutureReviewCount: number;
  archiveApprovedCount: number;
  forbiddenFieldAttemptCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowObservationBinderReviewSignoffGateResponse = {
  success: true;
  contract: InventoryStockoutShadowObservationBinderReviewSignoffGateContract;
  summary: InventoryStockoutShadowObservationBinderReviewSignoffGateSummary;
  gates: InventoryStockoutShadowObservationBinderReviewSignoffGateGate[];
  signoffPolicy: Record<string, unknown>;
  signoffRows: Array<Record<string, unknown>>;
  binderSummary: InventoryStockoutShadowObservationDecisionReviewExportBinderSummary;
  binderExportManifest: Record<string, unknown>;
  auditExport: Record<string, unknown>;
};

export type MlShadowObservationBinderReviewSignoffGateCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowObservationBinderReviewSignoffGateContract;
  currentShadowObservationBinderReviewSignoffGate: InventoryStockoutShadowObservationBinderReviewSignoffGateSummary;
  lastShadowObservationBinderReviewSignoffs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
