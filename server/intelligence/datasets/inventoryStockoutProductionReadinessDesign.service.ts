import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlOfflinePilotCloseouts,
  listMlOfflinePilotCloseoutsByImportId,
  listMlProductionReadinessDesignSpecs,
  listMlProductionReadinessDesignSpecsByImportId,
  recordMlProductionReadinessDesignSpec,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionReadinessDesignContract,
  InventoryStockoutProductionReadinessDesignResponse,
  InventoryStockoutProductionReadinessDesignSafetyGate,
  InventoryStockoutProductionReadinessDesignSummary,
  MlProductionReadinessDesignCatalogSummary,
  ProductionReadinessDesignRecommendation,
  ProductionReadinessDesignStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_readiness_design_spec_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_CLOSEOUT_KEY = "inventory_stockout_offline_pilot_closeout_v1" as const;
const DESIGN_SCOPE = "production_readiness_design_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const buildContract = (): InventoryStockoutProductionReadinessDesignContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Design the future production-readiness architecture, safety gates, rollout/rollback boundaries, monitoring plan, and approval contract for a previously closed offline inventory stockout pilot without enabling live inference or operational automation.",
  acceptedCloseoutKey: ACCEPTED_CLOSEOUT_KEY,
  designScope: DESIGN_SCOPE,
  requiredInputs: [
    "model result import audit record",
    "offline pilot closeout record",
    "production-readiness owner from closeout",
    "closeout risk signoff and audit export",
    "latest KPI/review evidence retained by closeout",
  ],
  requiredArchitectureSections: [
    "future inference boundary design",
    "human approval and manual override gate",
    "baseline fallback architecture",
    "monitoring and drift checks",
    "rollback and incident response path",
    "data governance and audit retention plan",
    "security/privacy review checklist",
    "canary/pilot rollout preconditions",
  ],
  safetyGateRules: [
    "design_ready requires a closeout_ready offline pilot closeout with production-readiness preconditions met.",
    "production-readiness design must keep productionIntegrationAllowed, inferenceRuntimeEnabled, and decisionAutomationAllowed false.",
    "future production enablement must be implemented as a separate phase with explicit approvals and a separate runtime design.",
    "baseline fallback must remain available and documented before any future production pilot can be considered.",
  ],
  forbiddenBehavior: [
    "Do not run model code inside Kourosh from this design spec.",
    "Do not create live inference endpoints.",
    "Do not change purchasing, inventory, pricing, accounting, invoices, ledgers, reports, or customer communications.",
    "Do not silently promote any external model to production.",
    "Do not remove the existing rule/statistical baseline fallback.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const closeouts = await listMlOfflinePilotCloseouts(25) as Array<Record<string, unknown>>;
  const fromCloseout = closeouts.find((row) => asNumber(row.importId));
  if (fromCloseout) return asNumber(fromCloseout.importId);
  const designs = await listMlProductionReadinessDesignSpecs(25) as Array<Record<string, unknown>>;
  const fromDesign = designs.find((row) => asNumber(row.importId));
  if (fromDesign) return asNumber(fromDesign.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutProductionReadinessDesignSafetyGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionReadinessDesignSafetyGate => ({ key, label, status, value, message });

const buildSafetyGates = (args: {
  modelImport: Record<string, unknown> | null;
  closeout: Record<string, unknown> | null;
  architectureOwner: string | null;
  securityReviewOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  manualOverrideOwner: string | null;
}): InventoryStockoutProductionReadinessDesignSafetyGate[] => {
  const closeoutStatus = normalizeText(args.closeout?.closeoutStatus);
  const preconditionsMet = boolValue(args.closeout?.productionReadinessPreconditionsMet);
  const closeoutOwner = normalizeText(args.closeout?.productionReadinessOwner);
  const ownerSignoff = boolValue(args.closeout?.ownerSignoff);
  const rollbackStatus = normalizeText(args.closeout?.rollbackStatus, "not_required");
  return [
    buildGate(
      "offline_closeout_ready",
      "Offline closeout ready",
      closeoutStatus === "closeout_ready" ? "pass" : closeoutStatus ? "warning" : "block",
      closeoutStatus,
      closeoutStatus === "closeout_ready" ? "Offline pilot closeout supports design-only production-readiness planning." : "Offline pilot closeout is not ready yet.",
    ),
    buildGate(
      "closeout_preconditions_met",
      "Closeout preconditions met",
      preconditionsMet ? "pass" : "block",
      preconditionsMet,
      preconditionsMet ? "Production-readiness preconditions were met at closeout." : "Closeout preconditions must be met before design-ready status.",
    ),
    buildGate(
      "closeout_owner_signoff",
      "Closeout owner signoff",
      ownerSignoff ? "pass" : "block",
      ownerSignoff,
      ownerSignoff ? "Closeout owner signoff is recorded." : "Closeout owner signoff is required.",
    ),
    buildGate(
      "production_readiness_owner_inherited",
      "Production-readiness owner inherited",
      closeoutOwner ? "pass" : "block",
      closeoutOwner,
      closeoutOwner ? "Closeout names a production-readiness owner." : "A named production-readiness owner is required.",
    ),
    buildGate(
      "architecture_owner_named",
      "Architecture owner named",
      args.architectureOwner ? "pass" : "block",
      args.architectureOwner,
      args.architectureOwner ? "Architecture owner is named for future implementation design." : "A named architecture owner is required.",
    ),
    buildGate(
      "security_review_owner_named",
      "Security/privacy owner named",
      args.securityReviewOwner ? "pass" : "block",
      args.securityReviewOwner,
      args.securityReviewOwner ? "Security/privacy review owner is named." : "A security/privacy review owner is required.",
    ),
    buildGate(
      "monitoring_owner_named",
      "Monitoring owner named",
      args.monitoringOwner ? "pass" : "block",
      args.monitoringOwner,
      args.monitoringOwner ? "Monitoring owner is named for future shadow/production checks." : "A monitoring owner is required.",
    ),
    buildGate(
      "rollback_owner_named",
      "Rollback owner named",
      args.rollbackOwner ? "pass" : "block",
      args.rollbackOwner,
      args.rollbackOwner ? "Rollback owner is named." : "A rollback owner is required before design-ready status.",
    ),
    buildGate(
      "manual_override_owner_named",
      "Manual override owner named",
      args.manualOverrideOwner ? "pass" : "block",
      args.manualOverrideOwner,
      args.manualOverrideOwner ? "Manual override owner is named." : "A manual override owner is required.",
    ),
    buildGate(
      "rollback_not_required",
      "Rollback not required",
      rollbackStatus === "not_required" ? "pass" : rollbackStatus === "watch" ? "warning" : "block",
      rollbackStatus,
      rollbackStatus === "not_required" ? "No rollback requirement is active at closeout." : "Rollback posture must be resolved before production-readiness design can advance.",
    ),
    buildGate(
      "model_import_exists",
      "Model import audit exists",
      args.modelImport ? "pass" : "block",
      args.modelImport?.id ?? null,
      args.modelImport ? "External model result import audit record exists." : "A model import audit record is required for traceability.",
    ),
  ];
};

const summarizeGates = (gates: InventoryStockoutProductionReadinessDesignSafetyGate[]) => {
  const blockers = gates.filter((gate) => gate.status === "block").map((gate) => gate.message);
  const warnings = gates.filter((gate) => gate.status === "warning").map((gate) => gate.message);
  return { blockers, warnings, gatesPassed: blockers.length === 0 && warnings.length === 0 };
};

const determineStatus = (args: {
  rollbackStatus: string;
  blockers: string[];
  warnings: string[];
  gatesPassed: boolean;
}): ProductionReadinessDesignStatus => {
  if (args.rollbackStatus === "rollback_required" || args.rollbackStatus === "rollback_recommended") return "rollback_required";
  if (args.blockers.length) return "blocked";
  if (args.gatesPassed) return "design_ready";
  if (args.warnings.length) return "needs_safety_review";
  return "not_started";
};

const determineRecommendation = (status: ProductionReadinessDesignStatus): ProductionReadinessDesignRecommendation => {
  if (status === "design_ready") return "prepare_separate_production_readiness_phase";
  if (status === "rollback_required") return "rollback";
  if (status === "blocked") return "blocked";
  return "complete_safety_architecture_review";
};

const buildRecommendedNextAction = (summary: InventoryStockoutProductionReadinessDesignSummary): string => {
  if (summary.designStatus === "design_ready") return "طراحی production-readiness آماده است؛ مرحله بعد باید یک فاز جداگانه برای implementation/runtime safety باشد، نه فعال‌سازی inference در همین فاز.";
  if (summary.designStatus === "rollback_required") return "rollback posture را حل کن و baseline را تنها مرجع عملیاتی نگه دار.";
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.warnings.length) return summary.warnings[0];
  return "ownerها و safety gateهای طراحی را کامل کن و سپس design spec را دوباره بساز.";
};

const buildArchitectureSpec = (args: {
  summary: InventoryStockoutProductionReadinessDesignSummary;
  closeout: Record<string, unknown> | null;
}) => ({
  scope: DESIGN_SCOPE,
  modelBoundary: {
    currentState: "external model result import and offline audit only",
    futureState: "separate production-readiness implementation phase may design a runtime boundary, but this spec does not enable it",
    inferenceRuntimeEnabled: false,
  },
  safetyArchitecture: [
    "Keep rule/statistical baseline as fallback and operational reference.",
    "Require explicit human review before any future production pilot.",
    "Require monitoring, rollback, incident response, and manual override owners before any runtime implementation.",
    "Separate model evaluation evidence from operational financial/accounting truth.",
  ],
  rolloutBoundary: {
    allowedNow: ["design review", "architecture planning", "safety checklist", "future phase scoping"],
    forbiddenNow: ["live inference", "automated reorder decisions", "pricing/accounting changes", "customer messaging changes"],
  },
  baselineFallback: {
    required: true,
    fallbackModel: "rule/statistical baseline v1",
    fallbackMustRemainOperational: true,
  },
  closeoutEvidence: {
    closeoutStatus: args.summary.closeoutStatus,
    closeoutId: args.closeout?.id ?? null,
    ownerName: args.closeout?.ownerName ?? null,
    productionReadinessOwner: args.summary.productionReadinessOwner,
  },
});

const buildSafetyArchitecture = (summary: InventoryStockoutProductionReadinessDesignSummary) => ({
  owners: {
    architectureOwner: summary.architectureOwner,
    securityReviewOwner: summary.securityReviewOwner,
    monitoringOwner: summary.monitoringOwner,
    rollbackOwner: summary.rollbackOwner,
    manualOverrideOwner: summary.manualOverrideOwner,
  },
  safetyGates: summary.safetyGates,
  manualOverridePolicy: {
    required: true,
    owner: summary.manualOverrideOwner,
    message: "Any future model-assisted recommendation must be manually overrideable before production consideration.",
  },
  rollbackPolicy: {
    owner: summary.rollbackOwner,
    triggers: [
      "candidate underperforms baseline in shadow/pilot evidence",
      "data leakage or label integrity issue",
      "monitoring gap or missing owner",
      "business stakeholder requests rollback",
      "financial/accounting truth would be affected without explicit approval",
    ],
  },
  monitoringPlan: {
    owner: summary.monitoringOwner,
    requiredSignals: ["candidate vs baseline F1", "balanced accuracy", "false negative rate", "coverage", "data quality", "drift indicators"],
  },
  securityPrivacyChecklist: {
    owner: summary.securityReviewOwner,
    requiredBeforeAnyFutureRuntime: true,
    checks: ["least privilege", "audit logging", "PII/data minimization", "model artifact provenance", "access control", "rollback authorization"],
  },
});

const buildRolloutRollbackPlan = (summary: InventoryStockoutProductionReadinessDesignSummary) => ({
  rolloutPlan: [
    "Do not enable production inference in this phase.",
    "Create a separate production-readiness implementation phase with explicit runtime, security, and rollback approvals.",
    "Run future candidate in non-blocking recommendation mode before any operational impact.",
    "Keep baseline and manual review as mandatory fallback controls.",
  ],
  rollbackPlan: [
    "Disable future candidate path and fall back to rule/statistical baseline.",
    "Freeze new model-assisted actions if monitoring or owner coverage is incomplete.",
    "Record rollback rationale and notify Admin/Manager stakeholders.",
    "Verify no inventory/accounting/reporting truth was changed by the model path.",
  ],
  readinessForNextPhase: summary.productionReadinessDesignPreconditionsMet,
});

const buildAuditDesignSpec = (summary: InventoryStockoutProductionReadinessDesignSummary) => ({
  designKey: summary.designKey,
  generatedAt: summary.generatedAt,
  importId: summary.importId,
  modelKey: summary.modelKey,
  modelVersion: summary.modelVersion,
  designStatus: summary.designStatus,
  recommendation: summary.recommendation,
  gateCount: summary.safetyGates.length,
  blockers: summary.blockers,
  warnings: summary.warnings,
  operationalBoundary: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

export const buildInventoryStockoutProductionReadinessDesignContract = buildContract;

export const buildInventoryStockoutProductionReadinessDesign = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionReadinessDesignResponse> => {
  const importId = asNumber(importIdInput) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const closeouts = importId ? await listMlOfflinePilotCloseoutsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestCloseout = closeouts[0] || null;
  const previousDesigns = importId ? await listMlProductionReadinessDesignSpecsByImportId(importId, 10) as Array<Record<string, unknown>> : [];

  const architectureOwner = normalizeText(options.architectureOwner, normalizeText(latestCloseout?.productionReadinessOwner));
  const securityReviewOwner = normalizeText(options.securityReviewOwner);
  const monitoringOwner = normalizeText(options.monitoringOwner, architectureOwner);
  const rollbackOwner = normalizeText(options.rollbackOwner, normalizeText(latestCloseout?.productionReadinessOwner));
  const manualOverrideOwner = normalizeText(options.manualOverrideOwner, architectureOwner);
  const rollbackStatus = normalizeText(latestCloseout?.rollbackStatus, "not_required") as InventoryStockoutProductionReadinessDesignSummary["rollbackStatus"];
  const gates = buildSafetyGates({
    modelImport,
    closeout: latestCloseout,
    architectureOwner,
    securityReviewOwner,
    monitoringOwner,
    rollbackOwner,
    manualOverrideOwner,
  });
  const gateSummary = summarizeGates(gates);
  const designStatus = determineStatus({ rollbackStatus, ...gateSummary });
  const recommendation = determineRecommendation(designStatus);
  const summary: InventoryStockoutProductionReadinessDesignSummary = {
    designKey: CONTRACT_KEY,
    generatedAt: new Date().toISOString(),
    importId,
    modelKey: normalizeText(modelImport?.modelKey || latestCloseout?.modelKey),
    modelVersion: normalizeText(modelImport?.modelVersion || latestCloseout?.modelVersion),
    closeoutStatus: normalizeText(latestCloseout?.closeoutStatus),
    closeoutId: asNumber(latestCloseout?.id),
    rollbackStatus,
    designStatus,
    recommendation,
    productionReadinessDesignPreconditionsMet: gateSummary.gatesPassed,
    architectureOwner,
    securityReviewOwner,
    monitoringOwner,
    rollbackOwner,
    manualOverrideOwner,
    productionReadinessOwner: normalizeText(latestCloseout?.productionReadinessOwner),
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    safetyGates: gates,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    recommendedNextAction: "",
  };
  summary.recommendedNextAction = buildRecommendedNextAction(summary);
  const architectureSpec = buildArchitectureSpec({ summary, closeout: latestCloseout });
  const safetyArchitecture = buildSafetyArchitecture(summary);
  const rolloutRollbackPlan = buildRolloutRollbackPlan(summary);
  const auditDesignSpec = buildAuditDesignSpec(summary);
  return {
    generatedAt: summary.generatedAt,
    contract: buildContract(),
    summary,
    latestCloseout,
    architectureSpec,
    safetyArchitecture,
    rolloutRollbackPlan,
    auditDesignSpec,
    previousDesignSpecs: previousDesigns,
    operationalPolicy: {
      designOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Production-readiness design is documentation and safety architecture only; it does not enable live inference or operational automation.",
    },
  };
};

export const recordInventoryStockoutProductionReadinessDesign = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutProductionReadinessDesignResponse> => {
  const response = await buildInventoryStockoutProductionReadinessDesign(payload.importId, payload);
  const record = await recordMlProductionReadinessDesignSpec({
    designKey: response.summary.designKey,
    importId: response.summary.importId,
    closeoutId: response.summary.closeoutId,
    modelKey: response.summary.modelKey,
    modelVersion: response.summary.modelVersion,
    closeoutStatus: response.summary.closeoutStatus,
    rollbackStatus: response.summary.rollbackStatus,
    designStatus: response.summary.designStatus,
    recommendation: response.summary.recommendation,
    productionReadinessDesignPreconditionsMet: response.summary.productionReadinessDesignPreconditionsMet,
    architectureOwner: response.summary.architectureOwner,
    securityReviewOwner: response.summary.securityReviewOwner,
    monitoringOwner: response.summary.monitoringOwner,
    rollbackOwner: response.summary.rollbackOwner,
    manualOverrideOwner: response.summary.manualOverrideOwner,
    architectureSpec: response.architectureSpec,
    safetyArchitecture: response.safetyArchitecture,
    rolloutRollbackPlan: response.rolloutRollbackPlan,
    auditDesignSpec: response.auditDesignSpec,
    summary: response.summary as unknown as Record<string, unknown>,
    policy: response.contract.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, designRecord: record || null };
};

export const listInventoryStockoutProductionReadinessDesignSpecs = async (importIdInput: unknown) => {
  return listMlProductionReadinessDesignSpecsByImportId(importIdInput, 50);
};

export const buildMlProductionReadinessDesignCatalogSummary = async (): Promise<MlProductionReadinessDesignCatalogSummary> => {
  const currentDesign = await buildInventoryStockoutProductionReadinessDesign();
  const lastDesignSpecs = await listMlProductionReadinessDesignSpecs(10) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentDesign: currentDesign.summary,
    lastDesignSpecs,
    recommendedNextAction: currentDesign.summary.recommendedNextAction,
  };
};
