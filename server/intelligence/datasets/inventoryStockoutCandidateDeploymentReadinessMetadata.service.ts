import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateDeploymentReadinessMetadataCheck,
  InventoryStockoutCandidateDeploymentReadinessMetadataContract,
  InventoryStockoutCandidateDeploymentReadinessMetadataResponse,
  InventoryStockoutCandidateDeploymentReadinessSignal,
  MlCandidateDeploymentReadinessMetadataCatalogSummary,
  OfflineCandidateDeploymentReadinessMetadataRecommendation,
  OfflineCandidateDeploymentReadinessMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_deployment_readiness_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9N" as const;

const metadataReadOnlyDeploymentReadinessSummary = true as const;
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
const rawTrainingCsvLoadingAllowedInBackend = false as const;
const backendThresholdExecutionAllowed = false as const;
const backendCalibrationExecutionAllowed = false as const;
const backendErrorAnalysisExecutionAllowed = false as const;
const backendRobustnessExecutionAllowed = false as const;
const backendDeploymentReadinessExecutionAllowed = false as const;

const READINESS_CHECK_KEYS = [
  "metadata_completeness_reviewable",
  "safety_status_reviewable",
  "metrics_coverage_reviewable",
  "calibration_coverage_reviewable",
  "error_analysis_coverage_reviewable",
  "robustness_coverage_reviewable",
  "limitations_reviewable",
  "not_production_approved",
  "no_backend_deployment_readiness_execution",
  "no_activation_or_decision_automation",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training table loading in backend.",
  "No backend threshold execution.",
  "No backend calibration execution.",
  "No backend error analysis execution.",
  "No backend robustness execution.",
  "No backend deployment readiness execution.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };
type Discovery = { value: unknown; source: string };

const safetyPolicy = {
  metadataReadOnlyDeploymentReadinessSummary,
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
  rawTrainingCsvLoadingAllowedInBackend,
  backendThresholdExecutionAllowed,
  backendCalibrationExecutionAllowed,
  backendErrorAnalysisExecutionAllowed,
  backendRobustnessExecutionAllowed,
  backendDeploymentReadinessExecutionAllowed,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (asRecord(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed) || {};
  } catch (_err) {
    return { parseWarning: "metadata_json_parse_failed" };
  }
};

const parseJsonValue = (value: unknown): unknown => {
  if (typeof value !== "string" || !value.trim()) return value;
  try { return JSON.parse(value); } catch (_err) { return value; }
};

const getPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((current, segment) => asRecord(current)?.[segment], source);

const hasContent = (value: unknown): boolean => {
  if (value === false) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  const recordValue = asRecord(value);
  return Boolean(recordValue && Object.keys(recordValue).length > 0);
};

const findAtPaths = (sources: MetadataSource[], paths: string[]): Discovery => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (hasContent(value)) return { source: `${source.name}.${path}`, value };
    }
  }
  return { source: "missing", value: null };
};

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const parsed = parseJsonValue(value);
  const record = asRecord(parsed);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const countItems = (value: unknown): number => {
  const parsed = parseJsonValue(value);
  if (Array.isArray(parsed)) return parsed.length;
  const record = asRecord(parsed);
  if (!record) return hasContent(parsed) ? 1 : 0;
  const nested = record.items ?? record.rows ?? record.signals ?? record.checks ?? record.buckets ?? record.limitations ?? record.warnings;
  if (Array.isArray(nested)) return nested.length;
  if (asRecord(nested)) return Object.keys(nested as Record<string, unknown>).length;
  return Object.keys(record).length ? 1 : 0;
};

const scoreFromDiscovery = (discovery: Discovery, fallback = 0): number => {
  const record = asRecord(parseJsonValue(discovery.value));
  const explicit = asNumber(record?.score ?? record?.readinessScore ?? record?.readiness_score ?? record?.coverageScore ?? record?.coverage_score ?? record?.qualityScorePct ?? record?.scorePct);
  if (explicit !== null) return explicit > 1 ? Math.max(0, Math.min(100, explicit)) : Math.round(explicit * 100);
  return hasContent(discovery.value) ? fallback : 0;
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateDeploymentReadinessMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const signal = (
  key: string,
  family: InventoryStockoutCandidateDeploymentReadinessSignal["family"],
  label: string,
  source: string,
  value: unknown,
  score: number | null,
  message: string,
): InventoryStockoutCandidateDeploymentReadinessSignal => ({
  key,
  family,
  label,
  status: source === "missing" ? "missing" : "available",
  source,
  value,
  score,
  message,
});

const buildContract = (): InventoryStockoutCandidateDeploymentReadinessMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline deployment readiness metadata summary for Inventory Stockout candidate models.",
  metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
  readOnly: true,
  allowedMetadataFamilies: [
    "metadata_completeness",
    "safety_status",
    "metrics_coverage",
    "calibration_coverage",
    "error_analysis_coverage",
    "robustness_coverage",
    "limitations",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

export const buildInventoryStockoutCandidateDeploymentReadinessMetadataContract = buildContract;

const buildMissingResponse = (inputId: unknown, contract: InventoryStockoutCandidateDeploymentReadinessMetadataContract, generatedAt: string): InventoryStockoutCandidateDeploymentReadinessMetadataResponse => ({
  success: true,
  contract,
  summary: {
    generatedAt,
    metadataImportId: null,
    candidatePackageId: "missing",
    modelKey: "inventory_stockout",
    modelVersion: "missing",
    predictionType: "classification",
    horizonDays: null,
    status: "candidate_not_found",
    recommendation: "import_candidate_evaluation_metadata_first",
    deploymentReadinessScorePct: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 1,
    totalCheckCount: READINESS_CHECK_KEYS.length,
    completenessScorePct: 0,
    safetyScorePct: 0,
    metricsCoverageScorePct: 0,
    calibrationCoverageScorePct: 0,
    errorAnalysisCoverageScorePct: 0,
    robustnessCoverageScorePct: 0,
    limitationCount: 0,
    readinessSignalCount: 0,
    warnings: [`Candidate evaluation metadata import was not found for id ${String(inputId ?? "missing")}.`],
    backendModelExecutionAllowed,
    backendInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    artifactActivationAllowed,
    rawTrainingCsvLoadingAllowedInBackend,
    backendThresholdExecutionAllowed,
    backendCalibrationExecutionAllowed,
    backendErrorAnalysisExecutionAllowed,
    backendRobustnessExecutionAllowed,
    backendDeploymentReadinessExecutionAllowed,
    recommendedNextAction: "Import Phase 9B candidate evaluation metadata before reviewing deployment readiness metadata.",
  },
  checks: [],
  readinessSignals: [],
  deploymentReadinessMetadataPreview: {},
  safetyPolicy,
});

export const buildInventoryStockoutCandidateDeploymentReadinessMetadata = async (input: { id: unknown }): Promise<InventoryStockoutCandidateDeploymentReadinessMetadataResponse> => {
  const row = await getMlCandidateEvaluationMetadataImportById(input.id) as RawImportRow | null;
  const contract = buildContract();
  const generatedAt = new Date().toISOString();
  if (!row) return buildMissingResponse(input.id, contract, generatedAt);

  const candidateManifest = parseJsonRecord(row.candidateManifestJson);
  const modelCard = parseJsonRecord(row.modelCardJson);
  const metrics = parseJsonRecord(row.metricsJson);
  const evaluationReport = parseJsonRecord(row.evaluationReportJson);
  const candidateOutputSample = parseJsonRecord(row.candidateOutputSampleJson);
  const importSummary = parseJsonRecord(row.importSummaryJson);
  const trainingValidation = parseJsonRecord(row.trainingPackageValidationReportJson);
  const sources: MetadataSource[] = [
    { name: "evaluationReport", record: evaluationReport },
    { name: "metrics", record: metrics },
    { name: "modelCard", record: modelCard },
    { name: "candidateManifest", record: candidateManifest },
    { name: "candidateOutputSample", record: candidateOutputSample },
    { name: "importSummary", record: importSummary },
    { name: "trainingPackageValidationReport", record: trainingValidation },
  ];

  const completenessDiscovery = findAtPaths(sources, [
    "deploymentReadiness.completeness",
    "deployment_readiness.completeness",
    "readiness.completeness",
    "metadataCompleteness",
    "metadata_completeness",
    "modelCard",
  ]);
  const safetyDiscovery = findAtPaths(sources, [
    "deploymentReadiness.safetyStatus",
    "deployment_readiness.safety_status",
    "readiness.safetyStatus",
    "safetyPolicy",
    "safety_policy",
  ]);
  const metricsDiscovery = findAtPaths(sources, [
    "deploymentReadiness.metricsCoverage",
    "deployment_readiness.metrics_coverage",
    "readiness.metricsCoverage",
    "metricsCoverage",
    "metrics",
  ]);
  const calibrationDiscovery = findAtPaths(sources, [
    "deploymentReadiness.calibrationCoverage",
    "deployment_readiness.calibration_coverage",
    "calibration",
    "calibrationMetadata",
    "calibration_metadata",
  ]);
  const errorDiscovery = findAtPaths(sources, [
    "deploymentReadiness.errorAnalysisCoverage",
    "deployment_readiness.error_analysis_coverage",
    "errorAnalysis",
    "error_analysis",
  ]);
  const robustnessDiscovery = findAtPaths(sources, [
    "deploymentReadiness.robustnessCoverage",
    "deployment_readiness.robustness_coverage",
    "robustness",
    "robustnessMetadata",
    "robustness_metadata",
  ]);
  const limitationsDiscovery = findAtPaths(sources, [
    "deploymentReadiness.limitations",
    "deployment_readiness.limitations",
    "knownLimitations",
    "known_limitations",
    "limitations",
  ]);

  const completenessScorePct = scoreFromDiscovery(completenessDiscovery, 70);
  const safetyScorePct = safetyDiscovery.source !== "missing" && String(row.safetyPolicyStatus ?? "").toLowerCase() !== "fail" ? 100 : 80;
  const metricsCoverageScorePct = scoreFromDiscovery(metricsDiscovery, Number(row.metricsStatus === "pass") ? 100 : 60);
  const calibrationCoverageScorePct = scoreFromDiscovery(calibrationDiscovery, 50);
  const errorAnalysisCoverageScorePct = scoreFromDiscovery(errorDiscovery, 50);
  const robustnessCoverageScorePct = scoreFromDiscovery(robustnessDiscovery, 50);
  const limitationCount = countItems(limitationsDiscovery.value);
  const safetyPolicyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();
  const metricsStatus = String(row.metricsStatus ?? "").toLowerCase();
  const validationStatus = String(row.validationStatus ?? "").toLowerCase();
  const outputContractStatus = String(row.outputContractStatus ?? "").toLowerCase();

  const checks = [
    makeCheck("metadata_completeness_reviewable", "Metadata completeness", 12, completenessDiscovery.source !== "missing" ? "pass" : "warning", completenessDiscovery.source, completenessDiscovery.value, "Candidate metadata completeness can be reviewed from imported JSON metadata."),
    makeCheck("safety_status_reviewable", "Safety status", 14, safetyPolicyStatus === "fail" ? "fail" : "pass", "metadataImport.safetyPolicyStatus", row.safetyPolicyStatus, "Safety metadata remains reviewable without backend execution."),
    makeCheck("metrics_coverage_reviewable", "Metrics coverage", 10, metricsStatus === "pass" ? "pass" : metricsDiscovery.source !== "missing" ? "warning" : "fail", metricsDiscovery.source, metricsDiscovery.value, "Metrics coverage is summarized from imported metadata."),
    makeCheck("calibration_coverage_reviewable", "Calibration coverage", 8, calibrationDiscovery.source !== "missing" ? "pass" : "warning", calibrationDiscovery.source, calibrationDiscovery.value, "Calibration coverage is displayed only when provided by the offline candidate package."),
    makeCheck("error_analysis_coverage_reviewable", "Error analysis coverage", 8, errorDiscovery.source !== "missing" ? "pass" : "warning", errorDiscovery.source, errorDiscovery.value, "Error-analysis coverage is displayed only when provided by the offline candidate package."),
    makeCheck("robustness_coverage_reviewable", "Robustness coverage", 8, robustnessDiscovery.source !== "missing" ? "pass" : "warning", robustnessDiscovery.source, robustnessDiscovery.value, "Robustness coverage is displayed only when provided by the offline candidate package."),
    makeCheck("limitations_reviewable", "Limitations", 8, limitationCount ? "pass" : "warning", limitationsDiscovery.source, limitationCount, "Known limitations should remain visible before any future offline review."),
    makeCheck("not_production_approved", "Not production approved", 10, "pass", "safetyPolicy.productionIntegrationAllowed", productionIntegrationAllowed, "Deployment readiness metadata is not production approval."),
    makeCheck("no_backend_deployment_readiness_execution", "No backend deployment readiness execution", 12, backendDeploymentReadinessExecutionAllowed === false ? "pass" : "fail", "safetyPolicy.backendDeploymentReadinessExecutionAllowed", backendDeploymentReadinessExecutionAllowed, "Backend deployment readiness execution is disabled."),
    makeCheck("no_activation_or_decision_automation", "No activation or decision automation", 10, outputContractStatus === "fail" ? "fail" : "pass", "metadataImport.outputContractStatus", row.outputContractStatus, "Readiness metadata does not activate a model or automate decisions."),
  ];
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const maxScore = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earnedScore = checks.reduce((sum, check) => sum + check.earned, 0);
  const deploymentReadinessScorePct = Math.round((earnedScore / maxScore) * 100);
  const status: OfflineCandidateDeploymentReadinessMetadataStatus = failCount > 0
    ? "deployment_readiness_metadata_warning"
    : warningCount > 0
      ? "deployment_readiness_metadata_warning"
      : "deployment_readiness_metadata_ready";
  const recommendation: OfflineCandidateDeploymentReadinessMetadataRecommendation = status === "deployment_readiness_metadata_ready"
    ? "review_deployment_readiness_metadata"
    : "add_offline_deployment_readiness_metadata_to_candidate_package";
  const warnings = checks.filter((check) => check.status !== "pass").map((check) => check.message);
  if (validationStatus === "fail") warnings.push("Training package validation status is fail in imported metadata.");

  const readinessSignals = [
    signal("metadata_completeness_reviewable", "completeness", "Metadata completeness", completenessDiscovery.source, completenessDiscovery.value, completenessScorePct, "Imported metadata completeness is summarized."),
    signal("safety_status_reviewable", "safety", "Safety status", safetyDiscovery.source, safetyDiscovery.value, safetyScorePct, "Safety policy remains metadata-only and backend-disabled."),
    signal("metrics_coverage_reviewable", "metrics_coverage", "Metrics coverage", metricsDiscovery.source, metricsDiscovery.value, metricsCoverageScorePct, "Metrics coverage is read from imported evaluation metadata."),
    signal("calibration_coverage_reviewable", "calibration_coverage", "Calibration coverage", calibrationDiscovery.source, calibrationDiscovery.value, calibrationCoverageScorePct, "Calibration metadata coverage is displayed if present."),
    signal("error_analysis_coverage_reviewable", "error_analysis_coverage", "Error analysis coverage", errorDiscovery.source, errorDiscovery.value, errorAnalysisCoverageScorePct, "Error-analysis metadata coverage is displayed if present."),
    signal("robustness_coverage_reviewable", "robustness_coverage", "Robustness coverage", robustnessDiscovery.source, robustnessDiscovery.value, robustnessCoverageScorePct, "Robustness metadata coverage is displayed if present."),
    signal("limitations_reviewable", "limitation", "Limitations", limitationsDiscovery.source, limitationsDiscovery.value, limitationCount ? 100 : 50, "Known limitations remain visible."),
  ];

  return {
    success: true,
    contract,
    summary: {
      generatedAt,
      metadataImportId: asNumber(row.id),
      candidatePackageId: String(row.candidatePackageId ?? candidateManifest.candidatePackageId ?? "unknown"),
      modelKey: String(row.modelKey ?? candidateManifest.modelKey ?? "inventory_stockout"),
      modelVersion: String(row.modelVersion ?? candidateManifest.modelVersion ?? "unknown"),
      predictionType: String(row.predictionType ?? candidateManifest.predictionType ?? "classification"),
      horizonDays: asNumber(row.horizonDays ?? candidateManifest.horizonDays),
      status,
      recommendation,
      deploymentReadinessScorePct,
      passCount,
      warningCount,
      failCount,
      totalCheckCount: checks.length,
      completenessScorePct,
      safetyScorePct,
      metricsCoverageScorePct,
      calibrationCoverageScorePct,
      errorAnalysisCoverageScorePct,
      robustnessCoverageScorePct,
      limitationCount,
      readinessSignalCount: readinessSignals.length,
      warnings,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      backendThresholdExecutionAllowed,
      backendCalibrationExecutionAllowed,
      backendErrorAnalysisExecutionAllowed,
      backendRobustnessExecutionAllowed,
      backendDeploymentReadinessExecutionAllowed,
      recommendedNextAction: status === "deployment_readiness_metadata_ready"
        ? "Review completeness, safety, metrics, calibration, error-analysis, robustness, and limitation coverage before any future offline metadata review step."
        : "Add offline deployment readiness metadata to the candidate package builder output; do not compute readiness by executing models in the backend.",
    },
    checks,
    readinessSignals,
    deploymentReadinessMetadataPreview: {
      completeness: previewRecord(completenessDiscovery.value),
      safetyStatus: previewRecord(safetyDiscovery.value),
      metricsCoverage: previewRecord(metricsDiscovery.value),
      calibrationCoverage: previewRecord(calibrationDiscovery.value),
      errorAnalysisCoverage: previewRecord(errorDiscovery.value),
      robustnessCoverage: previewRecord(robustnessDiscovery.value),
      limitations: previewRecord(limitationsDiscovery.value),
    },
    safetyPolicy,
  };
};

export const buildMlCandidateDeploymentReadinessMetadataCatalogSummary = async (query: Record<string, unknown> = {}): Promise<MlCandidateDeploymentReadinessMetadataCatalogSummary> => {
  const limit = query.limit ?? 8;
  const rows = await listMlCandidateEvaluationMetadataImports(limit) as Array<Record<string, unknown>>;
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const candidateCount = rows.length;
  const status: OfflineCandidateDeploymentReadinessMetadataStatus = candidateCount > 0 ? "deployment_readiness_metadata_warning" : "deployment_readiness_metadata_missing";
  const recommendation: OfflineCandidateDeploymentReadinessMetadataRecommendation = candidateCount > 0 ? "review_deployment_readiness_metadata" : "import_candidate_evaluation_metadata_first";
  return {
    generatedAt,
    contract,
    currentCandidateDeploymentReadinessMetadata: {
      generatedAt,
      status,
      recommendation,
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports",
      metadataReadOnlyDeploymentReadinessSummary,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      backendThresholdExecutionAllowed,
      backendCalibrationExecutionAllowed,
      backendErrorAnalysisExecutionAllowed,
      backendRobustnessExecutionAllowed,
      backendDeploymentReadinessExecutionAllowed,
    },
    recentCandidateImports: rows.map((row) => ({
      id: row.id,
      candidatePackageId: row.candidatePackageId,
      modelKey: row.modelKey,
      modelVersion: row.modelVersion,
      predictionType: row.predictionType,
      validationStatus: row.validationStatus,
      metricsStatus: row.metricsStatus,
      outputContractStatus: row.outputContractStatus,
      safetyPolicyStatus: row.safetyPolicyStatus,
      metadataImportStatus: row.metadataImportStatus,
      createdAt: row.createdAt,
    })),
    recommendedNextAction: candidateCount > 0
      ? "Open a candidate deployment readiness metadata summary to review completeness and coverage signals."
      : "Import Phase 9B candidate evaluation metadata before reviewing deployment readiness metadata.",
  };
};

/* Phase 9N anchors: inventory_stockout_offline_candidate_deployment_readiness_metadata_v1, metadataReadOnlyDeploymentReadinessSummary, backendDeploymentReadinessExecutionAllowed false, readinessSignals, deploymentReadinessMetadataPreview. */
