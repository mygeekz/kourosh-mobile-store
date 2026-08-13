// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
export type OfflinePilotReadinessStatus = "pilot_ready" | "needs_owner_approval" | "watch" | "blocked" | "insufficient_stability";

export type InventoryStockoutOfflinePilotReadinessCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutOfflinePilotReadinessContract = {
  contractKey: "inventory_stockout_offline_pilot_readiness_gate_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedStabilityGateKey: "inventory_stockout_shadow_stability_gate_v1";
  acceptedStabilityStatus: "stable_candidate";
  pilotScope: "offline_pilot_readiness_only";
  readinessRules: string[];
  requiredOwnerApproval: true;
  requiredRollbackPolicy: string[];
  monitoringChecklist: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutOfflinePilotReadinessSummary = {
  gateKey: "inventory_stockout_offline_pilot_readiness_gate_v1";
  generatedAt: string;
  importId: number | null;
  stabilityCheckId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  stabilityStatus: string | null;
  stabilityEvaluationsConsidered: number;
  minimumEvaluations: number;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  ownerApproved: boolean;
  ownerName: string | null;
  pilotOwner: string | null;
  rollbackOwner: string | null;
  monitoringCadence: string;
  status: OfflinePilotReadinessStatus;
  offlinePilotReady: boolean;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  checks: InventoryStockoutOfflinePilotReadinessCheck[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutOfflinePilotReadinessResponse = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotReadinessContract;
  summary: InventoryStockoutOfflinePilotReadinessSummary;
  latestStabilityCheck: Record<string, unknown> | null;
  rollbackPolicy: {
    rollbackRequiredWhen: string[];
    rollbackAction: string;
    rollbackOwner: string | null;
    postRollbackReview: string;
  };
  monitoringPlan: {
    cadence: string;
    checklist: string[];
    stopConditions: string[];
  };
  operationalPolicy: {
    offlinePilotOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  readinessRecord?: Record<string, unknown> | null;
};

export type MlOfflinePilotReadinessCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotReadinessContract;
  currentOfflinePilotReadiness: InventoryStockoutOfflinePilotReadinessSummary;
  lastOfflinePilotChecks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlOfflinePilotReadinessSummaryPayload = {
  generatedAt?: string;
  currentOfflinePilotReadiness?: {
    status?: string;
    importId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    ownerApproved?: boolean;
    offlinePilotReady?: boolean;
    stabilityEvaluationsConsidered?: number;
    minimumEvaluations?: number;
    avgDeltaF1Pct?: number | null;
    avgDeltaBalancedAccuracyPct?: number | null;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastOfflinePilotChecks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};

export type OfflinePilotBoardDecision = "continue_pilot" | "pause_pilot" | "rollback" | "needs_more_review";

export type OfflinePilotBoardStatus = "board_ready" | "continue_pilot" | "pause_pilot" | "rollback_required" | "needs_more_review" | "blocked" | "insufficient_pilot_readiness";

export type InventoryStockoutOfflinePilotDecisionCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutOfflinePilotDecisionContract = {
  contractKey: "inventory_stockout_offline_pilot_human_review_board_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedOfflinePilotGateKey: "inventory_stockout_offline_pilot_readiness_gate_v1";
  acceptedOfflinePilotStatus: "pilot_ready";
  reviewScope: "offline_pilot_human_review_only";
  allowedDecisions: OfflinePilotBoardDecision[];
  requiredReviewBoardFields: string[];
  decisionRules: string[];
  rollbackRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutOfflinePilotDecisionSummary = {
  decisionKey: "inventory_stockout_offline_pilot_decision_log_v1";
  generatedAt: string;
  importId: number | null;
  offlinePilotCheckId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  offlinePilotStatus: string | null;
  offlinePilotReady: boolean;
  boardDecision: OfflinePilotBoardDecision | null;
  boardStatus: OfflinePilotBoardStatus;
  boardScope: "offline_pilot_human_review_only";
  reviewBoardMemberCount: number;
  pilotOwner: string | null;
  rollbackOwner: string | null;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  checks: InventoryStockoutOfflinePilotDecisionCheck[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutOfflinePilotDecisionResponse = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotDecisionContract;
  summary: InventoryStockoutOfflinePilotDecisionSummary;
  latestOfflinePilotReadiness: Record<string, unknown> | null;
  reviewBoard: {
    members: Array<Record<string, unknown>>;
    quorumRequired: number;
    quorumMet: boolean;
  };
  decisionLog: {
    boardDecision: OfflinePilotBoardDecision | null;
    rationale: string | null;
    actionItems: Array<Record<string, unknown>>;
  };
  operationalPolicy: {
    offlineHumanReviewOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  decisionRecord?: Record<string, unknown> | null;
};

export type MlOfflinePilotDecisionCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotDecisionContract;
  currentDecisionBoard: InventoryStockoutOfflinePilotDecisionSummary;
  lastDecisionReviews: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type OfflinePilotOutcomeReviewPackStatus = "pack_ready" | "needs_board_decision" | "rollback_review" | "blocked" | "insufficient_offline_pilot_history";

export type InventoryStockoutOfflinePilotReviewPackContract = {
  contractKey: "inventory_stockout_offline_pilot_outcome_review_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDecisionContractKey: "inventory_stockout_offline_pilot_human_review_board_v1";
  packScope: "offline_review_pack_only";
  requiredSections: string[];
  recommendationRules: string[];
  rollbackStatusRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutOfflinePilotReviewPackSummary = {
  packKey: "inventory_stockout_offline_pilot_outcome_review_pack_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  boardDecision: string | null;
  boardStatus: string | null;
  offlinePilotStatus: string | null;
  stabilityStatus: string | null;
  shadowEvaluationsCount: number;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  rollbackStatus: "not_required" | "watch" | "rollback_recommended" | "rollback_required";
  recommendation: "continue_offline_pilot" | "pause_for_more_review" | "rollback" | "collect_more_shadow_history" | "blocked";
  status: OfflinePilotOutcomeReviewPackStatus;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutOfflinePilotReviewPackResponse = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotReviewPackContract;
  summary: InventoryStockoutOfflinePilotReviewPackSummary;
  executiveSummary: Record<string, unknown>;
  timeline: Array<Record<string, unknown>>;
  pack: {
    modelResultImport: Record<string, unknown> | null;
    shadowEvaluations: Array<Record<string, unknown>>;
    stabilityGate: Record<string, unknown> | null;
    offlinePilotReadiness: Record<string, unknown> | null;
    decisionBoard: Record<string, unknown> | null;
    recommendation: Record<string, unknown>;
    rollbackStatus: Record<string, unknown>;
  };
  operationalPolicy: {
    offlineReviewPackOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  reviewPackRecord?: Record<string, unknown> | null;
};

export type MlOfflinePilotReviewPackCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotReviewPackContract;
  currentReviewPack: InventoryStockoutOfflinePilotReviewPackSummary;
  lastReviewPacks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type OfflinePilotKpiDashboardStatus = "dashboard_ready" | "review_required" | "rollback_required" | "blocked" | "insufficient_review_data";

export type InventoryStockoutOfflinePilotKpiDashboardContract = {
  contractKey: "inventory_stockout_offline_pilot_kpi_dashboard_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedReviewPackKey: "inventory_stockout_offline_pilot_outcome_review_pack_v1";
  dashboardScope: "offline_pilot_management_dashboard_only";
  requiredKpis: string[];
  exportFormats: Array<"json" | "markdown">;
  exportRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutOfflinePilotKpiDashboardSummary = {
  dashboardKey: "inventory_stockout_offline_pilot_kpi_dashboard_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  pilotReadinessPct: number;
  shadowEvaluationsCount: number;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  rollbackStatus: "not_required" | "watch" | "rollback_recommended" | "rollback_required";
  boardDecision: string | null;
  boardStatus: string | null;
  recommendation: string | null;
  stabilityStatus: string | null;
  offlinePilotStatus: string | null;
  reviewPackCount: number;
  exportCount: number;
  riskItemCount: number;
  status: OfflinePilotKpiDashboardStatus;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutOfflinePilotKpiDashboardResponse = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotKpiDashboardContract;
  summary: InventoryStockoutOfflinePilotKpiDashboardSummary;
  kpiCards: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
  reviewExport: Record<string, unknown>;
  markdownExport: string;
  latestReviewPack: InventoryStockoutOfflinePilotReviewPackResponse | null;
  previousExports: Array<Record<string, unknown>>;
  operationalPolicy: {
    offlineDashboardOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  exportRecord?: Record<string, unknown> | null;
};

export type InventoryStockoutOfflinePilotReviewExportResponse = InventoryStockoutOfflinePilotKpiDashboardResponse;

export type MlOfflinePilotKpiDashboardCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotKpiDashboardContract;
  currentKpiDashboard: InventoryStockoutOfflinePilotKpiDashboardSummary;
  kpiCards: Array<Record<string, unknown>>;
  lastReviewExports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type OfflinePilotCloseoutStatus = "closeout_ready" | "needs_more_evidence" | "rollback_required" | "blocked" | "not_started";

export type OfflinePilotCloseoutRecommendation =
  | "close_offline_pilot_continue_to_production_readiness_planning"
  | "extend_offline_pilot"
  | "rollback"
  | "blocked";

export type InventoryStockoutOfflinePilotCloseoutContract = {
  contractKey: "inventory_stockout_offline_pilot_closeout_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedKpiDashboardKey: "inventory_stockout_offline_pilot_kpi_dashboard_v1";
  closeoutScope: "offline_pilot_closeout_and_preconditions_only";
  requiredInputs: string[];
  productionReadinessPreconditions: string[];
  closeoutRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutOfflinePilotCloseoutCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutOfflinePilotCloseoutSummary = {
  closeoutKey: "inventory_stockout_offline_pilot_closeout_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  dashboardStatus: string | null;
  recommendation: OfflinePilotCloseoutRecommendation;
  rollbackStatus: "not_required" | "watch" | "rollback_recommended" | "rollback_required";
  pilotReadinessPct: number | null;
  shadowEvaluationsCount: number;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  closeoutStatus: OfflinePilotCloseoutStatus;
  productionReadinessPreconditionsMet: boolean;
  ownerSignoff: boolean;
  ownerName: string | null;
  productionReadinessOwner: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  checks: InventoryStockoutOfflinePilotCloseoutCheck[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutOfflinePilotCloseoutResponse = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotCloseoutContract;
  summary: InventoryStockoutOfflinePilotCloseoutSummary;
  latestReviewExport: Record<string, unknown> | null;
  latestReviewPack: Record<string, unknown> | null;
  productionReadinessPreconditions: InventoryStockoutOfflinePilotCloseoutCheck[];
  riskSignoff: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousCloseouts: Array<Record<string, unknown>>;
  operationalPolicy: {
    offlineCloseoutOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  closeoutRecord?: Record<string, unknown> | null;
};

export type MlOfflinePilotCloseoutCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutOfflinePilotCloseoutContract;
  currentCloseout: InventoryStockoutOfflinePilotCloseoutSummary;
  lastCloseouts: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
