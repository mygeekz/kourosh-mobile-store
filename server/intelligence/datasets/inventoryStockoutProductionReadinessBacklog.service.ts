import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionReadinessBacklogs,
  listMlProductionReadinessBacklogsByImportId,
  listMlProductionReadinessDesignSpecs,
  listMlProductionReadinessDesignSpecsByImportId,
  recordMlProductionReadinessBacklog,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutProductionReadinessBacklogContract,
  InventoryStockoutProductionReadinessBacklogGate,
  InventoryStockoutProductionReadinessBacklogResponse,
  InventoryStockoutProductionReadinessBacklogSummary,
  MlProductionReadinessBacklogCatalogSummary,
  ProductionReadinessBacklogRecommendation,
  ProductionReadinessBacklogStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_production_readiness_backlog_risk_register_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_DESIGN_KEY = "inventory_stockout_production_readiness_design_spec_v1" as const;
const BACKLOG_SCOPE = "implementation_backlog_and_risk_register_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const buildContract = (): InventoryStockoutProductionReadinessBacklogContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Convert the production-readiness design spec into an implementation backlog, risk register, owner matrix, and release gate checklist for a future phase only.",
  acceptedDesignKey: ACCEPTED_DESIGN_KEY,
  backlogScope: BACKLOG_SCOPE,
  requiredInputs: [
    "production-readiness design spec from Phase 2O",
    "design safety gates and architecture owners",
    "offline pilot closeout evidence inherited by design spec",
    "explicit product, engineering, QA, security, monitoring, rollback, and risk owners",
  ],
  requiredBacklogSections: [
    "runtime boundary implementation tasks",
    "security and access-control tasks",
    "audit logging and governance tasks",
    "monitoring and drift tasks",
    "baseline fallback and rollback tasks",
    "manual override and human review tasks",
    "release gate validation tasks",
  ],
  requiredRiskRegisterSections: [
    "data leakage and label integrity risks",
    "false negative stockout risks",
    "model drift and data quality risks",
    "security/privacy risks",
    "operational over-reliance risks",
    "rollback/fallback readiness risks",
  ],
  releaseGateRules: [
    "backlog_ready requires design_ready production-readiness design evidence.",
    "Every required owner must be named before a future implementation phase can be scoped.",
    "High-risk items must have an owner and mitigation before backlog_ready status.",
    "This backlog does not authorize production inference, decision automation, or changes to inventory/accounting truth.",
  ],
  forbiddenBehavior: [
    "Do not implement live inference from this backlog phase.",
    "Do not add Python, FastAPI, MLflow, model registry, or model artifact loading.",
    "Do not change purchasing, inventory, pricing, accounting, invoices, ledgers, reports, or customer communications.",
    "Do not treat backlog_ready as production approval.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const backlogs = await listMlProductionReadinessBacklogs(25) as Array<Record<string, unknown>>;
  const fromBacklog = backlogs.find((row) => asNumber(row.importId));
  if (fromBacklog) return asNumber(fromBacklog.importId);
  const designs = await listMlProductionReadinessDesignSpecs(25) as Array<Record<string, unknown>>;
  const fromDesign = designs.find((row) => asNumber(row.importId));
  if (fromDesign) return asNumber(fromDesign.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutProductionReadinessBacklogGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutProductionReadinessBacklogGate => ({ key, label, status, value, message });

const buildReleaseGates = (args: {
  designSpec: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  architectureOwner: string | null;
  productOwner: string | null;
  engineeringOwner: string | null;
  qaOwner: string | null;
  securityOwner: string | null;
  monitoringOwner: string | null;
  rollbackOwner: string | null;
  riskOwner: string | null;
}): InventoryStockoutProductionReadinessBacklogGate[] => {
  const designStatus = normalizeText(args.designSpec?.designStatus);
  const designPreconditionsMet = boolValue(args.designSpec?.productionReadinessDesignPreconditionsMet);
  const rollbackStatus = normalizeText(args.designSpec?.rollbackStatus, "not_required");
  return [
    buildGate(
      "design_spec_ready",
      "Production-readiness design ready",
      designStatus === "design_ready" ? "pass" : designStatus ? "warning" : "block",
      designStatus,
      designStatus === "design_ready" ? "Design spec supports backlog/risk-register scoping." : "Design spec must be design_ready before implementation backlog can be considered ready.",
    ),
    buildGate(
      "design_preconditions_met",
      "Design preconditions met",
      designPreconditionsMet ? "pass" : "block",
      designPreconditionsMet,
      designPreconditionsMet ? "Design preconditions are met." : "Production-readiness design preconditions are not met yet.",
    ),
    buildGate(
      "architecture_owner_named",
      "Architecture owner named",
      args.architectureOwner ? "pass" : "block",
      args.architectureOwner,
      args.architectureOwner ? "Architecture owner is assigned." : "Architecture owner is required for backlog ownership.",
    ),
    buildGate(
      "product_owner_named",
      "Product owner named",
      args.productOwner ? "pass" : "block",
      args.productOwner,
      args.productOwner ? "Product owner is assigned." : "Product owner is required before release gate scoping.",
    ),
    buildGate(
      "engineering_owner_named",
      "Engineering owner named",
      args.engineeringOwner ? "pass" : "block",
      args.engineeringOwner,
      args.engineeringOwner ? "Engineering owner is assigned." : "Engineering owner is required for any future implementation phase.",
    ),
    buildGate(
      "qa_owner_named",
      "QA owner named",
      args.qaOwner ? "pass" : "block",
      args.qaOwner,
      args.qaOwner ? "QA owner is assigned." : "QA owner is required for release gate verification.",
    ),
    buildGate(
      "security_owner_named",
      "Security owner named",
      args.securityOwner ? "pass" : "block",
      args.securityOwner,
      args.securityOwner ? "Security/privacy owner is assigned." : "Security/privacy owner is required for production-readiness backlog.",
    ),
    buildGate(
      "monitoring_owner_named",
      "Monitoring owner named",
      args.monitoringOwner ? "pass" : "block",
      args.monitoringOwner,
      args.monitoringOwner ? "Monitoring owner is assigned." : "Monitoring owner is required for future shadow/production safety.",
    ),
    buildGate(
      "rollback_owner_named",
      "Rollback owner named",
      args.rollbackOwner ? "pass" : "block",
      args.rollbackOwner,
      args.rollbackOwner ? "Rollback owner is assigned." : "Rollback owner is required before release gate scoping.",
    ),
    buildGate(
      "risk_owner_named",
      "Risk owner named",
      args.riskOwner ? "pass" : "block",
      args.riskOwner,
      args.riskOwner ? "Risk register owner is assigned." : "Risk owner is required for risk register accountability.",
    ),
    buildGate(
      "rollback_not_required",
      "Rollback not required",
      rollbackStatus === "not_required" ? "pass" : rollbackStatus === "watch" ? "warning" : "block",
      rollbackStatus,
      rollbackStatus === "not_required" ? "No active rollback requirement is inherited from the design spec." : "Rollback posture must be resolved before a future implementation backlog can advance.",
    ),
    buildGate(
      "model_import_exists",
      "Model import audit exists",
      args.modelImport ? "pass" : "block",
      args.modelImport?.id ?? null,
      args.modelImport ? "External model import audit record exists for traceability." : "Model import audit record is required for traceable backlog planning.",
    ),
  ];
};

const summarizeGates = (gates: InventoryStockoutProductionReadinessBacklogGate[]) => {
  const blockers = gates.filter((gate) => gate.status === "block").map((gate) => gate.message);
  const warnings = gates.filter((gate) => gate.status === "warning").map((gate) => gate.message);
  return { blockers, warnings, gatesPassed: blockers.length === 0 && warnings.length === 0 };
};

const buildOwnerMatrix = (summary: InventoryStockoutProductionReadinessBacklogSummary) => ({
  requiredOwnersComplete: summary.ownerMatrixComplete,
  owners: [
    { role: "architecture_owner", name: summary.architectureOwner, responsibility: "Runtime boundary and integration architecture for a future phase." },
    { role: "product_owner", name: summary.productOwner, responsibility: "Business scope, allowed use, and stakeholder signoff." },
    { role: "engineering_owner", name: summary.engineeringOwner, responsibility: "Future implementation backlog delivery and code review." },
    { role: "qa_owner", name: summary.qaOwner, responsibility: "Release gate test plan and regression verification." },
    { role: "security_owner", name: summary.securityOwner, responsibility: "Security/privacy review and access-control checks." },
    { role: "monitoring_owner", name: summary.monitoringOwner, responsibility: "Monitoring, drift, alerting, and observability plan." },
    { role: "rollback_owner", name: summary.rollbackOwner, responsibility: "Rollback runbook, fallback verification, and incident response." },
    { role: "risk_owner", name: summary.riskOwner, responsibility: "Risk register review, mitigation ownership, and signoff tracking." },
  ],
});

const buildImplementationBacklog = (summary: InventoryStockoutProductionReadinessBacklogSummary): Array<Record<string, unknown>> => {
  const ready = summary.ownerMatrixComplete && summary.designStatus === "design_ready";
  const baseStatus = ready ? "planned" : "blocked_by_gate";
  return [
    {
      key: "future_runtime_boundary_design",
      title: "Design a separate future inference boundary without enabling it now",
      category: "architecture",
      priority: "high",
      owner: summary.architectureOwner,
      status: baseStatus,
      acceptanceCriteria: ["runtime boundary documented", "no production endpoint enabled", "baseline fallback preserved"],
    },
    {
      key: "access_control_and_audit_logging",
      title: "Define authorization, audit logging, and model action traceability",
      category: "security",
      priority: "high",
      owner: summary.securityOwner,
      status: baseStatus,
      acceptanceCriteria: ["Admin/Manager access rules documented", "audit records defined", "no low-permission financial exposure"],
    },
    {
      key: "baseline_fallback_runbook",
      title: "Write baseline fallback and rollback runbook",
      category: "rollback",
      priority: "high",
      owner: summary.rollbackOwner,
      status: baseStatus,
      acceptanceCriteria: ["fallback to rule/statistical baseline documented", "rollback trigger list approved", "manual verification checklist defined"],
    },
    {
      key: "monitoring_and_drift_plan",
      title: "Define monitoring, drift, and coverage signals",
      category: "monitoring",
      priority: "medium",
      owner: summary.monitoringOwner,
      status: baseStatus,
      acceptanceCriteria: ["F1/Balanced Accuracy trend checks", "coverage and missing row checks", "data quality/drift signals"],
    },
    {
      key: "manual_override_and_human_review",
      title: "Define mandatory manual override and human review flow",
      category: "governance",
      priority: "high",
      owner: summary.productOwner,
      status: baseStatus,
      acceptanceCriteria: ["manual override owner assigned", "review workflow documented", "no automated decision path enabled"],
    },
    {
      key: "qa_release_gate_suite",
      title: "Prepare QA release gate checklist for any future implementation phase",
      category: "qa",
      priority: "medium",
      owner: summary.qaOwner,
      status: baseStatus,
      acceptanceCriteria: ["financial report regression tests listed", "inventory/accounting non-regression checks listed", "manual QA checklist defined"],
    },
    {
      key: "risk_register_signoff",
      title: "Review and sign off risk register before future implementation scoping",
      category: "risk",
      priority: "high",
      owner: summary.riskOwner,
      status: baseStatus,
      acceptanceCriteria: ["all high risks have mitigations", "risk owner signoff captured", "release blockers tracked"],
    },
  ];
};

const buildRiskRegister = (summary: InventoryStockoutProductionReadinessBacklogSummary): Array<Record<string, unknown>> => [
  {
    key: "false_negative_stockout_risk",
    title: "Candidate misses real stockout risk",
    severity: "high",
    likelihood: "medium",
    owner: summary.riskOwner || summary.monitoringOwner,
    mitigation: "Require baseline fallback, recall monitoring, false-negative alert review, and manual override before any future pilot.",
    status: summary.riskOwner ? "mitigation_owner_assigned" : "owner_required",
  },
  {
    key: "data_leakage_label_integrity",
    title: "Feature/label leakage or corrupted outcome labels",
    severity: "high",
    likelihood: "medium",
    owner: summary.qaOwner || summary.riskOwner,
    mitigation: "Keep label/outcome separate from feature snapshot; require QA checks before future implementation phase.",
    status: summary.qaOwner ? "mitigation_owner_assigned" : "owner_required",
  },
  {
    key: "overreliance_on_model_recommendations",
    title: "Users over-trust model-assisted recommendations",
    severity: "high",
    likelihood: "medium",
    owner: summary.productOwner || summary.riskOwner,
    mitigation: "Keep human review and manual override mandatory; label outputs as candidate recommendations only.",
    status: summary.productOwner ? "mitigation_owner_assigned" : "owner_required",
  },
  {
    key: "security_privacy_access_control",
    title: "Sensitive business/customer signals exposed to unauthorized roles",
    severity: "high",
    likelihood: "low",
    owner: summary.securityOwner,
    mitigation: "Use Admin/Manager authorization, audit access, and minimize payload exposure before future runtime work.",
    status: summary.securityOwner ? "mitigation_owner_assigned" : "owner_required",
  },
  {
    key: "rollback_fallback_gap",
    title: "Fallback or rollback path is incomplete when candidate degrades",
    severity: "high",
    likelihood: "medium",
    owner: summary.rollbackOwner,
    mitigation: "Keep rule/statistical baseline active; require rollback runbook and incident escalation owner.",
    status: summary.rollbackOwner ? "mitigation_owner_assigned" : "owner_required",
  },
  {
    key: "business_calculation_regression",
    title: "Future implementation accidentally changes inventory/accounting truth",
    severity: "high",
    likelihood: "low",
    owner: summary.engineeringOwner || summary.qaOwner,
    mitigation: "Release gate must include reports, ledger, invoice, inventory, and financial regression tests.",
    status: summary.engineeringOwner && summary.qaOwner ? "mitigation_owner_assigned" : "owner_required",
  },
];

const buildReleaseGateChecklist = (summary: InventoryStockoutProductionReadinessBacklogSummary): Array<Record<string, unknown>> => [
  { key: "design_ready", label: "Production design spec is design_ready", status: summary.designStatus === "design_ready" ? "pass" : "block" },
  { key: "owner_matrix_complete", label: "All required owners are assigned", status: summary.ownerMatrixComplete ? "pass" : "block" },
  { key: "high_risks_owned", label: "All high risks have mitigation owners", status: summary.highRiskCount > 0 && summary.openBlockerCount === 0 ? "pass" : "block" },
  { key: "baseline_fallback_required", label: "Rule/statistical baseline fallback remains mandatory", status: "pass" },
  { key: "manual_override_required", label: "Manual override remains mandatory", status: summary.productOwner ? "pass" : "block" },
  { key: "no_runtime_enabled", label: "No production inference/runtime is enabled in this phase", status: "pass" },
  { key: "no_financial_truth_changes", label: "No inventory/accounting/report truth can be changed by this phase", status: "pass" },
];

const determineStatus = (args: {
  designStatus: string | null;
  gatesPassed: boolean;
  blockers: string[];
  warnings: string[];
  ownerMatrixComplete: boolean;
  openBlockerCount: number;
}): ProductionReadinessBacklogStatus => {
  if (!args.designStatus) return "not_started";
  if (args.blockers.length) return args.ownerMatrixComplete ? "blocked" : "needs_owner_assignment";
  if (!args.ownerMatrixComplete) return "needs_owner_assignment";
  if (args.openBlockerCount > 0) return "needs_risk_review";
  if (args.gatesPassed) return "backlog_ready";
  if (args.warnings.length) return "needs_risk_review";
  return "not_started";
};

const determineRecommendation = (status: ProductionReadinessBacklogStatus): ProductionReadinessBacklogRecommendation => {
  if (status === "backlog_ready") return "prepare_future_implementation_phase";
  if (status === "needs_owner_assignment") return "assign_required_owners";
  if (status === "needs_risk_review") return "complete_risk_review";
  return "blocked";
};

const buildRecommendedNextAction = (summary: InventoryStockoutProductionReadinessBacklogSummary): string => {
  if (summary.backlogStatus === "backlog_ready") return "backlog و risk register آماده‌اند؛ مرحله بعد باید فقط یک فاز جداگانه برای implementation planning باشد، نه فعال‌سازی inference در همین فاز.";
  if (summary.backlogStatus === "needs_owner_assignment") return "ownerهای الزامی backlog، QA، security، monitoring، rollback و risk را کامل کن.";
  if (summary.backlogStatus === "needs_risk_review") return "risk register را با owner و mitigation کامل کن و release gate را دوباره بررسی کن.";
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.warnings.length) return summary.warnings[0];
  return "production-readiness design spec را کامل کن، سپس backlog/risk register را بساز.";
};

export const buildInventoryStockoutProductionReadinessBacklogContract = buildContract;

export const buildInventoryStockoutProductionReadinessBacklog = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutProductionReadinessBacklogResponse> => {
  const importId = asNumber(importIdInput) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const designSpecs = importId ? await listMlProductionReadinessDesignSpecsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const latestDesignSpec = designSpecs[0] || null;
  const previousBacklogs = importId ? await listMlProductionReadinessBacklogsByImportId(importId, 10) as Array<Record<string, unknown>> : [];

  const architectureOwner = normalizeText(options.architectureOwner, normalizeText(latestDesignSpec?.architectureOwner));
  const productOwner = normalizeText(options.productOwner, normalizeText(latestDesignSpec?.architectureOwner));
  const engineeringOwner = normalizeText(options.engineeringOwner, architectureOwner);
  const qaOwner = normalizeText(options.qaOwner);
  const securityOwner = normalizeText(options.securityOwner, normalizeText(latestDesignSpec?.securityReviewOwner));
  const monitoringOwner = normalizeText(options.monitoringOwner, normalizeText(latestDesignSpec?.monitoringOwner));
  const rollbackOwner = normalizeText(options.rollbackOwner, normalizeText(latestDesignSpec?.rollbackOwner));
  const riskOwner = normalizeText(options.riskOwner, securityOwner || rollbackOwner);

  const releaseGates = buildReleaseGates({
    designSpec: latestDesignSpec,
    modelImport,
    architectureOwner,
    productOwner,
    engineeringOwner,
    qaOwner,
    securityOwner,
    monitoringOwner,
    rollbackOwner,
    riskOwner,
  });
  const gateSummary = summarizeGates(releaseGates);
  const ownerMatrixComplete = [architectureOwner, productOwner, engineeringOwner, qaOwner, securityOwner, monitoringOwner, rollbackOwner, riskOwner].every(Boolean);

  const draftSummary: InventoryStockoutProductionReadinessBacklogSummary = {
    backlogKey: CONTRACT_KEY,
    generatedAt: new Date().toISOString(),
    importId,
    designSpecId: asNumber(latestDesignSpec?.id),
    modelKey: normalizeText(modelImport?.modelKey || latestDesignSpec?.modelKey),
    modelVersion: normalizeText(modelImport?.modelVersion || latestDesignSpec?.modelVersion),
    designStatus: normalizeText(latestDesignSpec?.designStatus),
    backlogStatus: "not_started",
    releaseGateStatus: "not_ready",
    recommendation: "blocked",
    ownerMatrixComplete,
    riskRegisterStatus: "draft",
    totalBacklogItems: 0,
    readyBacklogItems: 0,
    openBlockerCount: 0,
    highRiskCount: 0,
    architectureOwner,
    productOwner,
    engineeringOwner,
    qaOwner,
    securityOwner,
    monitoringOwner,
    rollbackOwner,
    riskOwner,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    releaseGates,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    recommendedNextAction: "",
  };

  const implementationBacklog = buildImplementationBacklog(draftSummary);
  const riskRegister = buildRiskRegister(draftSummary);
  const openBlockerCount = releaseGates.filter((gate) => gate.status === "block").length + riskRegister.filter((risk) => risk.status === "owner_required").length;
  const highRiskCount = riskRegister.filter((risk) => risk.severity === "high").length;
  const readyBacklogItems = implementationBacklog.filter((item) => item.status === "planned").length;
  const backlogStatus = determineStatus({
    designStatus: draftSummary.designStatus,
    gatesPassed: gateSummary.gatesPassed && openBlockerCount === 0,
    blockers: gateSummary.blockers,
    warnings: gateSummary.warnings,
    ownerMatrixComplete,
    openBlockerCount,
  });
  const recommendation = determineRecommendation(backlogStatus);
  const summary: InventoryStockoutProductionReadinessBacklogSummary = {
    ...draftSummary,
    backlogStatus,
    releaseGateStatus: backlogStatus === "backlog_ready" ? "ready_for_future_phase_scoping" : gateSummary.blockers.length ? "blocked" : "not_ready",
    recommendation,
    riskRegisterStatus: openBlockerCount > 0 ? "blocked" : gateSummary.warnings.length ? "review_required" : backlogStatus === "backlog_ready" ? "ready" : "draft",
    totalBacklogItems: implementationBacklog.length,
    readyBacklogItems,
    openBlockerCount,
    highRiskCount,
  };
  summary.recommendedNextAction = buildRecommendedNextAction(summary);
  return {
    generatedAt: summary.generatedAt,
    contract: buildContract(),
    summary,
    latestDesignSpec,
    ownerMatrix: buildOwnerMatrix(summary),
    implementationBacklog,
    riskRegister,
    releaseGateChecklist: buildReleaseGateChecklist(summary),
    previousBacklogs,
    operationalPolicy: {
      backlogOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Production-readiness backlog and risk register are planning artifacts only; they do not enable live inference or operational automation.",
    },
  };
};

export const recordInventoryStockoutProductionReadinessBacklog = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutProductionReadinessBacklogResponse> => {
  const response = await buildInventoryStockoutProductionReadinessBacklog(payload.importId, payload);
  const record = await recordMlProductionReadinessBacklog({
    backlogKey: response.summary.backlogKey,
    importId: response.summary.importId,
    designSpecId: response.summary.designSpecId,
    modelKey: response.summary.modelKey,
    modelVersion: response.summary.modelVersion,
    designStatus: response.summary.designStatus,
    backlogStatus: response.summary.backlogStatus,
    releaseGateStatus: response.summary.releaseGateStatus,
    recommendation: response.summary.recommendation,
    ownerMatrixComplete: response.summary.ownerMatrixComplete,
    riskRegisterStatus: response.summary.riskRegisterStatus,
    totalBacklogItems: response.summary.totalBacklogItems,
    readyBacklogItems: response.summary.readyBacklogItems,
    openBlockerCount: response.summary.openBlockerCount,
    highRiskCount: response.summary.highRiskCount,
    architectureOwner: response.summary.architectureOwner,
    productOwner: response.summary.productOwner,
    engineeringOwner: response.summary.engineeringOwner,
    qaOwner: response.summary.qaOwner,
    securityOwner: response.summary.securityOwner,
    monitoringOwner: response.summary.monitoringOwner,
    rollbackOwner: response.summary.rollbackOwner,
    riskOwner: response.summary.riskOwner,
    backlog: response.implementationBacklog,
    riskRegister: response.riskRegister,
    ownerMatrix: response.ownerMatrix,
    releaseGateChecklist: response.releaseGateChecklist,
    summary: response.summary as unknown as Record<string, unknown>,
    policy: response.contract.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, backlogRecord: record || null };
};

export const listInventoryStockoutProductionReadinessBacklogs = async (importIdInput: unknown) => {
  return listMlProductionReadinessBacklogsByImportId(importIdInput, 50);
};

export const buildMlProductionReadinessBacklogCatalogSummary = async (): Promise<MlProductionReadinessBacklogCatalogSummary> => {
  const currentBacklog = await buildInventoryStockoutProductionReadinessBacklog();
  const lastBacklogs = await listMlProductionReadinessBacklogs(10) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentBacklog: currentBacklog.summary,
    lastBacklogs,
    recommendedNextAction: currentBacklog.summary.recommendedNextAction,
  };
};
