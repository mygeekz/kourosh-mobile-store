import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlOfflinePilotCloseouts,
  listMlOfflinePilotCloseoutsByImportId,
  listMlOfflinePilotDecisionReviewsByImportId,
  listMlOfflinePilotReadinessChecksByImportId,
  listMlOfflinePilotReviewExports,
  listMlOfflinePilotReviewExportsByImportId,
  listMlOfflinePilotReviewPacksByImportId,
  listMlShadowEvaluationsByImportId,
  listMlShadowStabilityChecksByImportId,
  recordMlOfflinePilotCloseout,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutOfflinePilotCloseoutCheck,
  InventoryStockoutOfflinePilotCloseoutContract,
  InventoryStockoutOfflinePilotCloseoutResponse,
  InventoryStockoutOfflinePilotCloseoutSummary,
  MlOfflinePilotCloseoutCatalogSummary,
  OfflinePilotCloseoutRecommendation,
  OfflinePilotCloseoutStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_pilot_closeout_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_KPI_DASHBOARD_KEY = "inventory_stockout_offline_pilot_kpi_dashboard_v1" as const;
const CLOSEOUT_SCOPE = "offline_pilot_closeout_and_preconditions_only" as const;
const MIN_SHADOW_EVALUATIONS_FOR_CLOSEOUT = 3;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asInteger = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const buildContract = (): InventoryStockoutOfflinePilotCloseoutContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Close an offline inventory stockout pilot and document theoretical production-readiness preconditions, risk signoff, rollback posture, and audit evidence without enabling production inference or changing operational decisions.",
  acceptedKpiDashboardKey: ACCEPTED_KPI_DASHBOARD_KEY,
  closeoutScope: CLOSEOUT_SCOPE,
  requiredInputs: [
    "model result import audit record",
    "shadow evaluation history",
    "shadow stability gate",
    "offline pilot readiness gate",
    "human review board decision",
    "outcome review pack",
    "KPI dashboard / review export",
  ],
  productionReadinessPreconditions: [
    "named production-readiness owner",
    "offline closeout owner signoff",
    "rollback owner and rollback trigger review",
    "monitoring/runbook owner identified",
    "security/privacy/data-governance review planned",
    "model card and training package retained for audit",
    "baseline fallback remains the only operational reference",
    "future production phase must explicitly add separate approval before inference",
  ],
  closeoutRules: [
    "closeout_ready requires a dashboard_ready KPI export, no rollback requirement, enough shadow history, positive pilot readiness, owner signoff, and a named production-readiness owner.",
    "rollback_required is returned if the latest review export or review pack requires rollback.",
    "needs_more_evidence is returned when the audit chain is present but incomplete.",
    "This closeout never promotes a model to production and never enables inference runtime.",
  ],
  forbiddenBehavior: [
    "Do not run model code inside Kourosh.",
    "Do not create live inference endpoints.",
    "Do not promote an external model to production from closeout.",
    "Do not change inventory, purchasing, pricing, accounting, reporting, invoices, ledgers, or customer messages from closeout.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const exports = await listMlOfflinePilotReviewExports(25) as Array<Record<string, unknown>>;
  const fromExport = exports.find((row) => asNumber(row.importId));
  if (fromExport) return asNumber(fromExport.importId);
  const closeouts = await listMlOfflinePilotCloseouts(25) as Array<Record<string, unknown>>;
  const fromCloseout = closeouts.find((row) => asNumber(row.importId));
  if (fromCloseout) return asNumber(fromCloseout.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildCheck = (
  key: string,
  label: string,
  status: InventoryStockoutOfflinePilotCloseoutCheck["status"],
  value: unknown,
  message: string,
): InventoryStockoutOfflinePilotCloseoutCheck => ({ key, label, status, value, message });

const derivePreconditions = (args: {
  reviewExport: Record<string, unknown> | null;
  reviewPack: Record<string, unknown> | null;
  decision: Record<string, unknown> | null;
  readiness: Record<string, unknown> | null;
  stability: Record<string, unknown> | null;
  shadowEvaluations: Array<Record<string, unknown>>;
  ownerSignoff: boolean;
  ownerName: string | null;
  productionReadinessOwner: string | null;
}): InventoryStockoutOfflinePilotCloseoutCheck[] => {
  const dashboardStatus = normalizeText(args.reviewExport?.dashboardStatus);
  const recommendation = normalizeText(args.reviewExport?.recommendation || args.reviewPack?.recommendation);
  const rollbackStatus = normalizeText(args.reviewExport?.rollbackStatus || args.reviewPack?.rollbackStatus, "not_required");
  const pilotReadinessPct = asNumber(args.reviewExport?.pilotReadinessPct);
  const offlinePilotReady = boolValue(args.readiness?.offlinePilotReady);
  const stabilityStatus = normalizeText(args.stability?.status);
  const boardDecision = normalizeText(args.decision?.boardDecision);
  return [
    buildCheck(
      "kpi_dashboard_ready",
      "KPI dashboard ready",
      dashboardStatus === "dashboard_ready" ? "pass" : dashboardStatus ? "warning" : "block",
      dashboardStatus,
      dashboardStatus === "dashboard_ready" ? "Latest KPI dashboard is ready for management review." : "Latest KPI dashboard is not ready yet.",
    ),
    buildCheck(
      "review_recommendation_allows_closeout",
      "Review recommendation allows closeout",
      recommendation === "continue_offline_pilot" ? "pass" : recommendation === "rollback" ? "block" : "warning",
      recommendation,
      recommendation === "continue_offline_pilot" ? "Review pack recommends continuing the offline pilot path." : "Review pack does not yet support closeout.",
    ),
    buildCheck(
      "rollback_not_required",
      "Rollback not required",
      rollbackStatus === "not_required" ? "pass" : rollbackStatus === "watch" ? "warning" : "block",
      rollbackStatus,
      rollbackStatus === "not_required" ? "No rollback trigger is active." : "Rollback posture must be resolved before any further planning.",
    ),
    buildCheck(
      "minimum_shadow_history",
      "Minimum shadow history",
      args.shadowEvaluations.length >= MIN_SHADOW_EVALUATIONS_FOR_CLOSEOUT ? "pass" : args.shadowEvaluations.length > 0 ? "warning" : "block",
      args.shadowEvaluations.length,
      `${MIN_SHADOW_EVALUATIONS_FOR_CLOSEOUT} shadow evaluations are required for closeout evidence.`,
    ),
    buildCheck(
      "stability_gate_stable",
      "Stability gate stable",
      stabilityStatus === "stable_candidate" ? "pass" : stabilityStatus ? "warning" : "block",
      stabilityStatus,
      stabilityStatus === "stable_candidate" ? "Stability gate supports offline pilot closeout." : "Stability gate does not yet support closeout.",
    ),
    buildCheck(
      "offline_pilot_ready",
      "Offline pilot readiness",
      offlinePilotReady ? "pass" : "block",
      offlinePilotReady,
      offlinePilotReady ? "Offline pilot readiness gate was approved." : "Offline pilot readiness gate must be approved first.",
    ),
    buildCheck(
      "human_board_continue",
      "Human review board decision",
      boardDecision === "continue_pilot" ? "pass" : boardDecision === "rollback" ? "block" : "warning",
      boardDecision,
      boardDecision === "continue_pilot" ? "Human board supports continuing the offline path." : "Human board decision must be resolved before closeout.",
    ),
    buildCheck(
      "readiness_score_threshold",
      "Readiness score threshold",
      pilotReadinessPct != null && pilotReadinessPct >= 80 ? "pass" : pilotReadinessPct != null && pilotReadinessPct >= 50 ? "warning" : "block",
      pilotReadinessPct,
      "KPI readiness should be at least 80% for closeout-ready status.",
    ),
    buildCheck(
      "owner_signoff",
      "Owner signoff",
      args.ownerSignoff && args.ownerName ? "pass" : "block",
      args.ownerSignoff ? args.ownerName : false,
      args.ownerSignoff && args.ownerName ? "Offline closeout owner signoff is recorded." : "A named owner must sign off the offline closeout.",
    ),
    buildCheck(
      "production_readiness_owner_named",
      "Production-readiness owner named",
      args.productionReadinessOwner ? "pass" : "block",
      args.productionReadinessOwner,
      args.productionReadinessOwner ? "Production-readiness planning owner is named." : "A future production-readiness owner must be named before closeout-ready status.",
    ),
  ];
};

const determineSummarySignals = (checks: InventoryStockoutOfflinePilotCloseoutCheck[]): {
  blockers: string[];
  warnings: string[];
  preconditionsMet: boolean;
} => {
  const blockers = checks.filter((check) => check.status === "block").map((check) => check.message);
  const warnings = checks.filter((check) => check.status === "warning").map((check) => check.message);
  return {
    blockers,
    warnings,
    preconditionsMet: blockers.length === 0 && warnings.length === 0,
  };
};

const determineCloseoutStatus = (args: {
  rollbackStatus: string;
  blockers: string[];
  warnings: string[];
  preconditionsMet: boolean;
}): OfflinePilotCloseoutStatus => {
  if (args.rollbackStatus === "rollback_required" || args.rollbackStatus === "rollback_recommended") return "rollback_required";
  if (args.blockers.length) return "blocked";
  if (args.preconditionsMet) return "closeout_ready";
  if (args.warnings.length) return "needs_more_evidence";
  return "not_started";
};

const determineRecommendation = (status: OfflinePilotCloseoutStatus): OfflinePilotCloseoutRecommendation => {
  if (status === "closeout_ready") return "close_offline_pilot_continue_to_production_readiness_planning";
  if (status === "rollback_required") return "rollback";
  if (status === "blocked") return "blocked";
  return "extend_offline_pilot";
};

const buildRecommendedNextAction = (summary: InventoryStockoutOfflinePilotCloseoutSummary): string => {
  if (summary.closeoutStatus === "closeout_ready") return "offline pilot closeout آماده است؛ مرحله بعد فقط production-readiness planning جداگانه است و inference هنوز فعال نشود.";
  if (summary.closeoutStatus === "rollback_required") return "rollback را audit-only ثبت کن و baseline را تنها مرجع عملیاتی نگه دار.";
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.warnings.length) return summary.warnings[0];
  return "review export و closeout signoff را کامل کن، سپس preconditionها را دوباره بررسی کن.";
};

const buildRiskSignoff = (summary: InventoryStockoutOfflinePilotCloseoutSummary) => ({
  rollbackStatus: summary.rollbackStatus,
  closeoutStatus: summary.closeoutStatus,
  ownerSignoff: summary.ownerSignoff,
  ownerName: summary.ownerName,
  productionReadinessOwner: summary.productionReadinessOwner,
  residualRisks: [
    "No live inference runtime exists inside Kourosh.",
    "Future production planning must repeat security, privacy, reliability, monitoring, rollback, and manual override checks.",
    "Rule/Statistical Baseline remains the only operationally safe reference until a future production phase is explicitly approved.",
  ],
  signoffScope: CLOSEOUT_SCOPE,
});

const buildAuditExport = (args: {
  generatedAt: string;
  summary: InventoryStockoutOfflinePilotCloseoutSummary;
  latestReviewExport: Record<string, unknown> | null;
  latestReviewPack: Record<string, unknown> | null;
  previousCloseouts: Array<Record<string, unknown>>;
}) => ({
  generatedAt: args.generatedAt,
  closeoutKey: CONTRACT_KEY,
  model: {
    importId: args.summary.importId,
    modelKey: args.summary.modelKey,
    modelVersion: args.summary.modelVersion,
  },
  summary: args.summary,
  evidence: {
    latestReviewExport: args.latestReviewExport,
    latestReviewPack: args.latestReviewPack,
    previousCloseoutCount: args.previousCloseouts.length,
  },
  operationalBoundary: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildSummary = async (args: {
  importId: number | null;
  request?: Record<string, unknown>;
}): Promise<{
  summary: InventoryStockoutOfflinePilotCloseoutSummary;
  latestReviewExport: Record<string, unknown> | null;
  latestReviewPack: Record<string, unknown> | null;
  preconditions: InventoryStockoutOfflinePilotCloseoutCheck[];
  riskSignoff: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousCloseouts: Array<Record<string, unknown>>;
}> => {
  const generatedAt = new Date().toISOString();
  const importId = args.importId || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const reviewExports = importId ? await listMlOfflinePilotReviewExportsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const reviewPacks = importId ? await listMlOfflinePilotReviewPacksByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const decisions = importId ? await listMlOfflinePilotDecisionReviewsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const readinessChecks = importId ? await listMlOfflinePilotReadinessChecksByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const stabilityChecks = importId ? await listMlShadowStabilityChecksByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const shadowEvaluations = importId ? await listMlShadowEvaluationsByImportId(importId, 20) as Array<Record<string, unknown>> : [];
  const previousCloseouts = importId ? await listMlOfflinePilotCloseoutsByImportId(importId, 10) as Array<Record<string, unknown>> : [];

  const latestReviewExport = reviewExports[0] || null;
  const latestReviewPack = reviewPacks[0] || null;
  const latestDecision = decisions[0] || null;
  const latestReadiness = readinessChecks[0] || null;
  const latestStability = stabilityChecks[0] || null;
  const ownerSignoff = boolValue(args.request?.ownerSignoff);
  const ownerName = normalizeText(args.request?.ownerName);
  const productionReadinessOwner = normalizeText(args.request?.productionReadinessOwner || args.request?.ownerName);

  const preconditions = derivePreconditions({
    reviewExport: latestReviewExport,
    reviewPack: latestReviewPack,
    decision: latestDecision,
    readiness: latestReadiness,
    stability: latestStability,
    shadowEvaluations,
    ownerSignoff,
    ownerName,
    productionReadinessOwner,
  });
  const signal = determineSummarySignals(preconditions);
  const rollbackStatus = normalizeText(latestReviewExport?.rollbackStatus || latestReviewPack?.rollbackStatus, "not_required") as InventoryStockoutOfflinePilotCloseoutSummary["rollbackStatus"];
  const closeoutStatus = determineCloseoutStatus({
    rollbackStatus,
    blockers: signal.blockers,
    warnings: signal.warnings,
    preconditionsMet: signal.preconditionsMet,
  });
  const recommendation = determineRecommendation(closeoutStatus);
  const summaryBase = {
    closeoutKey: CONTRACT_KEY,
    generatedAt,
    importId,
    modelKey: normalizeText(modelImport?.modelKey || latestReviewExport?.modelKey || latestReviewPack?.modelKey),
    modelVersion: normalizeText(modelImport?.modelVersion || latestReviewExport?.modelVersion || latestReviewPack?.modelVersion),
    dashboardStatus: normalizeText(latestReviewExport?.dashboardStatus),
    recommendation,
    rollbackStatus,
    pilotReadinessPct: roundPct(asNumber(latestReviewExport?.pilotReadinessPct)),
    shadowEvaluationsCount: asInteger(latestReviewExport?.shadowEvaluationsCount ?? latestReviewPack?.shadowEvaluationsCount ?? shadowEvaluations.length),
    avgDeltaF1Pct: roundPct(asNumber(latestReviewExport?.avgDeltaF1Pct ?? latestReviewPack?.avgDeltaF1Pct)),
    avgDeltaBalancedAccuracyPct: roundPct(asNumber(latestReviewExport?.avgDeltaBalancedAccuracyPct ?? latestReviewPack?.avgDeltaBalancedAccuracyPct)),
    closeoutStatus,
    productionReadinessPreconditionsMet: signal.preconditionsMet,
    ownerSignoff,
    ownerName,
    productionReadinessOwner,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    checks: preconditions,
    blockers: signal.blockers,
    warnings: signal.warnings,
    recommendedNextAction: "",
  } satisfies Omit<InventoryStockoutOfflinePilotCloseoutSummary, "recommendedNextAction"> & { recommendedNextAction: string };
  const summary: InventoryStockoutOfflinePilotCloseoutSummary = {
    ...summaryBase,
    recommendedNextAction: buildRecommendedNextAction(summaryBase as InventoryStockoutOfflinePilotCloseoutSummary),
  };
  const riskSignoff = buildRiskSignoff(summary);
  const auditExport = buildAuditExport({ generatedAt, summary, latestReviewExport, latestReviewPack, previousCloseouts });
  return { summary, latestReviewExport, latestReviewPack, preconditions, riskSignoff, auditExport, previousCloseouts };
};

export const buildInventoryStockoutOfflinePilotCloseoutContract = (): InventoryStockoutOfflinePilotCloseoutContract => buildContract();

export const buildInventoryStockoutOfflinePilotCloseout = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutOfflinePilotCloseoutResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput);
  const built = await buildSummary({ importId, request: options });
  return {
    generatedAt,
    contract: buildContract(),
    summary: built.summary,
    latestReviewExport: built.latestReviewExport,
    latestReviewPack: built.latestReviewPack,
    productionReadinessPreconditions: built.preconditions,
    riskSignoff: built.riskSignoff,
    auditExport: built.auditExport,
    previousCloseouts: built.previousCloseouts,
    operationalPolicy: {
      offlineCloseoutOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Closeout only documents preconditions for a separate future production-readiness phase; it does not enable production inference.",
    },
  };
};

export const recordInventoryStockoutOfflinePilotCloseout = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutOfflinePilotCloseoutResponse> => {
  const importId = asNumber(payload.importId);
  const response = await buildInventoryStockoutOfflinePilotCloseout(importId, payload);
  const record = await recordMlOfflinePilotCloseout({
    closeoutKey: CONTRACT_KEY,
    importId: response.summary.importId,
    reviewExportId: asNumber(response.latestReviewExport?.id),
    reviewPackId: asNumber(response.latestReviewPack?.id),
    modelKey: response.summary.modelKey,
    modelVersion: response.summary.modelVersion,
    dashboardStatus: response.summary.dashboardStatus,
    recommendation: response.summary.recommendation,
    rollbackStatus: response.summary.rollbackStatus,
    pilotReadinessPct: response.summary.pilotReadinessPct,
    shadowEvaluationsCount: response.summary.shadowEvaluationsCount,
    avgDeltaF1Pct: response.summary.avgDeltaF1Pct,
    avgDeltaBalancedAccuracyPct: response.summary.avgDeltaBalancedAccuracyPct,
    closeoutStatus: response.summary.closeoutStatus,
    productionReadinessPreconditionsMet: response.summary.productionReadinessPreconditionsMet,
    ownerSignoff: response.summary.ownerSignoff,
    ownerName: response.summary.ownerName,
    productionReadinessOwner: response.summary.productionReadinessOwner,
    closeoutSummary: response.summary as unknown as Record<string, unknown>,
    preconditions: response.productionReadinessPreconditions,
    riskSignoff: response.riskSignoff,
    auditExport: response.auditExport,
    policy: response.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...response, closeoutRecord: record as Record<string, unknown> | null };
};

export const listInventoryStockoutOfflinePilotCloseouts = async (importIdInput: unknown) => {
  return listMlOfflinePilotCloseoutsByImportId(importIdInput, 25);
};

export const buildMlOfflinePilotCloseoutCatalogSummary = async (): Promise<MlOfflinePilotCloseoutCatalogSummary> => {
  const current = await buildInventoryStockoutOfflinePilotCloseout();
  const lastCloseouts = await listMlOfflinePilotCloseouts(10) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentCloseout: current.summary,
    lastCloseouts,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
