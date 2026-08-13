import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionImplementationCharters,
  listMlProductionImplementationChartersByImportId,
  listMlProductionImplementationWorkOrders,
  listMlProductionImplementationWorkOrdersByImportId,
  recordMlProductionImplementationWorkOrder,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionImplementationWorkOrderContract,
  InventoryStockoutProductionImplementationWorkOrderGate,
  InventoryStockoutProductionImplementationWorkOrderResponse,
  InventoryStockoutProductionImplementationWorkOrderSummary,
  MlProductionImplementationWorkOrderCatalogSummary,
  ProductionImplementationWorkOrderRecommendation,
  ProductionImplementationWorkOrderStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_implementation_work_order_pack_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_CHARTER_KEY = "inventory_stockout_production_implementation_readiness_charter_v1" as const;
const WORK_ORDER_SCOPE = "future_implementation_work_order_pack_only" as const;
const MIN_CHARTER_READINESS_SCORE = 90;

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

const buildContract = (): InventoryStockoutProductionImplementationWorkOrderContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Convert the Phase 2R implementation readiness charter into a future implementation work order pack with epics, tasks, acceptance criteria, QA plan, rollout checklist, and ownership boundaries without enabling production inference.",
  acceptedCharterKey: ACCEPTED_CHARTER_KEY,
  workOrderScope: WORK_ORDER_SCOPE,
  requiredInputs: [
    "Phase 2R implementation readiness charter",
    "charter_ready status and ready_for_future_planning go/no-go status",
    "named product, engineering, QA, security, monitoring, rollback, and change management owners",
    "manual approval, fallback, QA, monitoring, security, and rollback workstreams",
  ],
  workOrderRules: [
    "work_order_ready requires a charter_ready Phase 2R record.",
    "the work order pack must remain a planning artifact and cannot authorize production runtime work by itself.",
    "each epic must include acceptance criteria and QA evidence requirements.",
    "rollout steps must be framed as future phase checklist items, not as active deployment instructions.",
  ],
  forbiddenBehavior: [
    "Do not create, expose, or enable any production inference endpoint.",
    "Do not load model artifacts, call external model services, add runtime model registry components, or train models inside Kourosh.",
    "Do not automate purchasing, inventory, pricing, accounting, reports, invoices, ledgers, or customer communications.",
    "Do not treat work_order_ready as go-live authorization.",
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
  status: InventoryStockoutProductionImplementationWorkOrderGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionImplementationWorkOrderGate => ({ key, label, status, value, message });

const pickLatestImportId = async (): Promise<number | null> => {
  const workOrders = await listMlProductionImplementationWorkOrders(25) as Array<Record<string, unknown>>;
  const fromWorkOrder = workOrders.find((row) => asNumber(row.importId));
  if (fromWorkOrder) return asNumber(fromWorkOrder.importId);
  const charters = await listMlProductionImplementationCharters(25) as Array<Record<string, unknown>>;
  const fromCharter = charters.find((row) => asNumber(row.importId));
  if (fromCharter) return asNumber(fromCharter.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

type WorkOrderOwners = {
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
};

const ownerSnapshot = (payload: Record<string, unknown>, charter: Record<string, unknown> | null): WorkOrderOwners => ({
  productOwner: firstText(payload.productOwner, charter?.productOwner),
  engineeringOwner: firstText(payload.engineeringOwner, charter?.engineeringOwner),
  qaOwner: firstText(payload.qaOwner, charter?.qaOwner),
  securityOwner: firstText(payload.securityOwner, charter?.securityOwner),
  monitoringOwner: firstText(payload.monitoringOwner, charter?.monitoringOwner),
  rollbackOwner: firstText(payload.rollbackOwner, charter?.rollbackOwner),
  changeManager: firstText(payload.changeManager, charter?.changeManager),
  releaseManager: firstText(payload.releaseManager, payload.signoffOwner, charter?.signoffOwner),
});

const buildEpicBreakdown = (owners: WorkOrderOwners) => [
  {
    key: "runtime_boundary_design_future_phase",
    title: "Future runtime boundary design",
    owner: owners.engineeringOwner,
    tasks: [
      "Draft the future inventory-stockout inference boundary as a separate implementation proposal.",
      "Document request/response contracts, rate limits, timeout behavior, and no-decision-automation constraints.",
      "Define how baseline fallback remains available if a future model candidate is unavailable.",
    ],
    acceptanceCriteria: [
      "No inference endpoint is added in this phase.",
      "All future runtime calls remain behind a disabled-by-default gate.",
      "Baseline fallback path is documented before any implementation starts.",
    ],
  },
  {
    key: "human_review_and_manual_override",
    title: "Human review and manual override workflow",
    owner: owners.productOwner,
    tasks: [
      "Specify how inventory recommendations would be reviewed by a human before any operational action.",
      "Define manual override reasons, audit fields, and escalation owners.",
      "Confirm that model output never changes inventory/accounting truth automatically.",
    ],
    acceptanceCriteria: [
      "Every future model recommendation requires human review before action.",
      "Manual override is available and audit-logged.",
      "Accounting, inventory, invoice, ledger, and report calculations remain unchanged.",
    ],
  },
  {
    key: "qa_and_regression_gate",
    title: "QA and regression gate",
    owner: owners.qaOwner,
    tasks: [
      "Prepare future regression coverage for predictive engine, reports, inventory, ledger, and financial calculations.",
      "Define test fixtures for model-output validation, rollback, fallback, and blocked states.",
      "Create manual QA checklist for the future pilot implementation phase.",
    ],
    acceptanceCriteria: [
      "Report, ledger, invoice, and inventory calculation regression tests must pass before any future pilot implementation can be proposed.",
      "Model-output validation failure paths must be covered.",
      "Rollback and fallback paths must have QA evidence.",
    ],
  },
  {
    key: "security_privacy_access_control",
    title: "Security, privacy, and access control review",
    owner: owners.securityOwner,
    tasks: [
      "Define role-based access requirements for future model views, import records, and review actions.",
      "Document audit retention and sensitive field handling for model outputs.",
      "Confirm no external model service is called in the current phase.",
    ],
    acceptanceCriteria: [
      "Admin/Manager access remains required for MLOps review actions.",
      "No sensitive customer or financial details are exposed to low-permission users.",
      "External service calls are not introduced in this phase.",
    ],
  },
  {
    key: "monitoring_and_rollback_runbook",
    title: "Monitoring and rollback runbook",
    owner: owners.monitoringOwner,
    tasks: [
      "Define candidate-vs-baseline monitoring metrics and alert thresholds for a future implementation phase.",
      "Document rollback triggers, rollback owner responsibilities, and incident communication steps.",
      "Keep future rollout checklist blocked until rollback owner signoff is present.",
    ],
    acceptanceCriteria: [
      "Rollback triggers are explicit and measurable.",
      "Rollback owner is named.",
      "Fallback to Rule/Statistical Baseline is required before any future runtime work.",
    ],
  },
];

const flattenTasks = (epics: Array<Record<string, unknown>>) => epics.flatMap((epic) => {
  const tasks = Array.isArray(epic.tasks) ? epic.tasks : [];
  return tasks.map((task, index) => ({
    key: `${epic.key || "epic"}_task_${index + 1}`,
    epicKey: epic.key,
    title: task,
    owner: epic.owner || null,
    status: epic.owner ? "ready_for_future_scoping" : "needs_owner",
    implementationPhase: "future_phase_only",
  }));
});

const flattenAcceptanceCriteria = (epics: Array<Record<string, unknown>>) => epics.flatMap((epic) => {
  const criteria = Array.isArray(epic.acceptanceCriteria) ? epic.acceptanceCriteria : [];
  return criteria.map((item, index) => ({
    key: `${epic.key || "epic"}_ac_${index + 1}`,
    epicKey: epic.key,
    criterion: item,
    requiredBeforeRuntime: true,
  }));
});

const buildQaPlan = (owners: WorkOrderOwners) => ({
  owner: owners.qaOwner,
  scope: "future implementation QA planning only",
  requiredSuites: [
    "predictive engine compatibility",
    "model import validation regression",
    "shadow/stability/pilot audit regression",
    "inventory calculation regression",
    "ledger/accounting/report calculation regression",
    "manual override and rollback regression",
    "role-based access checks",
  ],
  evidenceRequired: [
    "test command logs",
    "manual QA checklist signoff",
    "rollback drill notes",
    "no-financial-truth-change confirmation",
  ],
});

const buildRolloutChecklist = (owners: WorkOrderOwners) => [
  {
    key: "implementation_scope_approved",
    status: owners.releaseManager ? "ready_for_future_review" : "blocked",
    owner: owners.releaseManager,
    message: "A future implementation phase must be separately scoped and approved.",
  },
  {
    key: "runtime_disabled_by_default",
    status: "blocked_until_future_phase",
    owner: owners.engineeringOwner,
    message: "No production inference runtime is enabled by this work order pack.",
  },
  {
    key: "human_review_required",
    status: owners.productOwner ? "ready_for_future_review" : "blocked",
    owner: owners.productOwner,
    message: "Future recommendations must remain human-reviewed before any action.",
  },
  {
    key: "qa_regression_required",
    status: owners.qaOwner ? "ready_for_future_review" : "blocked",
    owner: owners.qaOwner,
    message: "Future implementation cannot proceed without QA regression evidence.",
  },
  {
    key: "security_review_required",
    status: owners.securityOwner ? "ready_for_future_review" : "blocked",
    owner: owners.securityOwner,
    message: "Future implementation requires security and privacy review.",
  },
  {
    key: "rollback_runbook_required",
    status: owners.rollbackOwner ? "ready_for_future_review" : "blocked",
    owner: owners.rollbackOwner,
    message: "Future implementation requires rollback owner signoff and baseline fallback.",
  },
];

const buildGates = (args: {
  latestCharter: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  owners: WorkOrderOwners;
  epics: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  acceptanceCriteria: Array<Record<string, unknown>>;
  qaPlan: Record<string, unknown>;
  rolloutChecklist: Array<Record<string, unknown>>;
}): InventoryStockoutProductionImplementationWorkOrderGate[] => {
  const charterStatus = normalizeText(args.latestCharter?.charterStatus);
  const goNoGoStatus = normalizeText(args.latestCharter?.goNoGoStatus);
  const readinessScore = asNumber(args.latestCharter?.readinessScorePct) ?? 0;
  const missingOwners = Object.entries(args.owners).filter(([, value]) => !value).map(([key]) => key);
  const rolloutBlocked = args.rolloutChecklist.filter((item) => String(item.status || "").includes("blocked")).length;

  return [
    buildGate("charter_ready", "Phase 2R charter ready", charterStatus === "charter_ready" ? "pass" : "block", charterStatus, "A Phase 2R charter_ready record is required before creating an implementation work order pack."),
    buildGate("go_no_go_ready", "Go/no-go planning ready", goNoGoStatus === "ready_for_future_planning" ? "pass" : "block", goNoGoStatus, "The charter must only authorize future planning, not runtime activation."),
    buildGate("charter_readiness_score", "Charter readiness score", readinessScore >= MIN_CHARTER_READINESS_SCORE ? "pass" : "warning", readinessScore, `Charter readiness score should be at least ${MIN_CHARTER_READINESS_SCORE}.`),
    buildGate("model_import_traceable", "Model import audit traceable", args.modelImport ? "pass" : "block", args.modelImport ? args.modelImport.id : null, "Work orders must remain traceable to an imported external model result."),
    buildGate("owners_named", "Owners named", missingOwners.length ? "block" : "pass", missingOwners.length ? missingOwners : "complete", "All implementation work order owners must be explicitly named."),
    buildGate("epics_defined", "Epics defined", args.epics.length >= 5 ? "pass" : "block", args.epics.length, "The work order pack must include implementation epics."),
    buildGate("tasks_defined", "Tasks defined", args.tasks.length >= 10 ? "pass" : "warning", args.tasks.length, "The work order pack should include a meaningful task breakdown."),
    buildGate("acceptance_criteria_defined", "Acceptance criteria defined", args.acceptanceCriteria.length >= 10 ? "pass" : "warning", args.acceptanceCriteria.length, "Acceptance criteria must be attached to workstreams."),
    buildGate("qa_plan_defined", "QA plan defined", args.qaPlan ? "pass" : "block", Boolean(args.qaPlan), "The pack must include QA and regression planning."),
    buildGate("rollout_checklist_planning_only", "Rollout checklist planning only", rolloutBlocked >= 1 ? "pass" : "warning", rolloutBlocked, "Rollout checklist items must remain future-phase or blocked; this phase cannot enable production runtime."),
    buildGate("no_runtime_authorization", "No runtime authorization", "pass", false, "The work order pack explicitly forbids inference runtime activation."),
    buildGate("financial_truth_protected", "Financial truth protected", "pass", false, "The work order pack forbids inventory/accounting/report calculation changes."),
  ];
};

const statusFromGates = (gates: InventoryStockoutProductionImplementationWorkOrderGate[]): ProductionImplementationWorkOrderStatus => {
  const blockers = gates.filter((gate) => gate.status === "block");
  if (!gates.length) return "not_started";
  if (blockers.some((gate) => gate.key === "charter_ready" || gate.key === "go_no_go_ready" || gate.key === "model_import_traceable")) return "needs_charter";
  if (blockers.some((gate) => gate.key === "owners_named")) return "needs_owner_assignment";
  if (blockers.some((gate) => gate.key === "epics_defined" || gate.key === "qa_plan_defined")) return "needs_task_breakdown";
  return blockers.length ? "blocked" : "work_order_ready";
};

const recommendationFromStatus = (status: ProductionImplementationWorkOrderStatus): ProductionImplementationWorkOrderRecommendation => {
  if (status === "work_order_ready") return "prepare_future_implementation_workstream";
  if (status === "needs_charter") return "complete_implementation_charter";
  if (status === "needs_owner_assignment") return "complete_owner_assignment";
  if (status === "needs_task_breakdown") return "complete_work_order_breakdown";
  return "blocked";
};

const buildSummary = (args: {
  importId: number | null;
  latestCharter: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  owners: WorkOrderOwners;
  gates: InventoryStockoutProductionImplementationWorkOrderGate[];
  epics: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  acceptanceCriteria: Array<Record<string, unknown>>;
  qaPlan: Record<string, unknown>;
  rolloutChecklist: Array<Record<string, unknown>>;
}): InventoryStockoutProductionImplementationWorkOrderSummary => {
  const blockers = args.gates.filter((gate) => gate.status === "block").map((gate) => gate.message);
  const warnings = args.gates.filter((gate) => gate.status === "warning").map((gate) => gate.message);
  const passCount = args.gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = args.gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;
  const workOrderStatus = statusFromGates(args.gates);
  const recommendation = recommendationFromStatus(workOrderStatus);
  const rolloutBlockedCount = args.rolloutChecklist.filter((item) => String(item.status || "").includes("blocked")).length;

  return {
    workOrderKey: CONTRACT_KEY,
    generatedAt: new Date().toISOString(),
    importId: args.importId,
    charterId: asNumber(args.latestCharter?.id),
    modelKey: normalizeText(args.modelImport?.modelKey, normalizeText(args.latestCharter?.modelKey)),
    modelVersion: normalizeText(args.modelImport?.modelVersion, normalizeText(args.latestCharter?.modelVersion)),
    charterStatus: normalizeText(args.latestCharter?.charterStatus),
    charterGoNoGoStatus: normalizeText(args.latestCharter?.goNoGoStatus),
    workOrderStatus,
    recommendation,
    readinessScorePct,
    workOrderScopeStatus: workOrderStatus === "work_order_ready" ? "defined" : blockers.length ? "blocked" : "needs_review",
    ownerMatrixStatus: Object.values(args.owners).every(Boolean) ? "complete" : "incomplete",
    releaseHandoffStatus: workOrderStatus === "work_order_ready" ? "ready_for_future_phase_scoping" : "blocked",
    epicCount: args.epics.length,
    taskCount: args.tasks.length,
    acceptanceCriteriaCount: args.acceptanceCriteria.length,
    qaChecklistCount: Array.isArray(args.qaPlan.requiredSuites) ? args.qaPlan.requiredSuites.length : 0,
    rolloutChecklistCount: args.rolloutChecklist.length,
    rolloutBlockedCount,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    productOwner: args.owners.productOwner,
    engineeringOwner: args.owners.engineeringOwner,
    qaOwner: args.owners.qaOwner,
    securityOwner: args.owners.securityOwner,
    monitoringOwner: args.owners.monitoringOwner,
    rollbackOwner: args.owners.rollbackOwner,
    changeManager: args.owners.changeManager,
    releaseManager: args.owners.releaseManager,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    workOrderGates: args.gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "prepare_future_implementation_workstream"
      ? "Use this pack to scope a separate future implementation phase; do not enable runtime inference from this phase."
      : blockers[0] || warnings[0] || "Complete work order prerequisites before future implementation scoping.",
  };
};

const buildWorkOrderDocument = (summary: InventoryStockoutProductionImplementationWorkOrderSummary, epics: Array<Record<string, unknown>>, qaPlan: Record<string, unknown>, rolloutChecklist: Array<Record<string, unknown>>) => ({
  title: "Inventory Stockout Candidate — Production Implementation Work Order Pack",
  version: CONTRACT_VERSION,
  generatedAt: summary.generatedAt,
  status: summary.workOrderStatus,
  recommendation: summary.recommendation,
  scopeBoundary: {
    scope: WORK_ORDER_SCOPE,
    allowed: ["future implementation scoping", "task assignment", "QA planning", "rollback planning", "owner review"],
    forbidden: ["production inference", "decision automation", "inventory/accounting/report calculation changes", "customer communication automation"],
  },
  epics,
  qaPlan,
  rolloutChecklist,
  nextAction: summary.recommendedNextAction,
});

export const buildInventoryStockoutProductionImplementationWorkOrderContract = buildContract;

export const buildInventoryStockoutProductionImplementationWorkOrder = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionImplementationWorkOrderResponse> => {
  const explicitImportId = asNumber(importIdInput);
  const importId = explicitImportId || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const charters = importId
    ? await listMlProductionImplementationChartersByImportId(importId, 25) as Array<Record<string, unknown>>
    : await listMlProductionImplementationCharters(25) as Array<Record<string, unknown>>;
  const latestCharter = charters[0] || null;
  const previousWorkOrders = importId
    ? await listMlProductionImplementationWorkOrdersByImportId(importId, 25) as Array<Record<string, unknown>>
    : [];

  const owners = ownerSnapshot(options, latestCharter);
  const epics = buildEpicBreakdown(owners);
  const tasks = flattenTasks(epics);
  const acceptanceCriteria = flattenAcceptanceCriteria(epics);
  const qaPlan = buildQaPlan(owners);
  const rolloutChecklist = buildRolloutChecklist(owners);
  const gates = buildGates({ latestCharter, modelImport, owners, epics, tasks, acceptanceCriteria, qaPlan, rolloutChecklist });
  const summary = buildSummary({ importId, latestCharter, modelImport, owners, gates, epics, tasks, acceptanceCriteria, qaPlan, rolloutChecklist });
  const workOrderDocument = buildWorkOrderDocument(summary, epics, qaPlan, rolloutChecklist);
  const auditExport = {
    generatedAt: summary.generatedAt,
    importId,
    charterId: summary.charterId,
    workOrderStatus: summary.workOrderStatus,
    recommendation: summary.recommendation,
    readinessScorePct: summary.readinessScorePct,
    policy: buildContract().operationalPolicy,
  };

  return {
    generatedAt: summary.generatedAt,
    contract: buildContract(),
    summary,
    latestCharter,
    workOrderDocument,
    epicBreakdown: epics,
    taskBreakdown: tasks,
    acceptanceCriteria,
    qaPlan,
    rolloutChecklist,
    auditExport,
    previousWorkOrders,
    operationalPolicy: {
      implementationWorkOrderOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 2S creates a work order pack for future implementation scoping only; it does not authorize production inference.",
    },
  };
};

export const recordInventoryStockoutProductionImplementationWorkOrder = async (payload: Record<string, unknown> = {}) => {
  const response = await buildInventoryStockoutProductionImplementationWorkOrder(payload.importId, payload);
  const { summary } = response;
  const record = await recordMlProductionImplementationWorkOrder({
    workOrderKey: summary.workOrderKey,
    importId: summary.importId,
    charterId: summary.charterId,
    modelKey: summary.modelKey,
    modelVersion: summary.modelVersion,
    charterStatus: summary.charterStatus,
    charterGoNoGoStatus: summary.charterGoNoGoStatus,
    workOrderStatus: summary.workOrderStatus,
    recommendation: summary.recommendation,
    readinessScorePct: summary.readinessScorePct,
    workOrderScopeStatus: summary.workOrderScopeStatus,
    ownerMatrixStatus: summary.ownerMatrixStatus,
    releaseHandoffStatus: summary.releaseHandoffStatus,
    epicCount: summary.epicCount,
    taskCount: summary.taskCount,
    acceptanceCriteriaCount: summary.acceptanceCriteriaCount,
    qaChecklistCount: summary.qaChecklistCount,
    rolloutChecklistCount: summary.rolloutChecklistCount,
    blockerCount: summary.blockerCount,
    warningCount: summary.warningCount,
    passCount: summary.passCount,
    totalGateCount: summary.totalGateCount,
    productOwner: summary.productOwner,
    engineeringOwner: summary.engineeringOwner,
    qaOwner: summary.qaOwner,
    securityOwner: summary.securityOwner,
    monitoringOwner: summary.monitoringOwner,
    rollbackOwner: summary.rollbackOwner,
    changeManager: summary.changeManager,
    releaseManager: summary.releaseManager,
    workOrder: response.workOrderDocument,
    epicBreakdown: response.epicBreakdown,
    taskBreakdown: response.taskBreakdown,
    acceptanceCriteria: response.acceptanceCriteria,
    qaPlan: response.qaPlan,
    rolloutChecklist: response.rolloutChecklist,
    auditExport: response.auditExport,
    summary,
    policy: response.contract.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, workOrderRecord: record };
};

export const listInventoryStockoutProductionImplementationWorkOrders = async (importIdInput: unknown) => {
  return listMlProductionImplementationWorkOrdersByImportId(importIdInput, 50);
};

export const buildMlProductionImplementationWorkOrderCatalogSummary = async (): Promise<MlProductionImplementationWorkOrderCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutProductionImplementationWorkOrder(importId);
  const lastWorkOrders = await listMlProductionImplementationWorkOrders(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentWorkOrder: current.summary,
    lastWorkOrders,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
