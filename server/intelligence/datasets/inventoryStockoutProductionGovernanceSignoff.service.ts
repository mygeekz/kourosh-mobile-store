import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionDryRunCloseoutMemos,
  listMlProductionDryRunCloseoutMemosByImportId,
  listMlProductionGovernanceSignoffDecisions,
  listMlProductionGovernanceSignoffDecisionsByImportId,
  recordMlProductionGovernanceSignoffDecision,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionGovernanceSignoffContract,
  InventoryStockoutProductionGovernanceSignoffGate,
  InventoryStockoutProductionGovernanceSignoffResponse,
  InventoryStockoutProductionGovernanceSignoffSummary,
  MlProductionGovernanceSignoffCatalogSummary,
  ProductionGovernanceImplementationEntryDecision,
  ProductionGovernanceRecommendation,
  ProductionGovernanceSignoffStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_final_governance_signoff_implementation_entry_decision_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_CLOSEOUT_MEMO_KEY = "inventory_stockout_production_dry_run_closeout_decision_memo_v1" as const;
const GOVERNANCE_SCOPE = "phase2_final_governance_signoff_and_phase3_entry_decision_only" as const;

const ENTRY_DECISIONS = [
  "enter_phase3a_safe_skeleton",
  "pause_before_phase3",
  "collect_more_evidence",
  "stop_ml_candidate",
  "blocked",
] as const;

type EntryDecision = typeof ENTRY_DECISIONS[number];

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

const normalizeBoolean = (value: unknown): boolean => value === true || value === 1 || value === "true" || value === "yes" || value === "signed" || value === "approved";

const buildContract = (): InventoryStockoutProductionGovernanceSignoffContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Create the final Phase 2 governance signoff and implementation-entry decision after the dry-run closeout memo, without enabling production inference or operational automation.",
  acceptedCloseoutMemoKey: ACCEPTED_CLOSEOUT_MEMO_KEY,
  governanceScope: GOVERNANCE_SCOPE,
  allowedImplementationEntryDecisions: [...ENTRY_DECISIONS],
  governanceRules: [
    "governance_ready requires a Phase 2V closeout memo with memo_ready status.",
    "The closeout memo must recommend continue_future_implementation_planning before Phase 2 can be closed as ready for Phase 3A scoping.",
    "Governance signoff requires executive sponsor, governance owner, decision owner, Phase 3 owner, rollback owner, and risk owner.",
    "A board quorum of at least three named signoffs is required for governance_ready.",
    "Governance signoff can only authorize Phase 3A safe skeleton scoping; it cannot enable production integration, inference runtime, decision automation, or inventory/accounting changes.",
  ],
  forbiddenBehavior: [
    "Do not create or expose production inference endpoints.",
    "Do not run, import, load, or score model artifacts inside Kourosh.",
    "Do not automate purchasing, stock adjustments, pricing, accounting, invoice, ledger, report, or customer communication workflows.",
    "Do not treat Phase 2 closure as go-live authorization.",
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
  status: InventoryStockoutProductionGovernanceSignoffGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionGovernanceSignoffGate => ({ key, label, status, value, message });

const uniqueMessages = (gates: InventoryStockoutProductionGovernanceSignoffGate[], status: InventoryStockoutProductionGovernanceSignoffGate["status"]) => (
  [...new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message).filter(Boolean))]
);

const pickLatestImportId = async (): Promise<number | null> => {
  const governance = await listMlProductionGovernanceSignoffDecisions(25) as Array<Record<string, unknown>>;
  const fromGovernance = governance.find((row) => asNumber(row.importId));
  if (fromGovernance) return asNumber(fromGovernance.importId);
  const memos = await listMlProductionDryRunCloseoutMemos(25) as Array<Record<string, unknown>>;
  const fromMemo = memos.find((row) => asNumber(row.importId));
  if (fromMemo) return asNumber(fromMemo.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const normalizeEntryDecision = (payload: Record<string, unknown>, latestMemo: Record<string, unknown> | null): EntryDecision => {
  const direct = normalizeText(payload.implementationEntryDecision, normalizeText(payload.entryDecision, normalizeText(payload.finalDecision)));
  if (direct && (ENTRY_DECISIONS as readonly string[]).includes(direct)) return direct as EntryDecision;
  if (!latestMemo || latestMemo.closeoutStatus !== "memo_ready") return "collect_more_evidence";
  if (latestMemo.finalRecommendation === "continue_future_implementation_planning") return "enter_phase3a_safe_skeleton";
  if (latestMemo.finalRecommendation === "stop_candidate") return "stop_ml_candidate";
  if (latestMemo.finalRecommendation === "rollback_path") return "blocked";
  return "pause_before_phase3";
};

const normalizeSignoffMatrix = (payload: Record<string, unknown>, owners: Record<string, string | null>) => {
  const provided = toArray(payload.signoffMatrix || payload.signoffs || payload.governanceSignoffs);
  const base = provided.length > 0 ? provided : [
    { role: "executive_sponsor", owner: owners.executiveSponsor, status: owners.executiveSponsor ? "signed" : "missing" },
    { role: "governance_owner", owner: owners.governanceOwner, status: owners.governanceOwner ? "signed" : "missing" },
    { role: "decision_owner", owner: owners.decisionOwner, status: owners.decisionOwner ? "signed" : "missing" },
    { role: "phase3_owner", owner: owners.phase3Owner, status: owners.phase3Owner ? "signed" : "missing" },
    { role: "rollback_owner", owner: owners.rollbackOwner, status: owners.rollbackOwner ? "signed" : "missing" },
    { role: "risk_owner", owner: owners.riskOwner, status: owners.riskOwner ? "signed" : "missing" },
  ];

  return base.map((item, index) => ({
    role: normalizeText(item.role, `signoff_${index + 1}`),
    owner: normalizeText(item.owner, null),
    status: normalizeText(item.status, normalizeText(item.decision, "missing")),
    signed: normalizeBoolean(item.signed) || normalizeText(item.status) === "signed" || normalizeText(item.status) === "approved",
    note: normalizeText(item.note, null),
  }));
};

export const buildInventoryStockoutProductionGovernanceSignoffContract = buildContract;

export const buildInventoryStockoutProductionGovernanceSignoff = async (
  importIdInput?: unknown,
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionGovernanceSignoffResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) || asNumber(payload.importId) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousGovernanceDecisions = importId ? await listMlProductionGovernanceSignoffDecisionsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const closeoutMemos = importId ? await listMlProductionDryRunCloseoutMemosByImportId(importId, 25) as Array<Record<string, unknown>> : await listMlProductionDryRunCloseoutMemos(25) as Array<Record<string, unknown>>;
  const latestCloseoutMemo = closeoutMemos[0] || null;

  const executiveSponsor = firstText(payload.executiveSponsor, payload.sponsor, payload.owner);
  const governanceOwner = firstText(payload.governanceOwner, payload.gateOwner, payload.owner);
  const decisionOwner = firstText(payload.decisionOwner, latestCloseoutMemo?.decisionOwner, latestCloseoutMemo?.memoOwner);
  const phase3Owner = firstText(payload.phase3Owner, payload.implementationOwner, payload.productOwner);
  const rollbackOwner = firstText(payload.rollbackOwner, latestCloseoutMemo?.rollbackOwner);
  const riskOwner = firstText(payload.riskOwner, rollbackOwner, payload.securityOwner);

  const owners = { executiveSponsor, governanceOwner, decisionOwner, phase3Owner, rollbackOwner, riskOwner };
  const signoffMatrix = normalizeSignoffMatrix(payload, owners);
  const signedCount = signoffMatrix.filter((item) => item.signed && item.owner).length;
  const requiredOwnerCount = Object.values(owners).filter(Boolean).length;
  const implementationEntryDecision = normalizeEntryDecision(payload, latestCloseoutMemo);
  const governanceSigned = normalizeBoolean(payload.governanceSigned) || signedCount >= 6;
  const boardQuorumMet = signedCount >= 3;
  const entryDecisionRecorded = Boolean(implementationEntryDecision && implementationEntryDecision !== "blocked");
  const closeoutReady = latestCloseoutMemo?.closeoutStatus === "memo_ready";
  const continueRecommendation = latestCloseoutMemo?.finalRecommendation === "continue_future_implementation_planning";
  const ownerMatrixComplete = requiredOwnerCount >= 6;

  const gates: InventoryStockoutProductionGovernanceSignoffGate[] = [
    buildGate("model_import_available", "Model import audit record", modelImport ? "pass" : "block", Boolean(modelImport), modelImport ? "Model import audit record is available." : "A model import audit record is required before final governance signoff."),
    buildGate("closeout_memo_available", "Phase 2V closeout memo", latestCloseoutMemo ? "pass" : "block", latestCloseoutMemo?.id || null, latestCloseoutMemo ? "Dry-run closeout memo is available." : "A Phase 2V closeout memo is required."),
    buildGate("closeout_memo_ready", "Closeout memo status", closeoutReady ? "pass" : "block", latestCloseoutMemo?.closeoutStatus || null, closeoutReady ? "Closeout memo reached memo_ready." : "Closeout memo must reach memo_ready before governance signoff."),
    buildGate("closeout_recommendation", "Closeout recommendation", continueRecommendation ? "pass" : "warning", latestCloseoutMemo?.finalRecommendation || null, continueRecommendation ? "Closeout memo recommends continuing future implementation planning." : "Closeout memo does not clearly recommend entering future implementation planning."),
    buildGate("owner_matrix", "Governance owner matrix", ownerMatrixComplete ? "pass" : "block", requiredOwnerCount, ownerMatrixComplete ? "All governance owner roles are assigned." : "Executive sponsor, governance owner, decision owner, Phase 3 owner, rollback owner, and risk owner are required."),
    buildGate("board_quorum", "Governance board quorum", boardQuorumMet ? "pass" : "block", signedCount, boardQuorumMet ? "At least three named signoffs are present." : "At least three named governance signoffs are required."),
    buildGate("governance_signoff", "Final governance signoff", governanceSigned ? "pass" : "warning", governanceSigned, governanceSigned ? "Final governance signoff is complete." : "Final governance signoff should be explicitly recorded before closing Phase 2."),
    buildGate("implementation_entry_decision", "Implementation entry decision", entryDecisionRecorded ? "pass" : "block", implementationEntryDecision, entryDecisionRecorded ? "Implementation entry decision is recorded." : "A go/no-go entry decision is required."),
    buildGate("runtime_policy", "Runtime policy", "pass", false, "Production inference, decision automation, and inventory/accounting changes remain disabled."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 100);

  let governanceStatus: ProductionGovernanceSignoffStatus = "governance_ready";
  let recommendation: ProductionGovernanceRecommendation = "close_phase2_and_prepare_phase3a";
  if (!latestCloseoutMemo || !closeoutReady) {
    governanceStatus = "needs_closeout_memo";
    recommendation = "complete_closeout_memo";
  } else if (!ownerMatrixComplete || !boardQuorumMet || !governanceSigned) {
    governanceStatus = "needs_signoff";
    recommendation = "collect_governance_signoff";
  } else if (!entryDecisionRecorded) {
    governanceStatus = "needs_entry_decision";
    recommendation = "record_implementation_entry_decision";
  } else if (blockers.length > 0 || implementationEntryDecision === "blocked") {
    governanceStatus = "blocked";
    recommendation = "resolve_governance_blockers";
  }

  const phase2Closed = governanceStatus === "governance_ready" && implementationEntryDecision === "enter_phase3a_safe_skeleton";
  const governanceSignoffStatus = governanceSigned ? "complete" : signedCount > 0 ? "partial" : "missing";
  const boardQuorumStatus = boardQuorumMet ? "complete" : signedCount > 0 ? "partial" : "missing";
  const implementationEntryStatus = implementationEntryDecision === "blocked" ? "blocked" : entryDecisionRecorded ? "recorded" : "missing";

  const governanceSummary = {
    phase2Closed,
    governanceStatus,
    recommendation,
    readinessScorePct,
    signedCount,
    ownerMatrixComplete,
    governanceSignoffStatus,
    boardQuorumStatus,
  };
  const implementationEntryDecisionPayload = {
    decision: implementationEntryDecision,
    decisionOwner,
    phase3Owner,
    rationale: normalizeText(payload.decisionRationale, normalizeText(payload.rationale, "Final Phase 2 governance signoff generated from dry-run closeout memo and governance owner matrix.")),
    allowedNextScope: implementationEntryDecision === "enter_phase3a_safe_skeleton" ? "Phase 3A safe inference boundary skeleton only; disabled by default and behind feature flag." : "No Phase 3 implementation scope is authorized.",
  };
  const phase2CloseoutArchive = {
    acceptedCloseoutMemoKey: ACCEPTED_CLOSEOUT_MEMO_KEY,
    closeoutMemoId: asNumber(latestCloseoutMemo?.id),
    closeoutStatus: normalizeText(latestCloseoutMemo?.closeoutStatus),
    finalRecommendation: normalizeText(latestCloseoutMemo?.finalRecommendation),
    phase2Closed,
    archiveNote: "Phase 2 governance archive is audit-only and does not authorize production inference.",
  };

  const summary: InventoryStockoutProductionGovernanceSignoffSummary = {
    governanceKey: CONTRACT_KEY,
    generatedAt,
    importId,
    closeoutMemoId: asNumber(latestCloseoutMemo?.id),
    executionLogId: asNumber(latestCloseoutMemo?.executionLogId),
    modelKey: normalizeText(modelImport?.modelKey, normalizeText(latestCloseoutMemo?.modelKey)),
    modelVersion: normalizeText(modelImport?.modelVersion, normalizeText(latestCloseoutMemo?.modelVersion)),
    closeoutStatus: normalizeText(latestCloseoutMemo?.closeoutStatus),
    finalRecommendation: normalizeText(latestCloseoutMemo?.finalRecommendation),
    governanceStatus,
    implementationEntryDecision: implementationEntryDecision as ProductionGovernanceImplementationEntryDecision,
    recommendation,
    phase2Closed,
    readinessScorePct,
    governanceSignoffStatus,
    boardQuorumStatus,
    implementationEntryStatus,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    executiveSponsor,
    governanceOwner,
    decisionOwner,
    phase3Owner,
    rollbackOwner,
    riskOwner,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    governanceGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "close_phase2_and_prepare_phase3a"
      ? "Close Phase 2 governance and prepare a separate Phase 3A safe skeleton task. Keep all inference and operational automation disabled."
      : blockers[0] || warnings[0] || "Complete governance signoff and implementation entry decision before closing Phase 2.",
  };

  const auditExport = {
    generatedAt,
    contractKey: CONTRACT_KEY,
    importId,
    closeoutMemoId: summary.closeoutMemoId,
    governanceStatus,
    implementationEntryDecision,
    phase2Closed,
    readinessScorePct,
    blockers,
    warnings,
    policy: buildContract().operationalPolicy,
    finalGovernanceSignoffOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestCloseoutMemo,
    governanceSummary,
    signoffMatrix,
    implementationEntryDecision: implementationEntryDecisionPayload,
    phase2CloseoutArchive,
    auditExport,
    previousGovernanceDecisions,
    operationalPolicy: {
      finalGovernanceSignoffOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 2W creates final governance signoff and Phase 3 entry decision only. It cannot enable production inference or alter operational, inventory, accounting, invoice, ledger, report, pricing, or customer-communication behavior.",
    },
  };
};

export const recordInventoryStockoutProductionGovernanceSignoff = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionGovernanceSignoffResponse> => {
  const data = await buildInventoryStockoutProductionGovernanceSignoff(payload.importId, payload);
  const record = await recordMlProductionGovernanceSignoffDecision({
    governanceKey: CONTRACT_KEY,
    importId: data.summary.importId,
    closeoutMemoId: data.summary.closeoutMemoId,
    executionLogId: data.summary.executionLogId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    closeoutStatus: data.summary.closeoutStatus,
    finalRecommendation: data.summary.finalRecommendation,
    governanceStatus: data.summary.governanceStatus,
    implementationEntryDecision: data.summary.implementationEntryDecision,
    phase2Closed: data.summary.phase2Closed,
    readinessScorePct: data.summary.readinessScorePct,
    governanceSignoffStatus: data.summary.governanceSignoffStatus,
    boardQuorumStatus: data.summary.boardQuorumStatus,
    implementationEntryStatus: data.summary.implementationEntryStatus,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    executiveSponsor: data.summary.executiveSponsor,
    governanceOwner: data.summary.governanceOwner,
    decisionOwner: data.summary.decisionOwner,
    phase3Owner: data.summary.phase3Owner,
    rollbackOwner: data.summary.rollbackOwner,
    riskOwner: data.summary.riskOwner,
    governanceSummary: data.governanceSummary,
    signoffMatrix: data.signoffMatrix,
    implementationEntryDecisionPayload: data.implementationEntryDecision,
    phase2CloseoutArchive: data.phase2CloseoutArchive,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, governanceRecord: record };
};

export const listInventoryStockoutProductionGovernanceSignoffs = async (importIdInput: unknown) => {
  return listMlProductionGovernanceSignoffDecisionsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlProductionGovernanceSignoffCatalogSummary = async (): Promise<MlProductionGovernanceSignoffCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutProductionGovernanceSignoff(importId);
  const lastGovernanceDecisions = await listMlProductionGovernanceSignoffDecisions(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentGovernanceSignoff: current.summary,
    lastGovernanceDecisions,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
