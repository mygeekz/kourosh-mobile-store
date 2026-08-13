// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
export type ProductionReadinessDesignStatus = "design_ready" | "needs_safety_review" | "rollback_required" | "blocked" | "not_started";

export type ProductionReadinessDesignRecommendation =
  | "prepare_separate_production_readiness_phase"
  | "complete_safety_architecture_review"
  | "rollback"
  | "blocked";

export type InventoryStockoutProductionReadinessDesignContract = {
  contractKey: "inventory_stockout_production_readiness_design_spec_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedCloseoutKey: "inventory_stockout_offline_pilot_closeout_v1";
  designScope: "production_readiness_design_only";
  requiredInputs: string[];
  requiredArchitectureSections: string[];
  safetyGateRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionReadinessDesignSafetyGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionReadinessDesignSummary = {
  designKey: "inventory_stockout_production_readiness_design_spec_v1";
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  closeoutStatus: string | null;
  closeoutId: number | null;
  rollbackStatus: "not_required" | "watch" | "rollback_recommended" | "rollback_required";
  designStatus: ProductionReadinessDesignStatus;
  recommendation: ProductionReadinessDesignRecommendation;
  productionReadinessDesignPreconditionsMet: boolean;
  architectureOwner: string | null;
  securityReviewOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  manualOverrideOwner: string | null;
  productionReadinessOwner: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  safetyGates: InventoryStockoutProductionReadinessDesignSafetyGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionReadinessDesignResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionReadinessDesignContract;
  summary: InventoryStockoutProductionReadinessDesignSummary;
  latestCloseout: Record<string, unknown> | null;
  architectureSpec: Record<string, unknown>;
  safetyArchitecture: Record<string, unknown>;
  rolloutRollbackPlan: Record<string, unknown>;
  auditDesignSpec: Record<string, unknown>;
  previousDesignSpecs: Array<Record<string, unknown>>;
  operationalPolicy: {
    designOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  designRecord?: Record<string, unknown> | null;
};

export type MlProductionReadinessDesignCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionReadinessDesignContract;
  currentDesign: InventoryStockoutProductionReadinessDesignSummary;
  lastDesignSpecs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionReadinessBacklogStatus = "backlog_ready" | "needs_owner_assignment" | "needs_risk_review" | "blocked" | "not_started";

export type ProductionReadinessBacklogRecommendation =
  | "prepare_future_implementation_phase"
  | "assign_required_owners"
  | "complete_risk_review"
  | "blocked";

export type InventoryStockoutProductionReadinessBacklogContract = {
  contractKey: "inventory_stockout_production_readiness_backlog_risk_register_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDesignKey: "inventory_stockout_production_readiness_design_spec_v1";
  backlogScope: "implementation_backlog_and_risk_register_only";
  requiredInputs: string[];
  requiredBacklogSections: string[];
  requiredRiskRegisterSections: string[];
  releaseGateRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionReadinessBacklogGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionReadinessBacklogSummary = {
  backlogKey: "inventory_stockout_production_readiness_backlog_risk_register_v1";
  generatedAt: string;
  importId: number | null;
  designSpecId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  designStatus: string | null;
  backlogStatus: ProductionReadinessBacklogStatus;
  releaseGateStatus: "not_ready" | "ready_for_future_phase_scoping" | "blocked";
  recommendation: ProductionReadinessBacklogRecommendation;
  ownerMatrixComplete: boolean;
  riskRegisterStatus: "draft" | "review_required" | "blocked" | "ready";
  totalBacklogItems: number;
  readyBacklogItems: number;
  openBlockerCount: number;
  highRiskCount: number;
  architectureOwner: string | null;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  riskOwner: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  releaseGates: InventoryStockoutProductionReadinessBacklogGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionReadinessBacklogResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionReadinessBacklogContract;
  summary: InventoryStockoutProductionReadinessBacklogSummary;
  latestDesignSpec: Record<string, unknown> | null;
  ownerMatrix: Record<string, unknown>;
  implementationBacklog: Array<Record<string, unknown>>;
  riskRegister: Array<Record<string, unknown>>;
  releaseGateChecklist: Array<Record<string, unknown>>;
  previousBacklogs: Array<Record<string, unknown>>;
  operationalPolicy: {
    backlogOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  backlogRecord?: Record<string, unknown> | null;
};

export type MlProductionReadinessBacklogCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionReadinessBacklogContract;
  currentBacklog: InventoryStockoutProductionReadinessBacklogSummary;
  lastBacklogs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionReleaseGateSimulationStatus = "simulation_passed" | "needs_backlog_work" | "needs_risk_review" | "blocked" | "not_started";

export type ProductionReleaseGateSimulationRecommendation =
  | "scope_future_implementation_phase"
  | "complete_backlog_release_gate"
  | "complete_risk_register"
  | "blocked";

export type InventoryStockoutProductionReleaseGateSimulationContract = {
  contractKey: "inventory_stockout_production_release_gate_simulation_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedBacklogKey: "inventory_stockout_production_readiness_backlog_risk_register_v1";
  simulationScope: "production_readiness_release_gate_simulation_only";
  requiredInputs: string[];
  simulationRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionReleaseGateSimulationGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionReleaseGateSimulationSummary = {
  simulationKey: "inventory_stockout_production_release_gate_simulation_v1";
  generatedAt: string;
  importId: number | null;
  backlogId: number | null;
  designSpecId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  backlogStatus: string | null;
  backlogReleaseGateStatus: string | null;
  simulationStatus: ProductionReleaseGateSimulationStatus;
  simulatedReleaseGateStatus: "ready_for_future_implementation_scoping" | "not_ready" | "blocked";
  recommendation: ProductionReleaseGateSimulationRecommendation;
  readinessScorePct: number;
  ownerMatrixComplete: boolean;
  riskRegisterStatus: string;
  releaseGateChecklistStatus: "ready" | "review_required" | "blocked";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  gateResults: InventoryStockoutProductionReleaseGateSimulationGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionReleaseGateSimulationResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionReleaseGateSimulationContract;
  summary: InventoryStockoutProductionReleaseGateSimulationSummary;
  latestBacklog: Record<string, unknown> | null;
  releaseGateChecklist: Array<Record<string, unknown>>;
  riskRegister: Array<Record<string, unknown>>;
  simulationReport: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousSimulations: Array<Record<string, unknown>>;
  operationalPolicy: {
    releaseGateSimulationOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  simulationRecord?: Record<string, unknown> | null;
};

export type MlProductionReleaseGateSimulationCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionReleaseGateSimulationContract;
  currentSimulation: InventoryStockoutProductionReleaseGateSimulationSummary;
  lastSimulations: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionImplementationCharterStatus = "charter_ready" | "needs_owner_signoff" | "needs_release_gate_simulation" | "needs_scope_review" | "blocked" | "not_started";

export type ProductionImplementationCharterRecommendation =
  | "prepare_future_implementation_plan"
  | "complete_owner_signoff"
  | "complete_release_gate_simulation"
  | "complete_scope_boundary"
  | "blocked";

export type InventoryStockoutProductionImplementationCharterContract = {
  contractKey: "inventory_stockout_production_implementation_readiness_charter_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedSimulationKey: "inventory_stockout_production_release_gate_simulation_v1";
  charterScope: "production_implementation_readiness_charter_only";
  requiredInputs: string[];
  charterRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionImplementationCharterGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionImplementationCharterSummary = {
  charterKey: "inventory_stockout_production_implementation_readiness_charter_v1";
  generatedAt: string;
  importId: number | null;
  simulationId: number | null;
  backlogId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  simulationStatus: string | null;
  simulatedReleaseGateStatus: string | null;
  charterStatus: ProductionImplementationCharterStatus;
  recommendation: ProductionImplementationCharterRecommendation;
  readinessScorePct: number;
  scopeBoundaryStatus: "defined" | "needs_review" | "blocked";
  ownerMatrixStatus: "complete" | "incomplete" | "blocked";
  goNoGoStatus: "ready_for_future_planning" | "needs_review" | "blocked";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  signoffOwner: string | null;
  executiveSponsor: string | null;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  charterGates: InventoryStockoutProductionImplementationCharterGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionImplementationCharterResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationCharterContract;
  summary: InventoryStockoutProductionImplementationCharterSummary;
  latestSimulation: Record<string, unknown> | null;
  latestBacklog: Record<string, unknown> | null;
  scopeBoundary: Record<string, unknown>;
  responsibilityMatrix: Record<string, unknown>;
  goNoGoChecklist: Array<Record<string, unknown>>;
  charterDocument: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousCharters: Array<Record<string, unknown>>;
  operationalPolicy: {
    implementationCharterOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  charterRecord?: Record<string, unknown> | null;
};

export type MlProductionImplementationCharterCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationCharterContract;
  currentCharter: InventoryStockoutProductionImplementationCharterSummary;
  lastCharters: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionImplementationWorkOrderStatus = "work_order_ready" | "needs_charter" | "needs_owner_assignment" | "needs_task_breakdown" | "blocked" | "not_started";

export type ProductionImplementationWorkOrderRecommendation =
  | "prepare_future_implementation_workstream"
  | "complete_implementation_charter"
  | "complete_owner_assignment"
  | "complete_work_order_breakdown"
  | "blocked";

export type InventoryStockoutProductionImplementationWorkOrderContract = {
  contractKey: "inventory_stockout_production_implementation_work_order_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedCharterKey: "inventory_stockout_production_implementation_readiness_charter_v1";
  workOrderScope: "future_implementation_work_order_pack_only";
  requiredInputs: string[];
  workOrderRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionImplementationWorkOrderGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionImplementationWorkOrderSummary = {
  workOrderKey: "inventory_stockout_production_implementation_work_order_pack_v1";
  generatedAt: string;
  importId: number | null;
  charterId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  charterStatus: string | null;
  charterGoNoGoStatus: string | null;
  workOrderStatus: ProductionImplementationWorkOrderStatus;
  recommendation: ProductionImplementationWorkOrderRecommendation;
  readinessScorePct: number;
  workOrderScopeStatus: "defined" | "needs_review" | "blocked";
  ownerMatrixStatus: "complete" | "incomplete";
  releaseHandoffStatus: "ready_for_future_phase_scoping" | "blocked";
  epicCount: number;
  taskCount: number;
  acceptanceCriteriaCount: number;
  qaChecklistCount: number;
  rolloutChecklistCount: number;
  rolloutBlockedCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  workOrderGates: InventoryStockoutProductionImplementationWorkOrderGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionImplementationWorkOrderResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationWorkOrderContract;
  summary: InventoryStockoutProductionImplementationWorkOrderSummary;
  latestCharter: Record<string, unknown> | null;
  workOrderDocument: Record<string, unknown>;
  epicBreakdown: Array<Record<string, unknown>>;
  taskBreakdown: Array<Record<string, unknown>>;
  acceptanceCriteria: Array<Record<string, unknown>>;
  qaPlan: Record<string, unknown>;
  rolloutChecklist: Array<Record<string, unknown>>;
  auditExport: Record<string, unknown>;
  previousWorkOrders: Array<Record<string, unknown>>;
  operationalPolicy: {
    implementationWorkOrderOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  workOrderRecord?: Record<string, unknown> | null;
};

export type MlProductionImplementationWorkOrderCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationWorkOrderContract;
  currentWorkOrder: InventoryStockoutProductionImplementationWorkOrderSummary;
  lastWorkOrders: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionImplementationDryRunPlanStatus = "dry_run_ready" | "needs_work_order" | "needs_dependency_sequence" | "needs_milestone_plan" | "blocked" | "not_started";

export type ProductionImplementationDryRunPlanRecommendation =
  | "schedule_dry_run_review"
  | "complete_work_order_pack"
  | "complete_dependency_sequence"
  | "complete_milestone_plan"
  | "blocked";

export type InventoryStockoutProductionImplementationDryRunPlanContract = {
  contractKey: "inventory_stockout_production_implementation_dry_run_planner_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedWorkOrderKey: "inventory_stockout_production_implementation_work_order_pack_v1";
  dryRunScope: "future_implementation_dry_run_planning_only";
  requiredInputs: string[];
  dryRunRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionImplementationDryRunPlanGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionImplementationDryRunPlanSummary = {
  dryRunKey: "inventory_stockout_production_implementation_dry_run_planner_v1";
  generatedAt: string;
  importId: number | null;
  workOrderId: number | null;
  charterId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  workOrderStatus: string | null;
  releaseHandoffStatus: string | null;
  dryRunStatus: ProductionImplementationDryRunPlanStatus;
  recommendation: ProductionImplementationDryRunPlanRecommendation;
  readinessScorePct: number;
  dependencySequenceStatus: "ready" | "needs_review" | "blocked";
  milestonePlanStatus: "ready" | "needs_review" | "blocked";
  dependencyCount: number;
  milestoneCount: number;
  dryRunTaskCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  dryRunGates: InventoryStockoutProductionImplementationDryRunPlanGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionImplementationDryRunPlanResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationDryRunPlanContract;
  summary: InventoryStockoutProductionImplementationDryRunPlanSummary;
  latestWorkOrder: Record<string, unknown> | null;
  dryRunPlan: Record<string, unknown>;
  dependencySequence: Array<Record<string, unknown>>;
  milestonePlan: Array<Record<string, unknown>>;
  readinessBlockers: Array<Record<string, unknown>>;
  dryRunChecklist: Array<Record<string, unknown>>;
  auditExport: Record<string, unknown>;
  previousDryRuns: Array<Record<string, unknown>>;
  operationalPolicy: {
    implementationDryRunPlanningOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  dryRunRecord?: Record<string, unknown> | null;
};

export type MlProductionImplementationDryRunPlanCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionImplementationDryRunPlanContract;
  currentDryRunPlan: InventoryStockoutProductionImplementationDryRunPlanSummary;
  lastDryRunPlans: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionDryRunExecutionStatus = "execution_ready" | "needs_dry_run_plan" | "needs_evidence" | "needs_signoff" | "blocked" | "not_started";

export type ProductionDryRunExecutionRecommendation =
  | "record_evidence_binder"
  | "complete_dry_run_plan"
  | "collect_required_evidence"
  | "collect_signoffs"
  | "blocked";

export type InventoryStockoutProductionDryRunExecutionContract = {
  contractKey: "inventory_stockout_production_dry_run_execution_evidence_binder_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedDryRunKey: "inventory_stockout_production_implementation_dry_run_planner_v1";
  executionScope: "dry_run_execution_log_and_evidence_binder_only";
  requiredEvidenceKeys: string[];
  executionRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionDryRunExecutionGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionDryRunExecutionSummary = {
  executionLogKey: "inventory_stockout_production_dry_run_execution_evidence_binder_v1";
  generatedAt: string;
  importId: number | null;
  dryRunPlanId: number | null;
  workOrderId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  dryRunStatus: string | null;
  executionStatus: ProductionDryRunExecutionStatus;
  recommendation: ProductionDryRunExecutionRecommendation;
  readinessScorePct: number;
  evidenceBinderStatus: "complete" | "partial" | "missing";
  signoffStatus: "complete" | "partial" | "missing";
  evidenceItemCount: number;
  acceptedEvidenceCount: number;
  signoffCount: number;
  unresolvedBlockerCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  executionGates: InventoryStockoutProductionDryRunExecutionGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionDryRunExecutionResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionDryRunExecutionContract;
  summary: InventoryStockoutProductionDryRunExecutionSummary;
  latestDryRunPlan: Record<string, unknown> | null;
  evidenceItems: Array<Record<string, unknown>>;
  signoffs: Array<Record<string, unknown>>;
  unresolvedBlockers: Array<Record<string, unknown>>;
  evidenceBinder: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousExecutionLogs: Array<Record<string, unknown>>;
  operationalPolicy: {
    dryRunExecutionEvidenceOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  executionRecord?: Record<string, unknown> | null;
};

export type MlProductionDryRunExecutionCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionDryRunExecutionContract;
  currentExecution: InventoryStockoutProductionDryRunExecutionSummary;
  lastExecutionLogs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionDryRunCloseoutMemoStatus = "memo_ready" | "needs_execution_log" | "needs_decision" | "needs_final_signoff" | "blocked" | "not_started";

export type ProductionDryRunCloseoutMemoRecommendation =
  | "present_decision_memo"
  | "complete_dry_run_execution"
  | "record_final_decision"
  | "collect_final_signoff"
  | "resolve_blockers";

export type InventoryStockoutProductionDryRunCloseoutMemoContract = {
  contractKey: "inventory_stockout_production_dry_run_closeout_decision_memo_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedExecutionKey: "inventory_stockout_production_dry_run_execution_evidence_binder_v1";
  memoScope: "dry_run_closeout_decision_memo_only";
  allowedRecommendations: string[];
  memoRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionDryRunCloseoutMemoGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionDryRunCloseoutMemoSummary = {
  closeoutMemoKey: "inventory_stockout_production_dry_run_closeout_decision_memo_v1";
  generatedAt: string;
  importId: number | null;
  executionLogId: number | null;
  dryRunPlanId: number | null;
  workOrderId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  executionStatus: string | null;
  evidenceBinderStatus: string | null;
  signoffStatus: string | null;
  closeoutStatus: ProductionDryRunCloseoutMemoStatus;
  finalRecommendation: "continue_future_implementation_planning" | "pause_for_more_evidence" | "rollback_path" | "stop_candidate" | "blocked";
  recommendation: ProductionDryRunCloseoutMemoRecommendation;
  readinessScorePct: number;
  evidenceItemCount: number;
  acceptedEvidenceCount: number;
  signoffCount: number;
  unresolvedBlockerCount: number;
  riskCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  memoOwner: string | null;
  decisionOwner: string | null;
  reviewBoardChair: string | null;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  closeoutGates: InventoryStockoutProductionDryRunCloseoutMemoGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionDryRunCloseoutMemoResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionDryRunCloseoutMemoContract;
  summary: InventoryStockoutProductionDryRunCloseoutMemoSummary;
  latestExecutionLog: Record<string, unknown> | null;
  closeoutMemo: Record<string, unknown>;
  evidenceSummary: Record<string, unknown>;
  signoffSummary: Record<string, unknown>;
  riskSummary: Array<Record<string, unknown>>;
  decisionSummary: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousCloseoutMemos: Array<Record<string, unknown>>;
  operationalPolicy: {
    dryRunCloseoutMemoOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  closeoutMemoRecord?: Record<string, unknown> | null;
};

export type MlProductionDryRunCloseoutMemoCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionDryRunCloseoutMemoContract;
  currentCloseoutMemo: InventoryStockoutProductionDryRunCloseoutMemoSummary;
  lastCloseoutMemos: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ProductionGovernanceSignoffStatus = "governance_ready" | "needs_closeout_memo" | "needs_signoff" | "needs_entry_decision" | "blocked" | "not_started";

export type ProductionGovernanceImplementationEntryDecision =
  | "enter_phase3a_safe_skeleton"
  | "pause_before_phase3"
  | "collect_more_evidence"
  | "stop_ml_candidate"
  | "blocked";

export type ProductionGovernanceRecommendation =
  | "close_phase2_and_prepare_phase3a"
  | "complete_closeout_memo"
  | "collect_governance_signoff"
  | "record_implementation_entry_decision"
  | "resolve_governance_blockers";

export type InventoryStockoutProductionGovernanceSignoffContract = {
  contractKey: "inventory_stockout_final_governance_signoff_implementation_entry_decision_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedCloseoutMemoKey: "inventory_stockout_production_dry_run_closeout_decision_memo_v1";
  governanceScope: "phase2_final_governance_signoff_and_phase3_entry_decision_only";
  allowedImplementationEntryDecisions: string[];
  governanceRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutProductionGovernanceSignoffGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutProductionGovernanceSignoffSummary = {
  governanceKey: "inventory_stockout_final_governance_signoff_implementation_entry_decision_v1";
  generatedAt: string;
  importId: number | null;
  closeoutMemoId: number | null;
  executionLogId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  closeoutStatus: string | null;
  finalRecommendation: string | null;
  governanceStatus: ProductionGovernanceSignoffStatus;
  implementationEntryDecision: ProductionGovernanceImplementationEntryDecision;
  recommendation: ProductionGovernanceRecommendation;
  phase2Closed: boolean;
  readinessScorePct: number;
  governanceSignoffStatus: "complete" | "partial" | "missing";
  boardQuorumStatus: "complete" | "partial" | "missing";
  implementationEntryStatus: "recorded" | "missing" | "blocked";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  executiveSponsor: string | null;
  governanceOwner: string | null;
  decisionOwner: string | null;
  phase3Owner: string | null;
  rollbackOwner: string | null;
  riskOwner: string | null;
  productionIntegrationAllowed: false;
  inferenceRuntimeEnabled: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  governanceGates: InventoryStockoutProductionGovernanceSignoffGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutProductionGovernanceSignoffResponse = {
  generatedAt: string;
  contract: InventoryStockoutProductionGovernanceSignoffContract;
  summary: InventoryStockoutProductionGovernanceSignoffSummary;
  latestCloseoutMemo: Record<string, unknown> | null;
  governanceSummary: Record<string, unknown>;
  signoffMatrix: Array<Record<string, unknown>>;
  implementationEntryDecision: Record<string, unknown>;
  phase2CloseoutArchive: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousGovernanceDecisions: Array<Record<string, unknown>>;
  operationalPolicy: {
    finalGovernanceSignoffOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  governanceRecord?: Record<string, unknown> | null;
};

export type MlProductionGovernanceSignoffCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutProductionGovernanceSignoffContract;
  currentGovernanceSignoff: InventoryStockoutProductionGovernanceSignoffSummary;
  lastGovernanceDecisions: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
