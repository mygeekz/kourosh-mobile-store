import { listMlCandidateEvaluationMetadataImports } from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutEvaluationComparisonDashboardContract,
  InventoryStockoutEvaluationComparisonDashboardResponse,
  InventoryStockoutEvaluationComparisonDashboardRow,
  MlCandidateEvaluationComparisonDashboardCatalogSummary,
  OfflineEvaluationComparisonDashboardRecommendation,
  OfflineEvaluationComparisonDashboardStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_evaluation_comparison_dashboard_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9C" as const;

const metadataReadOnlyDashboard = true as const;
const backendModelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const backendInferenceEndpointExposed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;
const canMutateBusinessRecords = false as const;
const artifactExecutionAllowed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowedInBackend = false as const;

const METRIC_COLUMNS = [
  "f1",
  "recallScore",
  "precisionScore",
  "rocAuc",
  "accuracy",
  "r2",
  "rmse",
  "mae",
] as const;

const RANKED_METRIC_PREFERENCE = [
  "classification:f1",
  "classification:recallScore",
  "classification:precisionScore",
  "classification:rocAuc",
  "classification:accuracy",
  "regression:r2",
  "regression:rmse_inverse",
  "regression:mae_inverse",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, or invoice records.",
] as const;

type RawImportRow = Record<string, unknown>;

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const isPass = (value: unknown): boolean => String(value ?? "").toLowerCase() === "pass";

const isReadyOrWarning = (value: unknown): boolean => {
  const text = String(value ?? "").toLowerCase();
  return text === "metadata_import_ready" || text === "metadata_import_warning";
};

const hasWarning = (row: RawImportRow): boolean => {
  const statuses = [
    row.validationStatus,
    row.metricsStatus,
    row.outputContractStatus,
    row.safetyPolicyStatus,
    row.metadataImportStatus,
  ].map((value) => String(value ?? "").toLowerCase());
  return statuses.some((status) => status.includes("warning"));
};

const isSafeMetadataCandidate = (row: RawImportRow): boolean =>
  isPass(row.outputContractStatus) && isPass(row.safetyPolicyStatus) && isReadyOrWarning(row.metadataImportStatus);

const isBlockedCandidate = (row: RawImportRow): boolean =>
  !isPass(row.outputContractStatus) || !isPass(row.safetyPolicyStatus) || !isReadyOrWarning(row.metadataImportStatus);

const scoreFromMetrics = (row: RawImportRow): { score: number | null; basis: string } => {
  const f1 = asNumber(row.f1);
  if (f1 !== null) return { score: f1, basis: "f1" };

  const recall = asNumber(row.recallScore);
  if (recall !== null) return { score: recall, basis: "recallScore" };

  const precision = asNumber(row.precisionScore);
  if (precision !== null) return { score: precision, basis: "precisionScore" };

  const rocAuc = asNumber(row.rocAuc);
  if (rocAuc !== null) return { score: rocAuc, basis: "rocAuc" };

  const accuracy = asNumber(row.accuracy);
  if (accuracy !== null) return { score: accuracy, basis: "accuracy" };

  const r2 = asNumber(row.r2);
  if (r2 !== null) return { score: r2, basis: "r2" };

  const rmse = asNumber(row.rmse);
  if (rmse !== null && rmse >= 0) return { score: 1 / (1 + rmse), basis: "rmse_inverse" };

  const mae = asNumber(row.mae);
  if (mae !== null && mae >= 0) return { score: 1 / (1 + mae), basis: "mae_inverse" };

  return { score: null, basis: "no_comparable_metric" };
};

const buildRow = (row: RawImportRow, rank: number): InventoryStockoutEvaluationComparisonDashboardRow => {
  const comparison = scoreFromMetrics(row);
  return {
    id: asNumber(row.id),
    rank,
    candidatePackageId: asString(row.candidatePackageId),
    modelKey: asString(row.modelKey),
    modelVersion: asString(row.modelVersion),
    modelFamily: asString(row.modelFamily),
    predictionType: asString(row.predictionType),
    targetColumn: asString(row.targetColumn),
    horizonDays: asNumber(row.horizonDays),
    trainingManifestHash: asString(row.trainingManifestHash),
    validationStatus: asString(row.validationStatus),
    metricsStatus: asString(row.metricsStatus),
    outputContractStatus: asString(row.outputContractStatus),
    safetyPolicyStatus: asString(row.safetyPolicyStatus),
    metadataImportStatus: asString(row.metadataImportStatus),
    accuracy: asNumber(row.accuracy),
    precisionScore: asNumber(row.precisionScore),
    recallScore: asNumber(row.recallScore),
    f1: asNumber(row.f1),
    rocAuc: asNumber(row.rocAuc),
    mae: asNumber(row.mae),
    rmse: asNumber(row.rmse),
    r2: asNumber(row.r2),
    comparisonScore: comparison.score,
    comparisonBasis: comparison.basis,
    safetyLocked: true,
    eligibleForProduction: false,
    activationAllowed: false,
    backendExecutionAllowed: false,
    createdAt: asString(row.createdAt),
  };
};

const sortRows = (rows: InventoryStockoutEvaluationComparisonDashboardRow[]): InventoryStockoutEvaluationComparisonDashboardRow[] =>
  [...rows]
    .sort((a, b) => {
      const aBlocked = a.outputContractStatus !== "pass" || a.safetyPolicyStatus !== "pass";
      const bBlocked = b.outputContractStatus !== "pass" || b.safetyPolicyStatus !== "pass";
      if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
      const aScore = a.comparisonScore ?? Number.NEGATIVE_INFINITY;
      const bScore = b.comparisonScore ?? Number.NEGATIVE_INFINITY;
      if (aScore !== bScore) return bScore - aScore;
      return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

const chooseStatus = (candidateCount: number, blockedCandidateCount: number, warningCandidateCount: number): OfflineEvaluationComparisonDashboardStatus => {
  if (candidateCount === 0) return "no_imported_candidates";
  if (blockedCandidateCount > 0 || warningCandidateCount > 0) return "comparison_warning";
  return "comparison_ready";
};

const chooseRecommendation = (status: OfflineEvaluationComparisonDashboardStatus): OfflineEvaluationComparisonDashboardRecommendation => {
  if (status === "no_imported_candidates") return "import_candidate_evaluation_metadata_first";
  if (status === "comparison_warning") return "review_candidate_metadata_warnings";
  return "compare_imported_metadata_only";
};

const safetyPolicy = {
  metadataReadOnlyDashboard,
  backendModelExecutionAllowed,
  runtimeInvocationAllowed,
  backendInferenceEndpointExposed,
  inferenceEndpointExposed,
  productionIntegrationAllowed,
  decisionAutomationAllowed,
  canChangeInventoryOrAccounting,
  canChangePricing,
  canChangeReports,
  canChangeLedger,
  canMutateBusinessRecords,
  artifactExecutionAllowed,
  artifactActivationAllowed,
  artifactBytesLoadingAllowedInBackend,
};

export const buildInventoryStockoutEvaluationComparisonDashboardContract = (): InventoryStockoutEvaluationComparisonDashboardContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Compare imported Phase 9B candidate evaluation metadata for offline review visibility only.",
  dashboardScope: "offline_candidate_evaluation_metadata_comparison_only",
  dataSource: "ml_candidate_evaluation_metadata_imports",
  comparedMetricFields: [...METRIC_COLUMNS],
  rankedMetricPreference: [...RANKED_METRIC_PREFERENCE],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  operationalPolicy: safetyPolicy,
});

export const buildInventoryStockoutEvaluationComparisonDashboard = async (
  input: Record<string, unknown> = {},
): Promise<InventoryStockoutEvaluationComparisonDashboardResponse> => {
  const limit = asNumber(input.limit) ?? 25;
  const importedRows = await listMlCandidateEvaluationMetadataImports(limit);
  const rawRows = Array.isArray(importedRows) ? importedRows as RawImportRow[] : [];
  const rows = sortRows(rawRows.map((row, index) => buildRow(row, index + 1)));
  const best = rows.find((row) => row.comparisonScore !== null && row.outputContractStatus === "pass" && row.safetyPolicyStatus === "pass") || null;
  const safeMetadataCandidateCount = rawRows.filter(isSafeMetadataCandidate).length;
  const warningCandidateCount = rawRows.filter(hasWarning).length;
  const blockedCandidateCount = rawRows.filter(isBlockedCandidate).length;
  const comparableCandidateCount = rows.filter((row) => row.comparisonScore !== null).length;
  const status = chooseStatus(rows.length, blockedCandidateCount, warningCandidateCount);
  const recommendation = chooseRecommendation(status);
  const generatedAt = new Date().toISOString();

  const summary = {
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    candidateCount: rows.length,
    comparableCandidateCount,
    safeMetadataCandidateCount,
    warningCandidateCount,
    blockedCandidateCount,
    bestCandidatePackageId: best?.candidatePackageId ?? null,
    bestModelVersion: best?.modelVersion ?? null,
    bestComparisonScore: best?.comparisonScore ?? null,
    bestComparisonBasis: best?.comparisonBasis ?? null,
    metadataReadOnlyDashboard,
    backendModelExecutionAllowed,
    runtimeInvocationAllowed,
    backendInferenceEndpointExposed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    canMutateBusinessRecords,
    artifactExecutionAllowed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowedInBackend,
    recommendedNextAction: status === "no_imported_candidates"
      ? "Import Phase 9A candidate evaluation metadata first; do not activate or execute any model."
      : "Compare metadata metrics and safety flags only; keep backend execution, inference, activation, and mutation disabled.",
  };

  return {
    success: true,
    contract: buildInventoryStockoutEvaluationComparisonDashboardContract(),
    summary,
    rows,
    metricColumns: [...METRIC_COLUMNS],
    safetyPolicy,
  };
};

export const buildMlCandidateEvaluationComparisonDashboardCatalogSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlCandidateEvaluationComparisonDashboardCatalogSummary> => {
  const dashboard = await buildInventoryStockoutEvaluationComparisonDashboard(input);
  return {
    generatedAt: new Date().toISOString(),
    contract: dashboard.contract,
    currentEvaluationComparisonDashboard: dashboard.summary,
    rows: dashboard.rows,
    recommendedNextAction: dashboard.summary.recommendedNextAction,
  };
};

/* Phase 9C anchors: inventory_stockout_offline_evaluation_comparison_dashboard_v1, metadataReadOnlyDashboard, no backend model execution, no inference endpoint, no activation, no business mutation. */
