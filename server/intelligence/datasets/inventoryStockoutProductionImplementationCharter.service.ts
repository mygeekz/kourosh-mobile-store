import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionImplementationCharters,
  listMlProductionImplementationChartersByImportId,
  listMlProductionReadinessBacklogs,
  listMlProductionReadinessBacklogsByImportId,
  listMlProductionReleaseGateSimulations,
  listMlProductionReleaseGateSimulationsByImportId,
  recordMlProductionImplementationCharter,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionImplementationCharterContract,
  InventoryStockoutProductionImplementationCharterGate,
  InventoryStockoutProductionImplementationCharterResponse,
  InventoryStockoutProductionImplementationCharterSummary,
  MlProductionImplementationCharterCatalogSummary,
  ProductionImplementationCharterRecommendation,
  ProductionImplementationCharterStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_implementation_readiness_charter_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_SIMULATION_KEY = "inventory_stockout_production_release_gate_simulation_v1" as const;
const CHARTER_SCOPE = "production_implementation_readiness_charter_only" as const;
const MIN_RELEASE_GATE_SCORE = 90;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const buildContract = (): InventoryStockoutProductionImplementationCharterContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Document the production implementation readiness charter, scope boundary, ownership model, and go/no-go rules for a separate future implementation phase without enabling production inference.",
  acceptedSimulationKey: ACCEPTED_SIMULATION_KEY,
  charterScope: CHARTER_SCOPE,
  requiredInputs: [
    "Phase 2Q release gate simulation result",
    "Phase 2P implementation backlog and risk register",
    "explicit executive sponsor and signoff owner",
    "responsibility matrix for product, engineering, QA, security, monitoring, rollback, and change management",
    "go/no-go checklist that keeps runtime integration disabled until a future approved implementation phase",
  ],
  charterRules: [
    "charter_ready requires simulation_passed and ready_for_future_implementation_scoping from Phase 2Q.",
    "readiness score must be at least 90 before a charter can be marked ready.",
    "executive sponsor, signoff owner, and implementation owners must be named before the charter is ready.",
    "the charter can only authorize future implementation scoping, not production inference or decision automation.",
  ],
  forbiddenBehavior: [
    "Do not create, expose, or enable a production inference endpoint.",
    "Do not load model artifacts, call external model services, or add Python/FastAPI/MLflow/model registry components.",
    "Do not automate purchasing, inventory, pricing, accounting, reports, invoices, ledgers, or customer communications.",
    "Do not treat charter_ready as production approval.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const charters = await listMlProductionImplementationCharters(25) as Array<Record<string, unknown>>;
  const fromCharter = charters.find((row) => asNumber(row.importId));
  if (fromCharter) return asNumber(fromCharter.importId);
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
  status: InventoryStockoutProductionImplementationCharterGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionImplementationCharterGate => ({ key, label, status, value, message });

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
};

const ownerSnapshot = (payload: Record<string, unknown>, backlog: Record<string, unknown> | null) => ({
  signoffOwner: firstText(payload.signoffOwner, payload.ownerName, payload.owner, payload.productionReadinessOwner),
  executiveSponsor: firstText(payload.executiveSponsor, payload.sponsorName),
  productOwner: firstText(payload.productOwner, backlog?.productOwner),
  engineeringOwner: firstText(payload.engineeringOwner, backlog?.engineeringOwner, payload.architectureOwner, backlog?.architectureOwner),
  qaOwner: firstText(payload.qaOwner, backlog?.qaOwner),
  securityOwner: firstText(payload.securityOwner, backlog?.securityOwner),
  monitoringOwner: firstText(payload.monitoringOwner, backlog?.monitoringOwner),
  rollbackOwner: firstText(payload.rollbackOwner, backlog?.rollbackOwner),
  changeManager: firstText(payload.changeManager, payload.releaseManager, payload.riskOwner, backlog?.riskOwner),
});

type CharterOwners = ReturnType<typeof ownerSnapshot>;

const buildScopeBoundary = (summaryHint?: Record<string, unknown>) => ({
  scope: CHARTER_SCOPE,
  allowed: [
    "future implementation phase scoping",
    "owner assignment and responsibility review",
    "go/no-go readiness review",
    "manual approval planning",
    "rollback and monitoring planning",
  ],
  explicitlyForbidden: [
    "production inference",
    "decision automation",
    "inventory purchase automation",
    "pricing automation",
    "accounting, invoice, ledger, or report calculation changes",
    "customer communication automation based on model output",
  ],
  downstreamPhaseRequiredBeforeRuntime: true,
  sourceSimulationStatus: summaryHint?.simulationStatus ?? null,
});

const buildResponsibilityMatrix = (owners: CharterOwners) => ({
  executiveSponsor: owners.executiveSponsor,
  signoffOwner: owners.signoffOwner,
  productOwner: owners.productOwner,
  engineeringOwner: owners.engineeringOwner,
  qaOwner: owners.qaOwner,
  securityOwner: owners.securityOwner,
  monitoringOwner: owners.monitoringOwner,
  rollbackOwner: owners.rollbackOwner,
  changeManager: owners.changeManager,
  requiredRoles: [
    "executiveSponsor",
    "signoffOwner",
    "productOwner",
    "engineeringOwner",
    "qaOwner",
    "securityOwner",
    "monitoringOwner",
    "rollbackOwner",
    "changeManager",
  ],
});

const buildGoNoGoChecklist = (args: {
  latestSimulation: Record<string, unknown> | null;
  latestBacklog: Record<string, unknown> | null;
  owners: CharterOwners;
}) => {
  const simulationStatus = normalizeText(args.latestSimulation?.simulationStatus);
  const simulatedGate = normalizeText(args.latestSimulation?.simulatedReleaseGateStatus);
  const readinessScore = asNumber(args.latestSimulation?.readinessScorePct) ?? 0;
  const ownerValues = Object.values(args.owners);
  return [
    {
      key: "release_gate_simulation_passed",
      status: simulationStatus === "simulation_passed" ? "pass" : "block",
      message: "Phase 2Q release gate simulation must pass before implementation charter can be ready.",
    },
    {
      key: "future_scoping_only",
      status: simulatedGate === "ready_for_future_implementation_scoping" ? "pass" : "block",
      message: "The only allowed downstream action is future implementation scoping.",
    },
    {
      key: "readiness_score_threshold",
      status: readinessScore >= MIN_RELEASE_GATE_SCORE ? "pass" : "warning",
      value: readinessScore,
      message: `Release gate readiness score should be at least ${MIN_RELEASE_GATE_SCORE} before charter signoff.`,
    },
    {
      key: "owner_matrix_named",
      status: ownerValues.every(Boolean) ? "pass" : "block",
      value: ownerValues.filter(Boolean).length,
      message: "All charter owners must be explicitly named.",
    },
    {
      key: "backlog_ready_traceable",
      status: normalizeText(args.latestBacklog?.backlogStatus) === "backlog_ready" ? "pass" : "warning",
      message: "Production-readiness backlog should remain traceable and ready.",
    },
    {
      key: "no_runtime_authorization",
      status: "pass",
      value: false,
      message: "The charter explicitly forbids production runtime authorization in this phase.",
    },
    {
      key: "financial_truth_protected",
      status: "pass",
      value: false,
      message: "The charter forbids inventory/accounting/report calculation changes.",
    },
  ];
};

const buildCharterGates = (args: {
  latestSimulation: Record<string, unknown> | null;
  latestBacklog: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  owners: CharterOwners;
}): InventoryStockoutProductionImplementationCharterGate[] => {
  const simulationStatus = normalizeText(args.latestSimulation?.simulationStatus);
  const simulatedGate = normalizeText(args.latestSimulation?.simulatedReleaseGateStatus);
  const readinessScore = asNumber(args.latestSimulation?.readinessScorePct) ?? 0;
  const ownerMatrixComplete = boolValue(args.latestBacklog?.ownerMatrixComplete);
  const ownersMissing = Object.entries(args.owners).filter(([, value]) => !value).map(([key]) => key);

  return [
    buildGate(
      "release_gate_simulation_exists",
      "Phase 2Q simulation exists",
      args.latestSimulation ? "pass" : "block",
      args.latestSimulation?.id ?? null,
      args.latestSimulation ? "Release gate simulation record is traceable." : "Phase 2Q simulation is required before an implementation charter.",
    ),
    buildGate(
      "simulation_passed",
      "Simulation passed",
      simulationStatus === "simulation_passed" ? "pass" : simulationStatus ? "warning" : "block",
      simulationStatus,
      simulationStatus === "simulation_passed" ? "Simulation passed." : "Release gate simulation must pass before charter readiness.",
    ),
    buildGate(
      "future_implementation_scoping_only",
      "Future implementation scoping only",
      simulatedGate === "ready_for_future_implementation_scoping" ? "pass" : simulatedGate ? "warning" : "block",
      simulatedGate,
      simulatedGate === "ready_for_future_implementation_scoping" ? "Simulation only allows future implementation scoping." : "Simulation must only allow future implementation scoping.",
    ),
    buildGate(
      "readiness_score_threshold",
      "Release readiness score threshold",
      readinessScore >= MIN_RELEASE_GATE_SCORE ? "pass" : readinessScore > 0 ? "warning" : "block",
      readinessScore,
      readinessScore >= MIN_RELEASE_GATE_SCORE ? "Readiness score meets charter threshold." : `Readiness score should be at least ${MIN_RELEASE_GATE_SCORE}.`,
    ),
    buildGate(
      "backlog_owner_matrix_complete",
      "Backlog owner matrix complete",
      ownerMatrixComplete ? "pass" : "warning",
      ownerMatrixComplete,
      ownerMatrixComplete ? "Backlog owner matrix is complete." : "Backlog owner matrix should be complete and traceable.",
    ),
    buildGate(
      "charter_owners_named",
      "Charter owners named",
      ownersMissing.length === 0 ? "pass" : "block",
      { missing: ownersMissing },
      ownersMissing.length === 0 ? "All charter owners are named." : `Missing charter owners: ${ownersMissing.join(", ")}.`,
    ),
    buildGate(
      "model_import_traceable",
      "Model import audit traceable",
      args.modelImport ? "pass" : "block",
      args.modelImport?.id ?? null,
      args.modelImport ? "External model import audit is traceable." : "Model import audit record is required.",
    ),
    buildGate(
      "scope_boundary_defined",
      "Scope boundary defined",
      "pass",
      CHARTER_SCOPE,
      "Scope boundary is explicit and excludes production inference and decision automation.",
    ),
    buildGate(
      "go_no_go_checklist_defined",
      "Go/no-go checklist defined",
      "pass",
      true,
      "Go/no-go checklist is generated for future implementation planning only.",
    ),
    buildGate(
      "no_production_runtime_enabled",
      "No production runtime enabled",
      "pass",
      false,
      "This phase does not enable production inference, runtime integration, or model execution.",
    ),
    buildGate(
      "financial_truth_protected",
      "Inventory/accounting truth protected",
      "pass",
      false,
      "No inventory, accounting, invoice, ledger, pricing, report, or customer-message calculation is changed.",
    ),
  ];
};

const summarizeGates = (gates: InventoryStockoutProductionImplementationCharterGate[]) => {
  const blockers = gates.filter((gate) => gate.status === "block").map((gate) => gate.message);
  const warnings = gates.filter((gate) => gate.status === "warning").map((gate) => gate.message);
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 10000) / 100 : 0;
  return { blockers, warnings, passCount, totalGateCount, readinessScorePct };
};

const determineStatus = (args: {
  hasSimulation: boolean;
  simulationStatus: string | null;
  blockers: string[];
  warnings: string[];
  owners: CharterOwners;
}): ProductionImplementationCharterStatus => {
  if (!args.hasSimulation) return "not_started";
  if (args.simulationStatus !== "simulation_passed") return "needs_release_gate_simulation";
  if (!args.owners.signoffOwner || !args.owners.executiveSponsor) return "needs_owner_signoff";
  if (args.blockers.length) return "blocked";
  if (args.warnings.length) return "needs_scope_review";
  return "charter_ready";
};

const determineRecommendation = (status: ProductionImplementationCharterStatus): ProductionImplementationCharterRecommendation => {
  if (status === "charter_ready") return "prepare_future_implementation_plan";
  if (status === "needs_owner_signoff") return "complete_owner_signoff";
  if (status === "needs_release_gate_simulation" || status === "not_started") return "complete_release_gate_simulation";
  if (status === "needs_scope_review") return "complete_scope_boundary";
  return "blocked";
};

const buildRecommendedNextAction = (summary: InventoryStockoutProductionImplementationCharterSummary): string => {
  if (summary.charterStatus === "charter_ready") return "implementation charter آماده است؛ فقط می‌توان scope فاز implementation آینده را شروع کرد و هنوز production inference مجاز نیست.";
  if (summary.charterStatus === "needs_owner_signoff") return "executive sponsor و signoff owner را ثبت کن تا charter قابل آماده‌سازی شود.";
  if (summary.charterStatus === "needs_release_gate_simulation") return "ابتدا Phase 2Q release gate simulation را با وضعیت simulation_passed ثبت کن.";
  if (summary.charterStatus === "needs_scope_review") return "scope boundary و go/no-go checklist را review کن و warningها را رفع کن.";
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.warnings.length) return summary.warnings[0];
  return "برای شروع charter، import و release gate simulation لازم است.";
};

const buildCharterDocument = (summary: InventoryStockoutProductionImplementationCharterSummary, scopeBoundary: Record<string, unknown>, responsibilityMatrix: Record<string, unknown>, goNoGoChecklist: Array<Record<string, unknown>>) => ({
  title: "Production Implementation Readiness Charter",
  generatedAt: summary.generatedAt,
  charterKey: summary.charterKey,
  model: {
    importId: summary.importId,
    modelKey: summary.modelKey,
    modelVersion: summary.modelVersion,
  },
  scopeBoundary,
  responsibilityMatrix,
  goNoGoChecklist,
  goNoGoOutcome: {
    charterStatus: summary.charterStatus,
    goNoGoStatus: summary.goNoGoStatus,
    recommendation: summary.recommendation,
  },
  operationalBoundary: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildAuditExport = (summary: InventoryStockoutProductionImplementationCharterSummary, gates: InventoryStockoutProductionImplementationCharterGate[]) => ({
  auditKey: `${CONTRACT_KEY}:audit`,
  generatedAt: summary.generatedAt,
  importId: summary.importId,
  simulationId: summary.simulationId,
  backlogId: summary.backlogId,
  status: summary.charterStatus,
  recommendation: summary.recommendation,
  readinessScorePct: summary.readinessScorePct,
  blockers: summary.blockers,
  warnings: summary.warnings,
  passedGates: gates.filter((gate) => gate.status === "pass").map((gate) => gate.key),
  blockedGates: gates.filter((gate) => gate.status === "block").map((gate) => gate.key),
  warningGates: gates.filter((gate) => gate.status === "warning").map((gate) => gate.key),
  policy: buildContract().operationalPolicy,
});

export const buildInventoryStockoutProductionImplementationCharterContract = buildContract;

export const buildInventoryStockoutProductionImplementationCharter = async (
  importIdInput?: unknown,
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionImplementationCharterResponse> => {
  const importId = asNumber(importIdInput) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const simulations = importId ? await listMlProductionReleaseGateSimulationsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestSimulation = simulations[0] || null;
  const backlogs = importId ? await listMlProductionReadinessBacklogsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestBacklog = backlogs[0] || null;
  const previousCharters = importId ? await listMlProductionImplementationChartersByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const owners = ownerSnapshot(payload, latestBacklog);
  const charterGates = buildCharterGates({ latestSimulation, latestBacklog, modelImport, owners });
  const gateSummary = summarizeGates(charterGates);
  const simulationStatus = normalizeText(latestSimulation?.simulationStatus);
  const charterStatus = determineStatus({
    hasSimulation: Boolean(latestSimulation),
    simulationStatus,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    owners,
  });
  const scopeBoundary = buildScopeBoundary({ simulationStatus });
  const responsibilityMatrix = buildResponsibilityMatrix(owners);
  const goNoGoChecklist = buildGoNoGoChecklist({ latestSimulation, latestBacklog, owners });
  const summary: InventoryStockoutProductionImplementationCharterSummary = {
    charterKey: CONTRACT_KEY,
    generatedAt: new Date().toISOString(),
    importId,
    simulationId: asNumber(latestSimulation?.id),
    backlogId: asNumber(latestSimulation?.backlogId || latestBacklog?.id),
    modelKey: normalizeText(modelImport?.modelKey || latestSimulation?.modelKey || latestBacklog?.modelKey),
    modelVersion: normalizeText(modelImport?.modelVersion || latestSimulation?.modelVersion || latestBacklog?.modelVersion),
    simulationStatus,
    simulatedReleaseGateStatus: normalizeText(latestSimulation?.simulatedReleaseGateStatus),
    charterStatus,
    recommendation: determineRecommendation(charterStatus),
    readinessScorePct: asNumber(latestSimulation?.readinessScorePct) ?? gateSummary.readinessScorePct,
    scopeBoundaryStatus: gateSummary.blockers.some((message) => message.includes("Scope")) ? "blocked" : gateSummary.warnings.length ? "needs_review" : "defined",
    ownerMatrixStatus: Object.values(owners).every(Boolean) ? "complete" : "incomplete",
    goNoGoStatus: charterStatus === "charter_ready" ? "ready_for_future_planning" : gateSummary.blockers.length ? "blocked" : "needs_review",
    blockerCount: gateSummary.blockers.length,
    warningCount: gateSummary.warnings.length,
    passCount: gateSummary.passCount,
    totalGateCount: gateSummary.totalGateCount,
    signoffOwner: owners.signoffOwner,
    executiveSponsor: owners.executiveSponsor,
    productOwner: owners.productOwner,
    engineeringOwner: owners.engineeringOwner,
    qaOwner: owners.qaOwner,
    securityOwner: owners.securityOwner,
    monitoringOwner: owners.monitoringOwner,
    rollbackOwner: owners.rollbackOwner,
    changeManager: owners.changeManager,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    charterGates,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    recommendedNextAction: "",
  };
  summary.recommendedNextAction = buildRecommendedNextAction(summary);
  const charterDocument = buildCharterDocument(summary, scopeBoundary, responsibilityMatrix, goNoGoChecklist);
  return {
    generatedAt: summary.generatedAt,
    contract: buildContract(),
    summary,
    latestSimulation,
    latestBacklog,
    scopeBoundary,
    responsibilityMatrix,
    goNoGoChecklist,
    charterDocument,
    auditExport: buildAuditExport(summary, charterGates),
    previousCharters,
    operationalPolicy: {
      implementationCharterOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Production implementation readiness charter is a planning/audit artifact only and cannot enable production inference or operational automation.",
    },
  };
};

export const recordInventoryStockoutProductionImplementationCharter = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutProductionImplementationCharterResponse> => {
  const response = await buildInventoryStockoutProductionImplementationCharter(payload.importId, payload);
  const record = await recordMlProductionImplementationCharter({
    charterKey: response.summary.charterKey,
    importId: response.summary.importId,
    simulationId: response.summary.simulationId,
    backlogId: response.summary.backlogId,
    modelKey: response.summary.modelKey,
    modelVersion: response.summary.modelVersion,
    simulationStatus: response.summary.simulationStatus,
    simulatedReleaseGateStatus: response.summary.simulatedReleaseGateStatus,
    charterStatus: response.summary.charterStatus,
    recommendation: response.summary.recommendation,
    readinessScorePct: response.summary.readinessScorePct,
    scopeBoundaryStatus: response.summary.scopeBoundaryStatus,
    ownerMatrixStatus: response.summary.ownerMatrixStatus,
    goNoGoStatus: response.summary.goNoGoStatus,
    blockerCount: response.summary.blockerCount,
    warningCount: response.summary.warningCount,
    passCount: response.summary.passCount,
    totalGateCount: response.summary.totalGateCount,
    signoffOwner: response.summary.signoffOwner,
    executiveSponsor: response.summary.executiveSponsor,
    productOwner: response.summary.productOwner,
    engineeringOwner: response.summary.engineeringOwner,
    qaOwner: response.summary.qaOwner,
    securityOwner: response.summary.securityOwner,
    monitoringOwner: response.summary.monitoringOwner,
    rollbackOwner: response.summary.rollbackOwner,
    changeManager: response.summary.changeManager,
    charter: response.charterDocument,
    scopeBoundary: response.scopeBoundary,
    responsibilityMatrix: response.responsibilityMatrix,
    goNoGoChecklist: response.goNoGoChecklist,
    auditExport: response.auditExport,
    summary: response.summary as unknown as Record<string, unknown>,
    policy: response.contract.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, charterRecord: record || null };
};

export const listInventoryStockoutProductionImplementationCharters = async (importIdInput: unknown) => {
  return listMlProductionImplementationChartersByImportId(importIdInput, 50);
};

export const buildMlProductionImplementationCharterCatalogSummary = async (): Promise<MlProductionImplementationCharterCatalogSummary> => {
  const currentCharter = await buildInventoryStockoutProductionImplementationCharter();
  const lastCharters = await listMlProductionImplementationCharters(10) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentCharter: currentCharter.summary,
    lastCharters,
    recommendedNextAction: currentCharter.summary.recommendedNextAction,
  };
};
