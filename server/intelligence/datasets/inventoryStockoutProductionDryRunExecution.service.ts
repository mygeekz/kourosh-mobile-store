import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionDryRunExecutionLogs,
  listMlProductionDryRunExecutionLogsByImportId,
  listMlProductionImplementationDryRunPlans,
  listMlProductionImplementationDryRunPlansByImportId,
  recordMlProductionDryRunExecutionLog,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionDryRunExecutionContract,
  InventoryStockoutProductionDryRunExecutionGate,
  InventoryStockoutProductionDryRunExecutionResponse,
  InventoryStockoutProductionDryRunExecutionSummary,
  MlProductionDryRunExecutionCatalogSummary,
  ProductionDryRunExecutionRecommendation,
  ProductionDryRunExecutionStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_dry_run_execution_evidence_binder_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_DRY_RUN_KEY = "inventory_stockout_production_implementation_dry_run_planner_v1" as const;
const EXECUTION_SCOPE = "dry_run_execution_log_and_evidence_binder_only" as const;
const REQUIRED_EVIDENCE_KEYS = [
  "scope_freeze_signed",
  "runtime_boundary_walkthrough_notes",
  "qa_regression_fixture_map",
  "security_access_review_notes",
  "monitoring_rollback_tabletop_notes",
  "human_review_board_minutes",
] as const;

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

const toArray = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value)
  ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
  : [];

const buildContract = (): InventoryStockoutProductionDryRunExecutionContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Record offline dry-run execution evidence, signoffs, unresolved blockers, and a binder for a future decision meeting without enabling production inference or operational automation.",
  acceptedDryRunKey: ACCEPTED_DRY_RUN_KEY,
  executionScope: EXECUTION_SCOPE,
  requiredEvidenceKeys: [...REQUIRED_EVIDENCE_KEYS],
  executionRules: [
    "execution_ready requires a Phase 2T dry-run planner record with dry_run_ready status.",
    "All required evidence keys must be present and marked accepted or complete.",
    "Product, engineering, QA, security, monitoring, rollback, change, and release signoffs must be captured as named human evidence.",
    "Unresolved critical blockers prevent execution_ready.",
    "Evidence binder output is audit-only and cannot authorize production integration, inference runtime, decision automation, or inventory/accounting changes.",
  ],
  forbiddenBehavior: [
    "Do not create or expose production inference endpoints.",
    "Do not run or load model artifacts, call external model services, start training jobs, or add a model registry.",
    "Do not automate purchasing, stock adjustments, pricing, accounting, invoice, ledger, report, or customer communication workflows.",
    "Do not treat execution_ready as go-live authorization.",
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
  status: InventoryStockoutProductionDryRunExecutionGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionDryRunExecutionGate => ({ key, label, status, value, message });

const pickLatestImportId = async (): Promise<number | null> => {
  const executions = await listMlProductionDryRunExecutionLogs(25) as Array<Record<string, unknown>>;
  const fromExecution = executions.find((row) => asNumber(row.importId));
  if (fromExecution) return asNumber(fromExecution.importId);
  const dryRuns = await listMlProductionImplementationDryRunPlans(25) as Array<Record<string, unknown>>;
  const fromDryRun = dryRuns.find((row) => asNumber(row.importId));
  if (fromDryRun) return asNumber(fromDryRun.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

type ExecutionOwners = {
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  changeManager: string | null;
  releaseManager: string | null;
};

const ownerSnapshot = (payload: Record<string, unknown>, dryRun: Record<string, unknown> | null): ExecutionOwners => ({
  productOwner: firstText(payload.productOwner, dryRun?.productOwner),
  engineeringOwner: firstText(payload.engineeringOwner, dryRun?.engineeringOwner),
  qaOwner: firstText(payload.qaOwner, dryRun?.qaOwner),
  securityOwner: firstText(payload.securityOwner, dryRun?.securityOwner),
  monitoringOwner: firstText(payload.monitoringOwner, dryRun?.monitoringOwner),
  rollbackOwner: firstText(payload.rollbackOwner, dryRun?.rollbackOwner),
  changeManager: firstText(payload.changeManager, dryRun?.changeManager),
  releaseManager: firstText(payload.releaseManager, dryRun?.releaseManager),
});

const normalizeEvidenceItems = (payload: Record<string, unknown>, owners: ExecutionOwners) => {
  const provided = toArray(payload.evidenceItems);
  const providedByKey = new Map(provided.map((item) => [String(item.key || ""), item]));
  const templates: Record<string, { label: string; owner: string | null; requiredArtifact: string }> = {
    scope_freeze_signed: { label: "Scope freeze signoff", owner: owners.releaseManager, requiredArtifact: "signed dry-run scope note" },
    runtime_boundary_walkthrough_notes: { label: "Runtime boundary walkthrough", owner: owners.engineeringOwner, requiredArtifact: "boundary walkthrough notes" },
    qa_regression_fixture_map: { label: "QA regression fixture map", owner: owners.qaOwner, requiredArtifact: "QA fixture map and regression checklist" },
    security_access_review_notes: { label: "Security/access review", owner: owners.securityOwner, requiredArtifact: "security and RBAC review notes" },
    monitoring_rollback_tabletop_notes: { label: "Monitoring and rollback tabletop", owner: owners.monitoringOwner, requiredArtifact: "monitoring and rollback tabletop notes" },
    human_review_board_minutes: { label: "Human review board minutes", owner: owners.productOwner, requiredArtifact: "human review board dry-run minutes" },
  };

  return REQUIRED_EVIDENCE_KEYS.map((key) => {
    const providedItem = providedByKey.get(key) || {};
    const status = normalizeText(providedItem.status, "missing");
    const accepted = ["accepted", "complete", "signed", "pass"].includes(String(status));
    const artifactRef = normalizeText(providedItem.artifactRef, normalizeText(providedItem.url, normalizeText(providedItem.fileName)));
    return {
      key,
      label: templates[key].label,
      owner: firstText(providedItem.owner, templates[key].owner),
      status: accepted ? "accepted" : status,
      accepted,
      artifactRef,
      requiredArtifact: templates[key].requiredArtifact,
      notes: normalizeText(providedItem.notes),
    };
  });
};

const normalizeSignoffs = (payload: Record<string, unknown>, owners: ExecutionOwners) => {
  const provided = toArray(payload.signoffs);
  const providedByRole = new Map(provided.map((item) => [String(item.role || item.key || ""), item]));
  const roles = [
    ["product_owner", "Product owner", owners.productOwner],
    ["engineering_owner", "Engineering owner", owners.engineeringOwner],
    ["qa_owner", "QA owner", owners.qaOwner],
    ["security_owner", "Security owner", owners.securityOwner],
    ["monitoring_owner", "Monitoring owner", owners.monitoringOwner],
    ["rollback_owner", "Rollback owner", owners.rollbackOwner],
    ["change_manager", "Change manager", owners.changeManager],
    ["release_manager", "Release manager", owners.releaseManager],
  ] as const;

  return roles.map(([role, label, owner]) => {
    const providedItem = providedByRole.get(role) || {};
    const signerName = firstText(providedItem.signerName, providedItem.name, owner);
    const decision = normalizeText(providedItem.decision, signerName ? "signed" : "missing");
    const signed = ["signed", "approved", "acknowledged"].includes(String(decision));
    return {
      role,
      label,
      owner,
      signerName,
      decision,
      signed,
      signedAt: normalizeText(providedItem.signedAt),
      notes: normalizeText(providedItem.notes),
    };
  });
};

const normalizeBlockers = (payload: Record<string, unknown>) => {
  const blockers = toArray(payload.unresolvedBlockers);
  return blockers.map((blocker, index) => ({
    key: normalizeText(blocker.key, `blocker_${index + 1}`),
    severity: normalizeText(blocker.severity, "warning"),
    owner: normalizeText(blocker.owner),
    status: normalizeText(blocker.status, "open"),
    message: normalizeText(blocker.message, "Unresolved dry-run execution blocker"),
    mitigation: normalizeText(blocker.mitigation),
  }));
};

const buildBinder = (
  summary: InventoryStockoutProductionDryRunExecutionSummary,
  evidenceItems: Array<Record<string, unknown>>,
  signoffs: Array<Record<string, unknown>>,
  unresolvedBlockers: Array<Record<string, unknown>>,
) => ({
  binderKey: CONTRACT_KEY,
  generatedAt: summary.generatedAt,
  importId: summary.importId,
  dryRunPlanId: summary.dryRunPlanId,
  modelKey: summary.modelKey,
  modelVersion: summary.modelVersion,
  executionStatus: summary.executionStatus,
  evidenceItems,
  signoffs,
  unresolvedBlockers,
  meetingUse: "decision_meeting_evidence_binder_only",
  boundary: [
    "audit-only evidence pack",
    "no production inference runtime",
    "no model execution",
    "no automated inventory, accounting, pricing, invoice, ledger, report, or customer communication changes",
  ],
});

const uniqueMessages = (gates: InventoryStockoutProductionDryRunExecutionGate[], status: InventoryStockoutProductionDryRunExecutionGate["status"]) => (
  Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message).filter(Boolean)))
);

export const buildInventoryStockoutProductionDryRunExecutionContract = buildContract;

export const buildInventoryStockoutProductionDryRunExecution = async (
  importIdInput?: unknown,
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionDryRunExecutionResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput ?? payload.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousExecutions = importId ? await listMlProductionDryRunExecutionLogsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const dryRuns = importId ? await listMlProductionImplementationDryRunPlansByImportId(importId, 25) as Array<Record<string, unknown>> : await listMlProductionImplementationDryRunPlans(25) as Array<Record<string, unknown>>;
  const latestDryRun = dryRuns[0] || null;
  const owners = ownerSnapshot(payload, latestDryRun);
  const evidenceItems = normalizeEvidenceItems(payload, owners);
  const signoffs = normalizeSignoffs(payload, owners);
  const unresolvedBlockers = normalizeBlockers(payload);

  const dryRunReady = latestDryRun?.dryRunStatus === "dry_run_ready";
  const allEvidenceAccepted = evidenceItems.every((item) => item.accepted && item.artifactRef);
  const allSignoffsPresent = signoffs.every((item) => item.signed && item.signerName);
  const criticalBlockers = unresolvedBlockers.filter((item) => String(item.severity) === "critical" && String(item.status) !== "resolved");
  const ownerMatrixComplete = Object.values(owners).every(Boolean);
  const evidenceBinderStatus = allEvidenceAccepted ? "complete" : evidenceItems.some((item) => item.accepted || item.artifactRef) ? "partial" : "missing";
  const signoffStatus = allSignoffsPresent ? "complete" : signoffs.some((item) => item.signed) ? "partial" : "missing";

  const gates: InventoryStockoutProductionDryRunExecutionGate[] = [
    buildGate("model_import_available", "Model import audit record", modelImport ? "pass" : "block", Boolean(modelImport), modelImport ? "Model import audit record is available." : "A model import audit record is required before dry-run execution logging."),
    buildGate("dry_run_plan_available", "Phase 2T dry-run plan", latestDryRun ? "pass" : "block", latestDryRun?.id || null, latestDryRun ? "Phase 2T dry-run plan is available." : "Phase 2T dry-run plan must be created first."),
    buildGate("dry_run_ready", "Dry-run plan status", dryRunReady ? "pass" : "block", latestDryRun?.dryRunStatus || null, dryRunReady ? "Dry-run plan is ready for execution evidence logging." : "Dry-run plan must be dry_run_ready before execution binder creation."),
    buildGate("evidence_complete", "Required evidence", allEvidenceAccepted ? "pass" : "block", evidenceBinderStatus, allEvidenceAccepted ? "All required evidence artifacts are accepted." : "All required evidence keys need accepted evidence and artifact references."),
    buildGate("signoffs_complete", "Human signoffs", allSignoffsPresent ? "pass" : "block", signoffStatus, allSignoffsPresent ? "All required human signoffs are captured." : "Product, engineering, QA, security, monitoring, rollback, change, and release signoffs are required."),
    buildGate("owner_matrix_complete", "Execution owner matrix", ownerMatrixComplete ? "pass" : "block", owners, ownerMatrixComplete ? "All execution owners are assigned." : "All dry-run execution owner roles must be assigned."),
    buildGate("critical_blockers", "Critical unresolved blockers", criticalBlockers.length === 0 ? "pass" : "block", criticalBlockers.length, criticalBlockers.length === 0 ? "No critical unresolved blockers are present." : "Critical unresolved blockers must be resolved before execution_ready."),
    buildGate("runtime_policy", "Runtime policy", "pass", false, "Production inference, decision automation, and inventory/accounting changes remain disabled."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const blockerCount = blockers.length;
  const warningCount = warnings.length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 100);

  let executionStatus: ProductionDryRunExecutionStatus = "execution_ready";
  let recommendation: ProductionDryRunExecutionRecommendation = "record_evidence_binder";
  if (!latestDryRun || !dryRunReady) {
    executionStatus = "needs_dry_run_plan";
    recommendation = "complete_dry_run_plan";
  } else if (!allEvidenceAccepted) {
    executionStatus = "needs_evidence";
    recommendation = "collect_required_evidence";
  } else if (!allSignoffsPresent) {
    executionStatus = "needs_signoff";
    recommendation = "collect_signoffs";
  } else if (blockerCount > 0) {
    executionStatus = "blocked";
    recommendation = "blocked";
  }

  const summary: InventoryStockoutProductionDryRunExecutionSummary = {
    executionLogKey: CONTRACT_KEY,
    generatedAt,
    importId,
    dryRunPlanId: asNumber(latestDryRun?.id),
    workOrderId: asNumber(latestDryRun?.workOrderId),
    modelKey: normalizeText(modelImport?.modelKey, normalizeText(latestDryRun?.modelKey)),
    modelVersion: normalizeText(modelImport?.modelVersion, normalizeText(latestDryRun?.modelVersion)),
    dryRunStatus: normalizeText(latestDryRun?.dryRunStatus),
    executionStatus,
    recommendation,
    readinessScorePct,
    evidenceBinderStatus,
    signoffStatus,
    evidenceItemCount: evidenceItems.length,
    acceptedEvidenceCount: evidenceItems.filter((item) => item.accepted).length,
    signoffCount: signoffs.filter((item) => item.signed).length,
    unresolvedBlockerCount: unresolvedBlockers.filter((item) => String(item.status) !== "resolved").length,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    ...owners,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    executionGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "record_evidence_binder"
      ? "Use the evidence binder in the next decision meeting, while keeping production inference and operational automation disabled."
      : blockers[0] || warnings[0] || "Complete evidence, signoffs, and blocker resolution before recording execution-ready status.",
  };

  const evidenceBinder = buildBinder(summary, evidenceItems, signoffs, unresolvedBlockers);
  const auditExport = {
    generatedAt,
    contractKey: CONTRACT_KEY,
    importId,
    dryRunPlanId: summary.dryRunPlanId,
    executionStatus,
    recommendation,
    readinessScorePct,
    evidenceBinderStatus,
    signoffStatus,
    blockers,
    warnings,
    policy: buildContract().operationalPolicy,
    evidenceBinderOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestDryRunPlan: latestDryRun,
    evidenceItems,
    signoffs,
    unresolvedBlockers,
    evidenceBinder,
    auditExport,
    previousExecutionLogs: previousExecutions,
    operationalPolicy: {
      dryRunExecutionEvidenceOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 2U records dry-run execution evidence only. It cannot enable production inference or alter operational, inventory, accounting, invoice, ledger, report, pricing, or customer-communication behavior.",
    },
  };
};

export const recordInventoryStockoutProductionDryRunExecution = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionDryRunExecutionResponse> => {
  const data = await buildInventoryStockoutProductionDryRunExecution(payload.importId, payload);
  const record = await recordMlProductionDryRunExecutionLog({
    executionLogKey: CONTRACT_KEY,
    importId: data.summary.importId,
    dryRunPlanId: data.summary.dryRunPlanId,
    workOrderId: data.summary.workOrderId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    dryRunStatus: data.summary.dryRunStatus,
    executionStatus: data.summary.executionStatus,
    recommendation: data.summary.recommendation,
    readinessScorePct: data.summary.readinessScorePct,
    evidenceBinderStatus: data.summary.evidenceBinderStatus,
    signoffStatus: data.summary.signoffStatus,
    evidenceItemCount: data.summary.evidenceItemCount,
    acceptedEvidenceCount: data.summary.acceptedEvidenceCount,
    signoffCount: data.summary.signoffCount,
    unresolvedBlockerCount: data.summary.unresolvedBlockerCount,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    productOwner: data.summary.productOwner,
    engineeringOwner: data.summary.engineeringOwner,
    qaOwner: data.summary.qaOwner,
    securityOwner: data.summary.securityOwner,
    monitoringOwner: data.summary.monitoringOwner,
    rollbackOwner: data.summary.rollbackOwner,
    changeManager: data.summary.changeManager,
    releaseManager: data.summary.releaseManager,
    evidenceItems: data.evidenceItems,
    signoffs: data.signoffs,
    unresolvedBlockers: data.unresolvedBlockers,
    evidenceBinder: data.evidenceBinder,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, executionRecord: record };
};

export const listInventoryStockoutProductionDryRunExecutionLogs = async (importIdInput: unknown) => {
  return listMlProductionDryRunExecutionLogsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlProductionDryRunExecutionCatalogSummary = async (): Promise<MlProductionDryRunExecutionCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutProductionDryRunExecution(importId);
  const lastExecutionLogs = await listMlProductionDryRunExecutionLogs(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentExecution: current.summary,
    lastExecutionLogs,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
