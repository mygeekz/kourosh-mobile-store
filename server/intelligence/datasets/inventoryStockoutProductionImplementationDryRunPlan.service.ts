import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionImplementationDryRunPlans,
  listMlProductionImplementationDryRunPlansByImportId,
  listMlProductionImplementationWorkOrders,
  listMlProductionImplementationWorkOrdersByImportId,
  recordMlProductionImplementationDryRunPlan,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionImplementationDryRunPlanContract,
  InventoryStockoutProductionImplementationDryRunPlanGate,
  InventoryStockoutProductionImplementationDryRunPlanResponse,
  InventoryStockoutProductionImplementationDryRunPlanSummary,
  MlProductionImplementationDryRunPlanCatalogSummary,
  ProductionImplementationDryRunPlanRecommendation,
  ProductionImplementationDryRunPlanStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_implementation_dry_run_planner_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_WORK_ORDER_KEY = "inventory_stockout_production_implementation_work_order_pack_v1" as const;
const DRY_RUN_SCOPE = "future_implementation_dry_run_planning_only" as const;
const MIN_WORK_ORDER_READINESS_SCORE = 90;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
};

const buildContract = (): InventoryStockoutProductionImplementationDryRunPlanContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Convert the Phase 2S work order pack into an offline dry-run planner with dependency sequencing, milestone planning, blocker analysis, and readiness evidence without enabling production inference.",
  acceptedWorkOrderKey: ACCEPTED_WORK_ORDER_KEY,
  dryRunScope: DRY_RUN_SCOPE,
  requiredInputs: [
    "Phase 2S production implementation work order pack",
    "work_order_ready status and ready_for_future_phase_scoping release handoff",
    "named engineering, QA, security, monitoring, rollback, change, and release owners",
    "future runtime boundary, human review, QA, monitoring, rollback, and security workstreams",
  ],
  dryRunRules: [
    "dry_run_ready requires a work_order_ready Phase 2S record.",
    "dependency sequencing must keep runtime work disabled-by-default and future-phase only.",
    "milestones must be review checkpoints, not deployment instructions.",
    "dry-run output cannot authorize production integration, inventory changes, accounting changes, or automated decisions.",
  ],
  forbiddenBehavior: [
    "Do not create, expose, or enable any production inference endpoint.",
    "Do not load model artifacts, call external model services, start training jobs, or add runtime model registry components.",
    "Do not automate purchasing, inventory, pricing, accounting, reports, invoices, ledgers, or customer communications.",
    "Do not treat dry_run_ready as go-live authorization.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutProductionImplementationDryRunPlanGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionImplementationDryRunPlanGate => ({ key, label, status, value, message });

const pickLatestImportId = async (): Promise<number | null> => {
  const dryRuns = await listMlProductionImplementationDryRunPlans(25) as Array<Record<string, unknown>>;
  const fromDryRun = dryRuns.find((row) => asNumber(row.importId));
  if (fromDryRun) return asNumber(fromDryRun.importId);
  const workOrders = await listMlProductionImplementationWorkOrders(25) as Array<Record<string, unknown>>;
  const fromWorkOrder = workOrders.find((row) => asNumber(row.importId));
  if (fromWorkOrder) return asNumber(fromWorkOrder.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

type DryRunOwners = {
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
};

const ownerSnapshot = (payload: Record<string, unknown>, workOrder: Record<string, unknown> | null): DryRunOwners => ({
  productOwner: firstText(payload.productOwner, workOrder?.productOwner),
  engineeringOwner: firstText(payload.engineeringOwner, workOrder?.engineeringOwner),
  qaOwner: firstText(payload.qaOwner, workOrder?.qaOwner),
  securityOwner: firstText(payload.securityOwner, workOrder?.securityOwner),
  monitoringOwner: firstText(payload.monitoringOwner, workOrder?.monitoringOwner),
  rollbackOwner: firstText(payload.rollbackOwner, workOrder?.rollbackOwner),
  changeManager: firstText(payload.changeManager, workOrder?.changeManager),
  releaseManager: firstText(payload.releaseManager, workOrder?.releaseManager),
});

const buildDependencySequence = (owners: DryRunOwners) => [
  {
    order: 1,
    key: "scope_freeze_and_work_order_review",
    owner: owners.releaseManager,
    dependsOn: [],
    dryRunAction: "Review the Phase 2S work order pack and freeze dry-run scope for future implementation planning.",
    completionEvidence: "signed dry-run scope note",
    runtimeImpact: "none",
  },
  {
    order: 2,
    key: "future_runtime_boundary_walkthrough",
    owner: owners.engineeringOwner,
    dependsOn: ["scope_freeze_and_work_order_review"],
    dryRunAction: "Walk through the disabled-by-default future inference boundary and baseline fallback design without implementing runtime calls.",
    completionEvidence: "boundary walkthrough notes",
    runtimeImpact: "none",
  },
  {
    order: 3,
    key: "qa_fixture_and_regression_mapping",
    owner: owners.qaOwner,
    dependsOn: ["future_runtime_boundary_walkthrough"],
    dryRunAction: "Map future QA fixtures for model validation, inventory/report regression, fallback, rollback, and blocked states.",
    completionEvidence: "QA fixture map and regression checklist",
    runtimeImpact: "none",
  },
  {
    order: 4,
    key: "security_access_audit_mapping",
    owner: owners.securityOwner,
    dependsOn: ["future_runtime_boundary_walkthrough"],
    dryRunAction: "Map RBAC, sensitive field handling, and audit logging requirements for future model review surfaces.",
    completionEvidence: "security/access review notes",
    runtimeImpact: "none",
  },
  {
    order: 5,
    key: "monitoring_and_rollback_tabletop",
    owner: owners.monitoringOwner,
    dependsOn: ["qa_fixture_and_regression_mapping", "security_access_audit_mapping"],
    dryRunAction: "Run a tabletop plan for monitoring thresholds, rollback triggers, incident owners, and baseline fallback.",
    completionEvidence: "monitoring and rollback tabletop notes",
    runtimeImpact: "none",
  },
  {
    order: 6,
    key: "human_review_board_dry_run",
    owner: owners.productOwner,
    dependsOn: ["monitoring_and_rollback_tabletop"],
    dryRunAction: "Dry-run the human review flow and manual override evidence requirements before any future pilot implementation.",
    completionEvidence: "human review board dry-run minutes",
    runtimeImpact: "none",
  },
];

const buildMilestonePlan = (owners: DryRunOwners) => [
  {
    key: "milestone_1_scope_and_owners",
    label: "Scope and owner readiness review",
    owner: owners.releaseManager,
    exitCriteria: ["work order status is work_order_ready", "all dry-run owners are named", "no production runtime is enabled"],
  },
  {
    key: "milestone_2_dependency_tabletop",
    label: "Dependency sequencing tabletop",
    owner: owners.engineeringOwner,
    exitCriteria: ["dependency order is reviewed", "runtime boundary remains disabled", "baseline fallback remains mandatory"],
  },
  {
    key: "milestone_3_quality_security_review",
    label: "QA and security dry-run review",
    owner: owners.qaOwner,
    exitCriteria: ["QA fixture map is drafted", "security/RBAC checklist is drafted", "no sensitive data exposure is introduced"],
  },
  {
    key: "milestone_4_monitoring_rollback_review",
    label: "Monitoring and rollback dry-run review",
    owner: owners.monitoringOwner,
    exitCriteria: ["rollback triggers are reviewed", "rollback owner confirms fallback path", "decision automation remains disabled"],
  },
  {
    key: "milestone_5_dry_run_closeout",
    label: "Dry-run closeout and next-phase scoping recommendation",
    owner: owners.changeManager,
    exitCriteria: ["blockers are resolved or documented", "next-phase scope is separately approved", "go-live remains out of scope"],
  },
];

const buildDryRunChecklist = (owners: DryRunOwners) => [
  {
    key: "scope_frozen",
    status: owners.releaseManager ? "ready_for_dry_run" : "blocked",
    owner: owners.releaseManager,
    message: "Release manager must freeze dry-run scope before sequencing future implementation tasks.",
  },
  {
    key: "runtime_disabled_by_default",
    status: "ready_for_dry_run",
    owner: owners.engineeringOwner,
    message: "No production inference runtime is enabled by this dry-run planner.",
  },
  {
    key: "qa_regression_map_required",
    status: owners.qaOwner ? "ready_for_dry_run" : "blocked",
    owner: owners.qaOwner,
    message: "QA owner must map future regression gates for inventory, ledger, reports, and fallback paths.",
  },
  {
    key: "rollback_path_reviewed",
    status: owners.rollbackOwner ? "ready_for_dry_run" : "blocked",
    owner: owners.rollbackOwner,
    message: "Rollback owner must review the baseline fallback and manual rollback path.",
  },
  {
    key: "monitoring_thresholds_drafted",
    status: owners.monitoringOwner ? "ready_for_dry_run" : "blocked",
    owner: owners.monitoringOwner,
    message: "Monitoring owner must draft future candidate-vs-baseline monitoring thresholds.",
  },
];

const buildDryRunPlan = (owners: DryRunOwners, workOrder: Record<string, unknown> | null) => ({
  planKey: CONTRACT_KEY,
  scope: DRY_RUN_SCOPE,
  acceptedWorkOrderKey: ACCEPTED_WORK_ORDER_KEY,
  workOrderId: asNumber(workOrder?.id),
  objective: "Sequence future implementation tasks in a dry-run tabletop before any runtime, inference, or business-process integration is proposed.",
  ownerSnapshot: owners,
  boundaries: [
    "planning-only artifact",
    "no production inference endpoint",
    "no model execution",
    "no automated inventory, accounting, pricing, invoice, ledger, report, or customer communication changes",
  ],
  expectedArtifacts: [
    "dependency sequence",
    "milestone plan",
    "readiness blockers",
    "dry-run checklist",
    "audit export",
  ],
});

const uniqueMessages = (gates: InventoryStockoutProductionImplementationDryRunPlanGate[], status: "block" | "warning") =>
  [...new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message))];

export const buildInventoryStockoutProductionImplementationDryRunPlanContract = buildContract;

export const buildInventoryStockoutProductionImplementationDryRunPlan = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionImplementationDryRunPlanResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const workOrders = importId ? await listMlProductionImplementationWorkOrdersByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestWorkOrder = workOrders[0] || null;
  const previousDryRuns = importId ? await listMlProductionImplementationDryRunPlansByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const owners = ownerSnapshot(options, latestWorkOrder);
  const dependencySequence = buildDependencySequence(owners);
  const milestonePlan = buildMilestonePlan(owners);
  const dryRunChecklist = buildDryRunChecklist(owners);
  const dryRunPlan = buildDryRunPlan(owners, latestWorkOrder);

  const readinessScore = Math.max(0, Math.min(100, asNumber(latestWorkOrder?.readinessScorePct) ?? 0));
  const workOrderReady = latestWorkOrder?.workOrderStatus === "work_order_ready";
  const releaseHandoffReady = latestWorkOrder?.releaseHandoffStatus === "ready_for_future_phase_scoping";
  const ownerValues = Object.values(owners);
  const ownerMatrixComplete = ownerValues.every(Boolean);
  const dependenciesReady = dependencySequence.length >= 5 && dependencySequence.every((item) => item.owner);
  const milestonesReady = milestonePlan.length >= 4 && milestonePlan.every((item) => item.owner);

  const gates: InventoryStockoutProductionImplementationDryRunPlanGate[] = [
    buildGate("model_import_available", "Model import audit record", modelImport ? "pass" : "block", Boolean(modelImport), modelImport ? "Model import audit record is available." : "A model import audit record is required before dry-run planning."),
    buildGate("work_order_available", "Work order pack", latestWorkOrder ? "pass" : "block", asNumber(latestWorkOrder?.id), latestWorkOrder ? "Phase 2S work order pack is available." : "Phase 2S work order pack must be created first."),
    buildGate("work_order_ready", "Work order status", workOrderReady ? "pass" : "block", latestWorkOrder?.workOrderStatus || null, workOrderReady ? "Work order is ready for future-phase planning." : "Work order must be work_order_ready before dry-run sequencing."),
    buildGate("release_handoff_ready", "Release handoff", releaseHandoffReady ? "pass" : "block", latestWorkOrder?.releaseHandoffStatus || null, releaseHandoffReady ? "Release handoff is ready for future phase scoping." : "Release handoff must be ready_for_future_phase_scoping."),
    buildGate("readiness_score", "Work order readiness score", readinessScore >= MIN_WORK_ORDER_READINESS_SCORE ? "pass" : "warning", readinessScore, readinessScore >= MIN_WORK_ORDER_READINESS_SCORE ? "Readiness score supports dry-run planning." : "Readiness score is below recommended dry-run threshold."),
    buildGate("owner_matrix_complete", "Dry-run owner matrix", ownerMatrixComplete ? "pass" : "block", owners, ownerMatrixComplete ? "All dry-run owners are assigned." : "Product, engineering, QA, security, monitoring, rollback, change, and release owners are required."),
    buildGate("dependency_sequence_ready", "Dependency sequence", dependenciesReady ? "pass" : "block", dependencySequence.length, dependenciesReady ? "Dependency sequence is ready for dry-run review." : "Dependency sequence needs owner assignment before dry-run."),
    buildGate("milestone_plan_ready", "Milestone plan", milestonesReady ? "pass" : "block", milestonePlan.length, milestonesReady ? "Milestone plan is ready for dry-run review." : "Milestone plan needs owner assignment before dry-run."),
    buildGate("runtime_policy", "Runtime policy", "pass", false, "Production inference, decision automation, and inventory/accounting changes remain disabled."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const blockerCount = blockers.length;
  const warningCount = warnings.length;
  const totalGateCount = gates.length;
  const computedReadiness = Math.round((passCount / Math.max(totalGateCount, 1)) * 100);

  let dryRunStatus: ProductionImplementationDryRunPlanStatus = "dry_run_ready";
  let recommendation: ProductionImplementationDryRunPlanRecommendation = "schedule_dry_run_review";
  if (!latestWorkOrder || !workOrderReady) {
    dryRunStatus = "needs_work_order";
    recommendation = "complete_work_order_pack";
  } else if (!dependenciesReady) {
    dryRunStatus = "needs_dependency_sequence";
    recommendation = "complete_dependency_sequence";
  } else if (!milestonesReady) {
    dryRunStatus = "needs_milestone_plan";
    recommendation = "complete_milestone_plan";
  } else if (blockerCount > 0) {
    dryRunStatus = "blocked";
    recommendation = "blocked";
  }

  const dependencySequenceStatus = dependenciesReady ? "ready" : latestWorkOrder ? "needs_review" : "blocked";
  const milestonePlanStatus = milestonesReady ? "ready" : latestWorkOrder ? "needs_review" : "blocked";
  const dryRunTaskCount = dependencySequence.length + dryRunChecklist.length;

  const readinessBlockers = gates
    .filter((gate) => gate.status !== "pass")
    .map((gate) => ({ key: gate.key, severity: gate.status, message: gate.message, value: gate.value }));

  const summary: InventoryStockoutProductionImplementationDryRunPlanSummary = {
    dryRunKey: CONTRACT_KEY,
    generatedAt,
    importId,
    workOrderId: asNumber(latestWorkOrder?.id),
    charterId: asNumber(latestWorkOrder?.charterId),
    modelKey: normalizeText(modelImport?.modelKey, normalizeText(latestWorkOrder?.modelKey)),
    modelVersion: normalizeText(modelImport?.modelVersion, normalizeText(latestWorkOrder?.modelVersion)),
    workOrderStatus: normalizeText(latestWorkOrder?.workOrderStatus),
    releaseHandoffStatus: normalizeText(latestWorkOrder?.releaseHandoffStatus),
    dryRunStatus,
    recommendation,
    readinessScorePct: computedReadiness,
    dependencySequenceStatus,
    milestonePlanStatus,
    dependencyCount: dependencySequence.length,
    milestoneCount: milestonePlan.length,
    dryRunTaskCount,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    ...owners,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    dryRunGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "schedule_dry_run_review"
      ? "Schedule a dry-run tabletop review for dependency sequencing, milestone checks, QA/security evidence, rollback, and human review readiness."
      : blockers[0] || warnings[0] || "Complete prerequisite dry-run planning gates before scheduling review.",
  };

  const auditExport = {
    generatedAt,
    contractKey: CONTRACT_KEY,
    importId,
    workOrderId: summary.workOrderId,
    dryRunStatus,
    recommendation,
    readinessScorePct: computedReadiness,
    blockers,
    warnings,
    policy: buildContract().operationalPolicy,
    dryRunOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestWorkOrder,
    dryRunPlan,
    dependencySequence,
    milestonePlan,
    readinessBlockers,
    dryRunChecklist,
    auditExport,
    previousDryRuns,
    operationalPolicy: {
      implementationDryRunPlanningOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 2T is a dry-run planner only. It cannot enable production inference or alter operational, inventory, accounting, invoice, ledger, report, pricing, or customer-communication behavior.",
    },
  };
};

export const recordInventoryStockoutProductionImplementationDryRunPlan = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionImplementationDryRunPlanResponse> => {
  const data = await buildInventoryStockoutProductionImplementationDryRunPlan(payload.importId, payload);
  const record = await recordMlProductionImplementationDryRunPlan({
    dryRunKey: CONTRACT_KEY,
    importId: data.summary.importId,
    workOrderId: data.summary.workOrderId,
    charterId: data.summary.charterId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    workOrderStatus: data.summary.workOrderStatus,
    releaseHandoffStatus: data.summary.releaseHandoffStatus,
    dryRunStatus: data.summary.dryRunStatus,
    recommendation: data.summary.recommendation,
    readinessScorePct: data.summary.readinessScorePct,
    dependencySequenceStatus: data.summary.dependencySequenceStatus,
    milestonePlanStatus: data.summary.milestonePlanStatus,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    dependencyCount: data.summary.dependencyCount,
    milestoneCount: data.summary.milestoneCount,
    dryRunTaskCount: data.summary.dryRunTaskCount,
    productOwner: data.summary.productOwner,
    engineeringOwner: data.summary.engineeringOwner,
    qaOwner: data.summary.qaOwner,
    securityOwner: data.summary.securityOwner,
    monitoringOwner: data.summary.monitoringOwner,
    rollbackOwner: data.summary.rollbackOwner,
    changeManager: data.summary.changeManager,
    releaseManager: data.summary.releaseManager,
    dryRunPlan: data.dryRunPlan,
    dependencySequence: data.dependencySequence,
    milestonePlan: data.milestonePlan,
    readinessBlockers: data.readinessBlockers,
    dryRunChecklist: data.dryRunChecklist,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, dryRunRecord: record };
};

export const listInventoryStockoutProductionImplementationDryRunPlans = async (importIdInput: unknown) => {
  return listMlProductionImplementationDryRunPlansByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlProductionImplementationDryRunPlanCatalogSummary = async (): Promise<MlProductionImplementationDryRunPlanCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutProductionImplementationDryRunPlan(importId);
  const lastDryRunPlans = await listMlProductionImplementationDryRunPlans(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentDryRunPlan: current.summary,
    lastDryRunPlans,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
