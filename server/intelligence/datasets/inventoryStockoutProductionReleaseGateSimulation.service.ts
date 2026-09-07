import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionReadinessBacklogs,
  listMlProductionReadinessBacklogsByImportId,
  listMlProductionReleaseGateSimulations,
  listMlProductionReleaseGateSimulationsByImportId,
  recordMlProductionReleaseGateSimulation,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionReleaseGateSimulationContract,
  InventoryStockoutProductionReleaseGateSimulationGate,
  InventoryStockoutProductionReleaseGateSimulationResponse,
  InventoryStockoutProductionReleaseGateSimulationSummary,
  MlProductionReleaseGateSimulationCatalogSummary,
  ProductionReleaseGateSimulationRecommendation,
  ProductionReleaseGateSimulationStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_release_gate_simulation_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_BACKLOG_KEY = "inventory_stockout_production_readiness_backlog_risk_register_v1" as const;
const SIMULATION_SCOPE = "production_readiness_release_gate_simulation_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const buildContract = (): InventoryStockoutProductionReleaseGateSimulationContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Simulate whether the production-readiness backlog, risk register, owner matrix, and safety checklist are sufficient to scope a separate future implementation phase.",
  acceptedBacklogKey: ACCEPTED_BACKLOG_KEY,
  simulationScope: SIMULATION_SCOPE,
  requiredInputs: [
    "production-readiness backlog from Phase 2P",
    "risk register with owners and mitigation status",
    "owner matrix for architecture, product, engineering, QA, security, monitoring, rollback, and risk",
    "release gate checklist with no runtime or operational-change authorization",
  ],
  simulationRules: [
    "simulation_passed requires backlog_ready status and ready_for_future_phase_scoping release gate status.",
    "owner matrix must be complete before the release gate can pass simulation.",
    "risk register must be ready and all blockers must be closed before the release gate can pass simulation.",
    "The simulation can only recommend a future implementation scoping phase; it cannot authorize production inference.",
  ],
  forbiddenBehavior: [
    "Do not create or enable a production inference endpoint.",
    "Do not load model artifacts, call external model services, or add Python/FastAPI/MLflow/model registry components.",
    "Do not automate purchasing, inventory, pricing, accounting, reports, invoices, ledgers, or customer communications.",
    "Do not treat simulation_passed as production approval.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const simulations = await listMlProductionReleaseGateSimulations(25) as Array<Record<string, unknown>>;
  const fromSimulation = simulations.find((row) => asNumber(row.importId));
  if (fromSimulation) return asNumber(fromSimulation.importId);
  const backlogs = await listMlProductionReadinessBacklogs(25) as Array<Record<string, unknown>>;
  const fromBacklog = backlogs.find((row) => asNumber(row.importId));
  if (fromBacklog) return asNumber(fromBacklog.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutProductionReleaseGateSimulationGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionReleaseGateSimulationGate => ({ key, label, status, value, message });

const getReleaseGateChecklist = (backlog: Record<string, unknown> | null): Array<Record<string, unknown>> => {
  return parseJson<Array<Record<string, unknown>>>(backlog?.releaseGateChecklistJson, []);
};

const getRiskRegister = (backlog: Record<string, unknown> | null): Array<Record<string, unknown>> => {
  return parseJson<Array<Record<string, unknown>>>(backlog?.riskRegisterJson, []);
};

const buildSimulationGates = (args: {
  backlog: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  releaseGateChecklist: Array<Record<string, unknown>>;
  riskRegister: Array<Record<string, unknown>>;
}): InventoryStockoutProductionReleaseGateSimulationGate[] => {
  const backlogStatus = normalizeText(args.backlog?.backlogStatus);
  const releaseGateStatus = normalizeText(args.backlog?.releaseGateStatus);
  const ownerMatrixComplete = boolValue(args.backlog?.ownerMatrixComplete);
  const riskRegisterStatus = normalizeText(args.backlog?.riskRegisterStatus);
  const totalBacklogItems = asNumber(args.backlog?.totalBacklogItems) ?? 0;
  const readyBacklogItems = asNumber(args.backlog?.readyBacklogItems) ?? 0;
  const openBlockerCount = asNumber(args.backlog?.openBlockerCount) ?? 0;
  const highRiskCount = asNumber(args.backlog?.highRiskCount) ?? 0;
  const checklistBlocks = args.releaseGateChecklist.filter((item) => normalizeText(item.status) === "block").length;
  const riskOwnersMissing = args.riskRegister.filter((risk) => normalizeText(risk.status) === "owner_required").length;

  return [
    buildGate(
      "backlog_exists",
      "Production-readiness backlog exists",
      args.backlog ? "pass" : "block",
      args.backlog?.id ?? null,
      args.backlog ? "Backlog record exists for release gate simulation." : "Production-readiness backlog is required before simulation.",
    ),
    buildGate(
      "backlog_ready",
      "Backlog status is ready",
      backlogStatus === "backlog_ready" ? "pass" : backlogStatus ? "warning" : "block",
      backlogStatus,
      backlogStatus === "backlog_ready" ? "Backlog is ready for future phase scoping." : "Backlog must be backlog_ready before simulation can pass.",
    ),
    buildGate(
      "release_gate_ready_for_scoping",
      "Release gate status allows future scoping",
      releaseGateStatus === "ready_for_future_phase_scoping" ? "pass" : releaseGateStatus ? "warning" : "block",
      releaseGateStatus,
      releaseGateStatus === "ready_for_future_phase_scoping" ? "Release gate is ready for future implementation scoping." : "Release gate must be ready_for_future_phase_scoping before simulation can pass.",
    ),
    buildGate(
      "owner_matrix_complete",
      "Owner matrix complete",
      ownerMatrixComplete ? "pass" : "block",
      ownerMatrixComplete,
      ownerMatrixComplete ? "All required owners are assigned." : "Owner matrix must be complete before release gate simulation can pass.",
    ),
    buildGate(
      "risk_register_ready",
      "Risk register ready",
      riskRegisterStatus === "ready" ? "pass" : riskRegisterStatus === "review_required" ? "warning" : "block",
      riskRegisterStatus,
      riskRegisterStatus === "ready" ? "Risk register is ready." : "Risk register must be ready with owner/mitigation coverage.",
    ),
    buildGate(
      "backlog_items_ready",
      "Backlog items ready",
      totalBacklogItems > 0 && readyBacklogItems >= totalBacklogItems ? "pass" : totalBacklogItems > 0 ? "warning" : "block",
      `${readyBacklogItems}/${totalBacklogItems}`,
      totalBacklogItems > 0 && readyBacklogItems >= totalBacklogItems ? "All backlog items are ready for future scoping." : "Backlog items are not fully ready yet.",
    ),
    buildGate(
      "no_open_blockers",
      "No open blockers",
      openBlockerCount === 0 ? "pass" : "block",
      openBlockerCount,
      openBlockerCount === 0 ? "No open blockers are recorded." : "Open blockers must be resolved before release gate simulation can pass.",
    ),
    buildGate(
      "high_risks_have_mitigation",
      "High risks have mitigation coverage",
      highRiskCount > 0 && riskOwnersMissing === 0 ? "pass" : riskOwnersMissing > 0 ? "block" : "warning",
      { highRiskCount, riskOwnersMissing },
      highRiskCount > 0 && riskOwnersMissing === 0 ? "High-risk items have mitigation owners." : "High-risk items need explicit owners and mitigation coverage.",
    ),
    buildGate(
      "release_gate_checklist_clean",
      "Release gate checklist has no blocking items",
      checklistBlocks === 0 && args.releaseGateChecklist.length > 0 ? "pass" : checklistBlocks > 0 ? "block" : "warning",
      { checklistItems: args.releaseGateChecklist.length, checklistBlocks },
      checklistBlocks === 0 && args.releaseGateChecklist.length > 0 ? "Release gate checklist has no blocking items." : "Release gate checklist must exist and contain no blocking items.",
    ),
    buildGate(
      "model_import_traceable",
      "Model import audit traceable",
      args.modelImport ? "pass" : "block",
      args.modelImport?.id ?? null,
      args.modelImport ? "External model import audit record is traceable." : "A model import audit record is required for simulation traceability.",
    ),
    buildGate(
      "no_production_runtime_enabled",
      "No production runtime enabled",
      "pass",
      false,
      "This phase does not enable production inference, runtime integration, or decision automation.",
    ),
    buildGate(
      "financial_truth_protected",
      "Inventory/accounting truth protected",
      "pass",
      false,
      "This phase cannot change inventory, accounting, invoice, ledger, pricing, or report truth.",
    ),
  ];
};

const summarizeGates = (gates: InventoryStockoutProductionReleaseGateSimulationGate[]) => {
  const blockers = gates.filter((gate) => gate.status === "block").map((gate) => gate.message);
  const warnings = gates.filter((gate) => gate.status === "warning").map((gate) => gate.message);
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 10000) / 100 : 0;
  return { blockers, warnings, passCount, totalGateCount, readinessScorePct };
};

const determineStatus = (args: {
  hasBacklog: boolean;
  backlogStatus: string | null;
  riskRegisterStatus: string | null;
  blockers: string[];
  warnings: string[];
}): ProductionReleaseGateSimulationStatus => {
  if (!args.hasBacklog) return "not_started";
  if (args.blockers.length) {
    if (args.riskRegisterStatus !== "ready") return "needs_risk_review";
    if (args.backlogStatus !== "backlog_ready") return "needs_backlog_work";
    return "blocked";
  }
  if (args.warnings.length) {
    if (args.riskRegisterStatus !== "ready") return "needs_risk_review";
    return "needs_backlog_work";
  }
  return "simulation_passed";
};

const determineRecommendation = (status: ProductionReleaseGateSimulationStatus): ProductionReleaseGateSimulationRecommendation => {
  if (status === "simulation_passed") return "scope_future_implementation_phase";
  if (status === "needs_backlog_work") return "complete_backlog_release_gate";
  if (status === "needs_risk_review") return "complete_risk_register";
  return "blocked";
};

const buildRecommendedNextAction = (summary: InventoryStockoutProductionReleaseGateSimulationSummary): string => {
  if (summary.simulationStatus === "simulation_passed") return "release gate simulation پاس شد؛ فقط می‌توان فاز implementation آینده را scope کرد و هنوز production inference مجاز نیست.";
  if (summary.simulationStatus === "needs_backlog_work") return "backlog و release gate checklist را کامل کن و دوباره simulation بگیر.";
  if (summary.simulationStatus === "needs_risk_review") return "risk register، mitigation و owner coverage را کامل کن و release gate simulation را تکرار کن.";
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.warnings.length) return summary.warnings[0];
  return "ابتدا production-readiness backlog فاز 2P را ثبت کن.";
};

const buildSimulationReport = (summary: InventoryStockoutProductionReleaseGateSimulationSummary, gates: InventoryStockoutProductionReleaseGateSimulationGate[]) => ({
  title: "Production Readiness Release Gate Simulation",
  scope: SIMULATION_SCOPE,
  generatedAt: summary.generatedAt,
  model: {
    importId: summary.importId,
    modelKey: summary.modelKey,
    modelVersion: summary.modelVersion,
  },
  outcome: {
    simulationStatus: summary.simulationStatus,
    simulatedReleaseGateStatus: summary.simulatedReleaseGateStatus,
    readinessScorePct: summary.readinessScorePct,
    recommendation: summary.recommendation,
  },
  gateBreakdown: gates.map((gate) => ({ key: gate.key, status: gate.status, message: gate.message, value: gate.value ?? null })),
  boundary: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildAuditExport = (summary: InventoryStockoutProductionReleaseGateSimulationSummary, gates: InventoryStockoutProductionReleaseGateSimulationGate[]) => ({
  auditKey: `${CONTRACT_KEY}:audit`,
  generatedAt: summary.generatedAt,
  importId: summary.importId,
  backlogId: summary.backlogId,
  designSpecId: summary.designSpecId,
  status: summary.simulationStatus,
  score: summary.readinessScorePct,
  blockers: summary.blockers,
  warnings: summary.warnings,
  passedGates: gates.filter((gate) => gate.status === "pass").map((gate) => gate.key),
  blockedGates: gates.filter((gate) => gate.status === "block").map((gate) => gate.key),
  warningGates: gates.filter((gate) => gate.status === "warning").map((gate) => gate.key),
  policy: buildContract().operationalPolicy,
});

export const buildInventoryStockoutProductionReleaseGateSimulationContract = buildContract;

export const buildInventoryStockoutProductionReleaseGateSimulation = async (
  importIdInput?: unknown,
): Promise<InventoryStockoutProductionReleaseGateSimulationResponse> => {
  const importId = asNumber(importIdInput) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const backlogs = importId ? await listMlProductionReadinessBacklogsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestBacklog = backlogs[0] || null;
  const previousSimulations = importId ? await listMlProductionReleaseGateSimulationsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const releaseGateChecklist = getReleaseGateChecklist(latestBacklog);
  const riskRegister = getRiskRegister(latestBacklog);
  const gates = buildSimulationGates({ backlog: latestBacklog, modelImport, releaseGateChecklist, riskRegister });
  const gateSummary = summarizeGates(gates);
  const backlogStatus = normalizeText(latestBacklog?.backlogStatus);
  const riskRegisterStatus = normalizeText(latestBacklog?.riskRegisterStatus);
  const simulationStatus = determineStatus({
    hasBacklog: Boolean(latestBacklog),
    backlogStatus,
    riskRegisterStatus,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
  });
  const summary: InventoryStockoutProductionReleaseGateSimulationSummary = {
    simulationKey: CONTRACT_KEY,
    generatedAt: new Date().toISOString(),
    importId,
    backlogId: asNumber(latestBacklog?.id),
    designSpecId: asNumber(latestBacklog?.designSpecId),
    modelKey: normalizeText(modelImport?.modelKey || latestBacklog?.modelKey),
    modelVersion: normalizeText(modelImport?.modelVersion || latestBacklog?.modelVersion),
    backlogStatus,
    backlogReleaseGateStatus: normalizeText(latestBacklog?.releaseGateStatus),
    simulationStatus,
    simulatedReleaseGateStatus: simulationStatus === "simulation_passed" ? "ready_for_future_implementation_scoping" : gateSummary.blockers.length ? "blocked" : "not_ready",
    recommendation: determineRecommendation(simulationStatus),
    readinessScorePct: gateSummary.readinessScorePct,
    ownerMatrixComplete: boolValue(latestBacklog?.ownerMatrixComplete),
    riskRegisterStatus: riskRegisterStatus || "draft",
    releaseGateChecklistStatus: gateSummary.blockers.length ? "blocked" : gateSummary.warnings.length ? "review_required" : "ready",
    blockerCount: gateSummary.blockers.length,
    warningCount: gateSummary.warnings.length,
    passCount: gateSummary.passCount,
    totalGateCount: gateSummary.totalGateCount,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    gateResults: gates,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    recommendedNextAction: "",
  };
  summary.recommendedNextAction = buildRecommendedNextAction(summary);
  return {
    generatedAt: summary.generatedAt,
    contract: buildContract(),
    summary,
    latestBacklog,
    releaseGateChecklist,
    riskRegister,
    simulationReport: buildSimulationReport(summary, gates),
    auditExport: buildAuditExport(summary, gates),
    previousSimulations,
    operationalPolicy: {
      releaseGateSimulationOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Release gate simulation is an audit/planning artifact only and cannot enable production inference or operational automation.",
    },
  };
};

export const recordInventoryStockoutProductionReleaseGateSimulation = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutProductionReleaseGateSimulationResponse> => {
  const response = await buildInventoryStockoutProductionReleaseGateSimulation(payload.importId);
  const record = await recordMlProductionReleaseGateSimulation({
    simulationKey: response.summary.simulationKey,
    importId: response.summary.importId,
    backlogId: response.summary.backlogId,
    designSpecId: response.summary.designSpecId,
    modelKey: response.summary.modelKey,
    modelVersion: response.summary.modelVersion,
    backlogStatus: response.summary.backlogStatus,
    backlogReleaseGateStatus: response.summary.backlogReleaseGateStatus,
    simulatedReleaseGateStatus: response.summary.simulatedReleaseGateStatus,
    simulationStatus: response.summary.simulationStatus,
    recommendation: response.summary.recommendation,
    readinessScorePct: response.summary.readinessScorePct,
    ownerMatrixComplete: response.summary.ownerMatrixComplete,
    riskRegisterStatus: response.summary.riskRegisterStatus,
    releaseGateChecklistStatus: response.summary.releaseGateChecklistStatus,
    blockerCount: response.summary.blockerCount,
    warningCount: response.summary.warningCount,
    passCount: response.summary.passCount,
    totalGateCount: response.summary.totalGateCount,
    simulation: response.simulationReport,
    gateResults: response.summary.gateResults as unknown as Array<Record<string, unknown>>,
    auditExport: response.auditExport,
    summary: response.summary as unknown as Record<string, unknown>,
    policy: response.contract.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, simulationRecord: record || null };
};

export const listInventoryStockoutProductionReleaseGateSimulations = async (importIdInput: unknown) => {
  return listMlProductionReleaseGateSimulationsByImportId(importIdInput, 50);
};

export const buildMlProductionReleaseGateSimulationCatalogSummary = async (): Promise<MlProductionReleaseGateSimulationCatalogSummary> => {
  const currentSimulation = await buildInventoryStockoutProductionReleaseGateSimulation();
  const lastSimulations = await listMlProductionReleaseGateSimulations(10) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentSimulation: currentSimulation.summary,
    lastSimulations,
    recommendedNextAction: currentSimulation.summary.recommendedNextAction,
  };
};
