import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionDryRunCloseoutMemos,
  listMlProductionDryRunCloseoutMemosByImportId,
  listMlProductionDryRunExecutionLogs,
  listMlProductionDryRunExecutionLogsByImportId,
  recordMlProductionDryRunCloseoutMemo,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionDryRunCloseoutMemoContract,
  InventoryStockoutProductionDryRunCloseoutMemoGate,
  InventoryStockoutProductionDryRunCloseoutMemoResponse,
  InventoryStockoutProductionDryRunCloseoutMemoSummary,
  MlProductionDryRunCloseoutMemoCatalogSummary,
  ProductionDryRunCloseoutMemoRecommendation,
  ProductionDryRunCloseoutMemoStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_dry_run_closeout_decision_memo_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_EXECUTION_KEY = "inventory_stockout_production_dry_run_execution_evidence_binder_v1" as const;
const MEMO_SCOPE = "dry_run_closeout_decision_memo_only" as const;

const FINAL_RECOMMENDATIONS = [
  "continue_future_implementation_planning",
  "pause_for_more_evidence",
  "rollback_path",
  "stop_candidate",
  "blocked",
] as const;

type FinalRecommendation = typeof FINAL_RECOMMENDATIONS[number];

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

const normalizeBoolean = (value: unknown): boolean => value === true || value === 1 || value === "true" || value === "yes" || value === "signed";

const buildContract = (): InventoryStockoutProductionDryRunCloseoutMemoContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Create a final dry-run closeout decision memo from the execution evidence binder, signoff status, unresolved blockers, risk summary, and decision recommendation without enabling production inference or operational automation.",
  acceptedExecutionKey: ACCEPTED_EXECUTION_KEY,
  memoScope: MEMO_SCOPE,
  allowedRecommendations: [...FINAL_RECOMMENDATIONS],
  memoRules: [
    "memo_ready requires a Phase 2U execution log with execution_ready status.",
    "Evidence binder and signoffs must be complete before the memo can recommend continuing future implementation planning.",
    "The memo must include a final recommendation, decision owner, memo owner, and review board chair.",
    "Unresolved critical blockers force blocked status, and high-risk unresolved items force at least pause_for_more_evidence.",
    "Decision memo output is audit-only and cannot authorize production integration, inference runtime, decision automation, or inventory/accounting changes.",
  ],
  forbiddenBehavior: [
    "Do not create or expose production inference endpoints.",
    "Do not run, import, load, or score model artifacts inside Kourosh.",
    "Do not automate purchasing, stock adjustments, pricing, accounting, invoice, ledger, report, or customer communication workflows.",
    "Do not treat memo_ready or continue_future_implementation_planning as go-live authorization.",
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
  status: InventoryStockoutProductionDryRunCloseoutMemoGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionDryRunCloseoutMemoGate => ({ key, label, status, value, message });

const uniqueMessages = (gates: InventoryStockoutProductionDryRunCloseoutMemoGate[], status: InventoryStockoutProductionDryRunCloseoutMemoGate["status"]) => (
  [...new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message).filter(Boolean))]
);

const pickLatestImportId = async (): Promise<number | null> => {
  const memos = await listMlProductionDryRunCloseoutMemos(25) as Array<Record<string, unknown>>;
  const fromMemo = memos.find((row) => asNumber(row.importId));
  if (fromMemo) return asNumber(fromMemo.importId);
  const executions = await listMlProductionDryRunExecutionLogs(25) as Array<Record<string, unknown>>;
  const fromExecution = executions.find((row) => asNumber(row.importId));
  if (fromExecution) return asNumber(fromExecution.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const normalizeFinalRecommendation = (payload: Record<string, unknown>, execution: Record<string, unknown> | null): FinalRecommendation => {
  const direct = normalizeText(payload.finalRecommendation, normalizeText(payload.decision, normalizeText(payload.recommendation)));
  if (direct && (FINAL_RECOMMENDATIONS as readonly string[]).includes(direct)) return direct as FinalRecommendation;
  if (!execution || execution.executionStatus !== "execution_ready") return "pause_for_more_evidence";
  if (asNumber(execution.unresolvedBlockerCount) && Number(execution.unresolvedBlockerCount) > 0) return "pause_for_more_evidence";
  return "continue_future_implementation_planning";
};

const normalizeRisks = (payload: Record<string, unknown>, finalRecommendation: FinalRecommendation) => {
  const provided = toArray(payload.risks || payload.riskSummary);
  const base = provided.length > 0 ? provided : [
    {
      key: "production_boundary_confusion",
      severity: finalRecommendation === "continue_future_implementation_planning" ? "medium" : "high",
      status: "open",
      message: "Ensure stakeholders understand this memo does not authorize production inference or operational automation.",
      owner: normalizeText(payload.riskOwner, normalizeText(payload.rollbackOwner)),
      mitigation: "Keep productionIntegrationAllowed=false until a separate future implementation phase is explicitly approved.",
    },
    {
      key: "evidence_drift_before_implementation",
      severity: "medium",
      status: "open",
      message: "Dry-run evidence may become stale before future implementation scoping starts.",
      owner: normalizeText(payload.monitoringOwner, normalizeText(payload.memoOwner)),
      mitigation: "Refresh evidence binder before any implementation work order is activated.",
    },
  ];

  return base.map((risk, index) => ({
    key: normalizeText(risk.key, `risk_${index + 1}`),
    severity: normalizeText(risk.severity, "medium"),
    status: normalizeText(risk.status, "open"),
    message: normalizeText(risk.message, normalizeText(risk.label, "Dry-run closeout risk item.")),
    owner: normalizeText(risk.owner, normalizeText(payload.riskOwner, normalizeText(payload.rollbackOwner))),
    mitigation: normalizeText(risk.mitigation, "Assign owner and mitigation before future implementation scoping."),
  }));
};

const buildMemo = (
  summary: InventoryStockoutProductionDryRunCloseoutMemoSummary,
  evidenceSummary: Record<string, unknown>,
  signoffSummary: Record<string, unknown>,
  riskSummary: Array<Record<string, unknown>>,
  decisionSummary: Record<string, unknown>,
) => ({
  memoKey: CONTRACT_KEY,
  title: "Dry-Run Closeout Decision Memo",
  generatedAt: summary.generatedAt,
  model: {
    importId: summary.importId,
    modelKey: summary.modelKey,
    modelVersion: summary.modelVersion,
  },
  decision: decisionSummary,
  evidenceSummary,
  signoffSummary,
  riskSummary,
  blockers: summary.blockers,
  warnings: summary.warnings,
  recommendedNextAction: summary.recommendedNextAction,
  operationalBoundary: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    message: "This memo is a closeout artifact for dry-run review only. It is not production approval.",
  },
});

export const buildInventoryStockoutProductionDryRunCloseoutMemoContract = buildContract;

export const buildInventoryStockoutProductionDryRunCloseoutMemo = async (
  importIdInput?: unknown,
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionDryRunCloseoutMemoResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) || asNumber(payload.importId) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousCloseoutMemos = importId ? await listMlProductionDryRunCloseoutMemosByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const executionLogs = importId ? await listMlProductionDryRunExecutionLogsByImportId(importId, 25) as Array<Record<string, unknown>> : await listMlProductionDryRunExecutionLogs(25) as Array<Record<string, unknown>>;
  const latestExecution = executionLogs[0] || null;

  const memoOwner = firstText(payload.memoOwner, payload.owner, latestExecution?.releaseManager, latestExecution?.productOwner);
  const decisionOwner = firstText(payload.decisionOwner, payload.signoffOwner, latestExecution?.productOwner, latestExecution?.releaseManager);
  const reviewBoardChair = firstText(payload.reviewBoardChair, payload.boardChair, payload.chair, latestExecution?.productOwner);
  const productOwner = firstText(payload.productOwner, latestExecution?.productOwner);
  const engineeringOwner = firstText(payload.engineeringOwner, latestExecution?.engineeringOwner);
  const qaOwner = firstText(payload.qaOwner, latestExecution?.qaOwner);
  const securityOwner = firstText(payload.securityOwner, latestExecution?.securityOwner);
  const monitoringOwner = firstText(payload.monitoringOwner, latestExecution?.monitoringOwner);
  const rollbackOwner = firstText(payload.rollbackOwner, latestExecution?.rollbackOwner);

  const finalRecommendation = normalizeFinalRecommendation(payload, latestExecution);
  const finalDecisionSigned = normalizeBoolean(payload.finalDecisionSigned) || normalizeBoolean(payload.ownerSignoff) || Boolean(decisionOwner && reviewBoardChair && memoOwner);
  const riskSummary = normalizeRisks(payload, finalRecommendation);
  const highOpenRisks = riskSummary.filter((risk) => ["high", "critical"].includes(String(risk.severity)) && String(risk.status) !== "resolved");

  const executionReady = latestExecution?.executionStatus === "execution_ready";
  const evidenceComplete = latestExecution?.evidenceBinderStatus === "complete" || (asNumber(latestExecution?.acceptedEvidenceCount) || 0) >= (asNumber(latestExecution?.evidenceItemCount) || 1);
  const signoffsComplete = latestExecution?.signoffStatus === "complete" || (asNumber(latestExecution?.signoffCount) || 0) >= 8;
  const unresolvedBlockerCount = asNumber(latestExecution?.unresolvedBlockerCount) || 0;
  const decisionRecorded = Boolean(finalRecommendation && decisionOwner && memoOwner && reviewBoardChair);

  const gates: InventoryStockoutProductionDryRunCloseoutMemoGate[] = [
    buildGate("model_import_available", "Model import audit record", modelImport ? "pass" : "block", Boolean(modelImport), modelImport ? "Model import audit record is available." : "A model import audit record is required before closeout memo creation."),
    buildGate("execution_log_available", "Phase 2U execution log", latestExecution ? "pass" : "block", latestExecution?.id || null, latestExecution ? "Dry-run execution log is available." : "A Phase 2U dry-run execution log is required."),
    buildGate("execution_ready", "Execution status", executionReady ? "pass" : "block", latestExecution?.executionStatus || null, executionReady ? "Execution evidence binder reached execution_ready." : "Dry-run execution must reach execution_ready before closeout memo is ready."),
    buildGate("evidence_complete", "Evidence summary", evidenceComplete ? "pass" : "block", latestExecution?.evidenceBinderStatus || null, evidenceComplete ? "Required evidence is complete." : "Evidence binder must be complete before final memo readiness."),
    buildGate("signoffs_complete", "Signoff summary", signoffsComplete ? "pass" : "block", latestExecution?.signoffStatus || null, signoffsComplete ? "Execution signoffs are complete." : "Required human signoffs must be complete."),
    buildGate("decision_recorded", "Final decision memo fields", decisionRecorded ? "pass" : "block", finalRecommendation, decisionRecorded ? "Final recommendation, memo owner, decision owner, and review board chair are recorded." : "Final recommendation plus memo owner, decision owner, and review board chair are required."),
    buildGate("final_decision_signoff", "Final decision signoff", finalDecisionSigned ? "pass" : "warning", finalDecisionSigned, finalDecisionSigned ? "Final decision signoff is recorded." : "Final decision signoff should be recorded before meeting presentation."),
    buildGate("unresolved_blockers", "Unresolved blockers", unresolvedBlockerCount === 0 ? "pass" : "block", unresolvedBlockerCount, unresolvedBlockerCount === 0 ? "No unresolved blockers remain from execution log." : "Unresolved blockers must be addressed in the memo."),
    buildGate("high_risk_items", "High-risk items", highOpenRisks.length === 0 ? "pass" : "warning", highOpenRisks.length, highOpenRisks.length === 0 ? "No open high-risk closeout items were found." : "Open high-risk items require owner mitigation before future implementation scoping."),
    buildGate("runtime_policy", "Runtime policy", "pass", false, "Production inference, decision automation, and inventory/accounting changes remain disabled."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 100);

  let closeoutStatus: ProductionDryRunCloseoutMemoStatus = "memo_ready";
  let recommendation: ProductionDryRunCloseoutMemoRecommendation = "present_decision_memo";
  if (!latestExecution || !executionReady) {
    closeoutStatus = "needs_execution_log";
    recommendation = "complete_dry_run_execution";
  } else if (!decisionRecorded) {
    closeoutStatus = "needs_decision";
    recommendation = "record_final_decision";
  } else if (!finalDecisionSigned) {
    closeoutStatus = "needs_final_signoff";
    recommendation = "collect_final_signoff";
  } else if (blockers.length > 0) {
    closeoutStatus = "blocked";
    recommendation = "resolve_blockers";
  }

  const evidenceSummary = {
    evidenceBinderStatus: normalizeText(latestExecution?.evidenceBinderStatus),
    evidenceItemCount: asNumber(latestExecution?.evidenceItemCount) || 0,
    acceptedEvidenceCount: asNumber(latestExecution?.acceptedEvidenceCount) || 0,
    sourceExecutionLogId: asNumber(latestExecution?.id),
  };
  const signoffSummary = {
    signoffStatus: normalizeText(latestExecution?.signoffStatus),
    signoffCount: asNumber(latestExecution?.signoffCount) || 0,
    finalDecisionSigned,
    memoOwner,
    decisionOwner,
    reviewBoardChair,
  };
  const decisionSummary = {
    finalRecommendation,
    closeoutStatus,
    recommendation,
    decisionOwner,
    memoOwner,
    reviewBoardChair,
    decisionRationale: normalizeText(payload.decisionRationale, normalizeText(payload.rationale, "Dry-run closeout memo generated from execution evidence binder and signoff state.")),
  };

  const summary: InventoryStockoutProductionDryRunCloseoutMemoSummary = {
    closeoutMemoKey: CONTRACT_KEY,
    generatedAt,
    importId,
    executionLogId: asNumber(latestExecution?.id),
    dryRunPlanId: asNumber(latestExecution?.dryRunPlanId),
    workOrderId: asNumber(latestExecution?.workOrderId),
    modelKey: normalizeText(modelImport?.modelKey, normalizeText(latestExecution?.modelKey)),
    modelVersion: normalizeText(modelImport?.modelVersion, normalizeText(latestExecution?.modelVersion)),
    executionStatus: normalizeText(latestExecution?.executionStatus),
    evidenceBinderStatus: normalizeText(latestExecution?.evidenceBinderStatus),
    signoffStatus: normalizeText(latestExecution?.signoffStatus),
    closeoutStatus,
    finalRecommendation,
    recommendation,
    readinessScorePct,
    evidenceItemCount: evidenceSummary.evidenceItemCount as number,
    acceptedEvidenceCount: evidenceSummary.acceptedEvidenceCount as number,
    signoffCount: signoffSummary.signoffCount as number,
    unresolvedBlockerCount,
    riskCount: riskSummary.length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    memoOwner,
    decisionOwner,
    reviewBoardChair,
    productOwner,
    engineeringOwner,
    qaOwner,
    securityOwner,
    monitoringOwner,
    rollbackOwner,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    closeoutGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "present_decision_memo"
      ? "Present the dry-run closeout memo in the next decision meeting. Keep production inference and operational automation disabled."
      : blockers[0] || warnings[0] || "Complete final decision, signoff, and blocker resolution before presenting the closeout memo.",
  };

  const closeoutMemo = buildMemo(summary, evidenceSummary, signoffSummary, riskSummary, decisionSummary);
  const auditExport = {
    generatedAt,
    contractKey: CONTRACT_KEY,
    importId,
    executionLogId: summary.executionLogId,
    closeoutStatus,
    finalRecommendation,
    readinessScorePct,
    blockers,
    warnings,
    policy: buildContract().operationalPolicy,
    closeoutMemoOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestExecutionLog: latestExecution,
    closeoutMemo,
    evidenceSummary,
    signoffSummary,
    riskSummary,
    decisionSummary,
    auditExport,
    previousCloseoutMemos,
    operationalPolicy: {
      dryRunCloseoutMemoOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 2V creates a dry-run closeout decision memo only. It cannot enable production inference or alter operational, inventory, accounting, invoice, ledger, report, pricing, or customer-communication behavior.",
    },
  };
};

export const recordInventoryStockoutProductionDryRunCloseoutMemo = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionDryRunCloseoutMemoResponse> => {
  const data = await buildInventoryStockoutProductionDryRunCloseoutMemo(payload.importId, payload);
  const record = await recordMlProductionDryRunCloseoutMemo({
    closeoutMemoKey: CONTRACT_KEY,
    importId: data.summary.importId,
    executionLogId: data.summary.executionLogId,
    dryRunPlanId: data.summary.dryRunPlanId,
    workOrderId: data.summary.workOrderId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    executionStatus: data.summary.executionStatus,
    evidenceBinderStatus: data.summary.evidenceBinderStatus,
    signoffStatus: data.summary.signoffStatus,
    closeoutStatus: data.summary.closeoutStatus,
    finalRecommendation: data.summary.finalRecommendation,
    readinessScorePct: data.summary.readinessScorePct,
    evidenceItemCount: data.summary.evidenceItemCount,
    acceptedEvidenceCount: data.summary.acceptedEvidenceCount,
    signoffCount: data.summary.signoffCount,
    unresolvedBlockerCount: data.summary.unresolvedBlockerCount,
    riskCount: data.summary.riskCount,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    memoOwner: data.summary.memoOwner,
    decisionOwner: data.summary.decisionOwner,
    reviewBoardChair: data.summary.reviewBoardChair,
    productOwner: data.summary.productOwner,
    engineeringOwner: data.summary.engineeringOwner,
    qaOwner: data.summary.qaOwner,
    securityOwner: data.summary.securityOwner,
    monitoringOwner: data.summary.monitoringOwner,
    rollbackOwner: data.summary.rollbackOwner,
    closeoutMemo: data.closeoutMemo,
    evidenceSummary: data.evidenceSummary,
    signoffSummary: data.signoffSummary,
    riskSummary: data.riskSummary,
    decisionSummary: data.decisionSummary,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, closeoutMemoRecord: record };
};

export const listInventoryStockoutProductionDryRunCloseoutMemos = async (importIdInput: unknown) => {
  return listMlProductionDryRunCloseoutMemosByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlProductionDryRunCloseoutMemoCatalogSummary = async (): Promise<MlProductionDryRunCloseoutMemoCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutProductionDryRunCloseoutMemo(importId);
  const lastCloseoutMemos = await listMlProductionDryRunCloseoutMemos(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentCloseoutMemo: current.summary,
    lastCloseoutMemos,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
