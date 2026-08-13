import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateErrorAnalysisItem,
  InventoryStockoutCandidateErrorAnalysisMetadataCheck,
  InventoryStockoutCandidateErrorAnalysisMetadataContract,
  InventoryStockoutCandidateErrorAnalysisMetadataResponse,
  InventoryStockoutCandidateErrorAnalysisSignal,
  MlCandidateErrorAnalysisMetadataCatalogSummary,
  OfflineCandidateErrorAnalysisMetadataRecommendation,
  OfflineCandidateErrorAnalysisMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_error_analysis_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9L" as const;

const metadataReadOnlyErrorAnalysisMetadata = true as const;
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

const ERROR_ANALYSIS_CHECK_KEYS = [
  "false_positive_metadata_reviewable",
  "false_negative_metadata_reviewable",
  "error_buckets_reviewable",
  "high_confidence_wrong_reviewable",
  "error_notes_reviewable",
  "no_backend_error_analysis_execution",
  "no_activation_or_decision_automation",
  "output_contract_safe_for_error_analysis_review",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No backend threshold execution.",
  "No backend calibration execution.",
  "No backend error analysis execution.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };
type ErrorAnalysisDiscovery = { value: unknown; source: string };

const safetyPolicy = {
  metadataReadOnlyErrorAnalysisMetadata,
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
  try {
    return JSON.parse(value);
  } catch (_err) {
    return value;
  }
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

const findAtPaths = (sources: MetadataSource[], paths: string[]): ErrorAnalysisDiscovery => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (hasContent(value)) return { source: `${source.name}.${path}`, value };
    }
  }
  return { source: "missing", value: null };
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 8);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (asRecord(value)) return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).filter(Boolean).slice(0, 8);
  return [];
};

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const parsed = parseJsonValue(value);
  const record = asRecord(parsed);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const entriesFromValue = (value: unknown): Array<[string, unknown]> => {
  const parsed = parseJsonValue(value);
  if (Array.isArray(parsed)) return parsed.map((entry, index) => [`item_${index + 1}`, entry]);
  const record = asRecord(parsed);
  if (!record) return [];
  const nested = record.items ?? record.errors ?? record.buckets ?? record.errorBuckets ?? record.error_buckets ?? record.rows ?? record.examples ?? parsed;
  if (Array.isArray(nested)) return nested.map((entry, index) => [`item_${index + 1}`, entry]);
  if (asRecord(nested)) return Object.entries(nested as Record<string, unknown>);
  return Object.entries(record);
};

const normalizeErrorItems = (
  value: unknown,
  source: string,
  family: InventoryStockoutCandidateErrorAnalysisItem["family"],
  defaultLabel: string,
): InventoryStockoutCandidateErrorAnalysisItem[] => entriesFromValue(value).map(([key, entry], index) => {
  const record = asRecord(entry) || { value: entry };
  const label = String(record.label ?? record.name ?? record.bucket ?? record.segment ?? record.type ?? key ?? `${defaultLabel}_${index + 1}`).trim();
  const count = asNumber(record.count ?? record.n ?? record.rows ?? record.errorCount ?? record.error_count ?? record.falsePositiveCount ?? record.falseNegativeCount);
  const rate = asNumber(record.rate ?? record.errorRate ?? record.error_rate ?? record.share ?? record.ratio ?? record.falsePositiveRate ?? record.falseNegativeRate);
  const confidence = asNumber(record.confidence ?? record.meanConfidence ?? record.mean_confidence ?? record.score ?? record.probability);
  const severityText = String(record.severity ?? record.risk ?? "").toLowerCase();
  const severity: InventoryStockoutCandidateErrorAnalysisItem["severity"] = severityText.includes("critical") || severityText.includes("high") ? "critical" : severityText.includes("warn") || severityText.includes("medium") ? "warning" : "info";
  return {
    key: String(key || `${family}_${index + 1}`),
    family,
    label: label || `${defaultLabel} ${index + 1}`,
    count,
    rate,
    confidence,
    severity,
    source,
    examples: asStringArray(record.examples ?? record.sampleIds ?? record.sample_ids ?? record.entityIds ?? record.entity_ids),
    notes: asStringArray(record.notes ?? record.warnings ?? record.limitations ?? record.message ?? record.description),
  };
});

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateErrorAnalysisMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const countFamily = (items: InventoryStockoutCandidateErrorAnalysisItem[], family: InventoryStockoutCandidateErrorAnalysisItem["family"]): number =>
  items.filter((item) => item.family === family).length;

const buildSignals = (
  falsePositiveDiscovery: ErrorAnalysisDiscovery,
  falseNegativeDiscovery: ErrorAnalysisDiscovery,
  bucketDiscovery: ErrorAnalysisDiscovery,
  highConfidenceWrongDiscovery: ErrorAnalysisDiscovery,
  noteDiscovery: ErrorAnalysisDiscovery,
  items: InventoryStockoutCandidateErrorAnalysisItem[],
): InventoryStockoutCandidateErrorAnalysisSignal[] => {
  const signal = (
    key: string,
    family: InventoryStockoutCandidateErrorAnalysisSignal["family"],
    label: string,
    count: number,
    source: string,
    value: unknown,
    message: string,
  ): InventoryStockoutCandidateErrorAnalysisSignal => ({
    key,
    family,
    label,
    status: count > 0 ? "available" : "missing",
    source,
    value,
    count,
    message,
  });
  const falsePositiveCount = countFamily(items, "false_positive");
  const falseNegativeCount = countFamily(items, "false_negative");
  const bucketCount = countFamily(items, "error_bucket");
  const highConfidenceWrongCount = countFamily(items, "high_confidence_wrong");
  const noteCount = countFamily(items, "error_note");
  return [
    signal("false_positive_metadata_reviewable", "false_positive", "False positive metadata", falsePositiveCount, falsePositiveDiscovery.source, falsePositiveDiscovery.value, falsePositiveCount ? "False-positive metadata is reviewable." : "False-positive metadata is missing."),
    signal("false_negative_metadata_reviewable", "false_negative", "False negative metadata", falseNegativeCount, falseNegativeDiscovery.source, falseNegativeDiscovery.value, falseNegativeCount ? "False-negative metadata is reviewable." : "False-negative metadata is missing."),
    signal("error_buckets_reviewable", "error_bucket", "Error buckets", bucketCount, bucketDiscovery.source, bucketDiscovery.value, bucketCount ? "Error bucket metadata is reviewable." : "Error bucket metadata is missing."),
    signal("high_confidence_wrong_reviewable", "high_confidence_wrong", "High-confidence wrong predictions", highConfidenceWrongCount, highConfidenceWrongDiscovery.source, highConfidenceWrongDiscovery.value, highConfidenceWrongCount ? "High-confidence wrong prediction metadata is reviewable." : "High-confidence wrong prediction metadata is missing."),
    signal("error_notes_reviewable", "error_note", "Error notes", noteCount, noteDiscovery.source, noteDiscovery.value, noteCount ? "Error notes are reviewable." : "Error notes metadata is missing."),
    signal("no_backend_error_analysis_execution", "safety", "No backend error analysis execution", 1, "safetyPolicy.backendErrorAnalysisExecutionAllowed", false, "Backend error analysis execution remains disabled."),
  ];
};

const buildChecks = (
  falsePositiveDiscovery: ErrorAnalysisDiscovery,
  falseNegativeDiscovery: ErrorAnalysisDiscovery,
  bucketDiscovery: ErrorAnalysisDiscovery,
  highConfidenceWrongDiscovery: ErrorAnalysisDiscovery,
  noteDiscovery: ErrorAnalysisDiscovery,
  items: InventoryStockoutCandidateErrorAnalysisItem[],
  row: RawImportRow,
) => {
  const signals = buildSignals(falsePositiveDiscovery, falseNegativeDiscovery, bucketDiscovery, highConfidenceWrongDiscovery, noteDiscovery, items);
  const falsePositiveCount = countFamily(items, "false_positive");
  const falseNegativeCount = countFamily(items, "false_negative");
  const bucketCount = countFamily(items, "error_bucket");
  const highConfidenceWrongCount = countFamily(items, "high_confidence_wrong");
  const noteCount = countFamily(items, "error_note");
  const outputContractStatus = String(row.outputContractStatus ?? "").toLowerCase();
  const safetyPolicyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();
  const checks = [
    makeCheck("false_positive_metadata_reviewable", "False positive metadata", 12, falsePositiveCount ? "pass" : "warning", falsePositiveDiscovery.source, falsePositiveCount, falsePositiveCount ? "False-positive metadata can be reviewed." : "False-positive metadata was not included in the imported candidate package."),
    makeCheck("false_negative_metadata_reviewable", "False negative metadata", 14, falseNegativeCount ? "pass" : "warning", falseNegativeDiscovery.source, falseNegativeCount, falseNegativeCount ? "False-negative metadata can be reviewed." : "False-negative metadata was not included in the imported candidate package."),
    makeCheck("error_buckets_reviewable", "Error buckets reviewable", 12, bucketCount ? "pass" : "warning", bucketDiscovery.source, bucketCount, bucketCount ? "Error buckets can be reviewed from metadata." : "Error bucket metadata is missing."),
    makeCheck("high_confidence_wrong_reviewable", "High-confidence wrong reviewable", 10, highConfidenceWrongCount ? "pass" : "warning", highConfidenceWrongDiscovery.source, highConfidenceWrongCount, highConfidenceWrongCount ? "High-confidence wrong prediction metadata can be reviewed." : "High-confidence wrong prediction metadata is missing."),
    makeCheck("error_notes_reviewable", "Error notes reviewable", 8, noteCount ? "pass" : "warning", noteDiscovery.source, noteCount, noteCount ? "Error notes and limitations are reviewable." : "Error notes metadata is missing."),
    makeCheck("no_backend_error_analysis_execution", "No backend error analysis execution", 14, backendErrorAnalysisExecutionAllowed === false ? "pass" : "fail", "safetyPolicy.backendErrorAnalysisExecutionAllowed", backendErrorAnalysisExecutionAllowed, "Backend error analysis execution is disabled."),
    makeCheck("no_activation_or_decision_automation", "No activation or decision automation", 16, safetyPolicyStatus === "pass" || safetyPolicyStatus === "warning" || !safetyPolicyStatus ? "pass" : "fail", "metadataImport.safetyPolicyStatus", row.safetyPolicyStatus, "Error analysis metadata does not activate a model or automate decisions."),
    makeCheck("output_contract_safe_for_error_analysis_review", "Safe output contract", 14, outputContractStatus === "pass" || outputContractStatus === "warning" || !outputContractStatus ? "pass" : "fail", "metadataImport.outputContractStatus", row.outputContractStatus, "Error analysis review relies on safe candidate-output metadata only."),
  ];
  return { checks, signals };
};

const buildContract = (): InventoryStockoutCandidateErrorAnalysisMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline error analysis metadata snapshot for Inventory Stockout candidate models.",
  metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
  readOnly: true,
  allowedMetadataFamilies: [
    "false_positive_metadata",
    "false_negative_metadata",
    "error_buckets",
    "high_confidence_wrong_predictions",
    "error_notes",
    "limitations",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

export const buildInventoryStockoutCandidateErrorAnalysisMetadataContract = buildContract;

const buildMissingResponse = (inputId: unknown, contract: InventoryStockoutCandidateErrorAnalysisMetadataContract, generatedAt: string): InventoryStockoutCandidateErrorAnalysisMetadataResponse => ({
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
    errorAnalysisScorePct: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 1,
    totalCheckCount: ERROR_ANALYSIS_CHECK_KEYS.length,
    errorItemCount: 0,
    falsePositiveMetadataCount: 0,
    falseNegativeMetadataCount: 0,
    highConfidenceWrongCount: 0,
    errorBucketCount: 0,
    errorNoteCount: 0,
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
    recommendedNextAction: "Import Phase 9B candidate evaluation metadata before reviewing error analysis metadata.",
  },
  checks: [],
  errorAnalysisSignals: [],
  errorAnalysisItems: [],
  errorAnalysisMetadataPreview: {},
  safetyPolicy,
});

export const buildInventoryStockoutCandidateErrorAnalysisMetadata = async (input: { id: unknown }): Promise<InventoryStockoutCandidateErrorAnalysisMetadataResponse> => {
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

  const falsePositiveDiscovery = findAtPaths(sources, [
    "errorAnalysis.falsePositives",
    "error_analysis.false_positives",
    "errors.falsePositives",
    "classification.falsePositives",
    "diagnostics.false_positive_metadata",
    "falsePositiveAnalysis",
  ]);
  const falseNegativeDiscovery = findAtPaths(sources, [
    "errorAnalysis.falseNegatives",
    "error_analysis.false_negatives",
    "errors.falseNegatives",
    "classification.falseNegatives",
    "diagnostics.false_negative_metadata",
    "falseNegativeAnalysis",
  ]);
  const bucketDiscovery = findAtPaths(sources, [
    "errorAnalysis.errorBuckets",
    "error_analysis.error_buckets",
    "errorBuckets",
    "diagnostics.errorBuckets",
    "metrics.errorBuckets",
    "slices.errorBuckets",
  ]);
  const highConfidenceWrongDiscovery = findAtPaths(sources, [
    "errorAnalysis.highConfidenceWrong",
    "error_analysis.high_confidence_wrong",
    "highConfidenceWrongPredictions",
    "diagnostics.highConfidenceWrong",
    "errors.highConfidenceWrong",
  ]);
  const noteDiscovery = findAtPaths(sources, [
    "errorAnalysis.notes",
    "error_analysis.notes",
    "errorAnalysis.limitations",
    "knownLimitations",
    "limitations",
    "modelCard.knownLimitations",
    "diagnostics.errorNotes",
  ]);

  const falsePositiveItems = normalizeErrorItems(falsePositiveDiscovery.value, falsePositiveDiscovery.source, "false_positive", "false positive");
  const falseNegativeItems = normalizeErrorItems(falseNegativeDiscovery.value, falseNegativeDiscovery.source, "false_negative", "false negative");
  const bucketItems = normalizeErrorItems(bucketDiscovery.value, bucketDiscovery.source, "error_bucket", "error bucket");
  const highConfidenceWrongItems = normalizeErrorItems(highConfidenceWrongDiscovery.value, highConfidenceWrongDiscovery.source, "high_confidence_wrong", "high-confidence wrong");
  const noteItems = normalizeErrorItems(noteDiscovery.value, noteDiscovery.source, "error_note", "error note");
  const errorAnalysisItems = [...falsePositiveItems, ...falseNegativeItems, ...bucketItems, ...highConfidenceWrongItems, ...noteItems];
  const { checks, signals } = buildChecks(falsePositiveDiscovery, falseNegativeDiscovery, bucketDiscovery, highConfidenceWrongDiscovery, noteDiscovery, errorAnalysisItems, row);
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earnedWeight = checks.reduce((sum, check) => sum + check.earned, 0);
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const errorItemCount = errorAnalysisItems.length;
  const status: OfflineCandidateErrorAnalysisMetadataStatus = failCount > 0
    ? "error_analysis_metadata_missing"
    : errorItemCount > 0 && warningCount === 0
      ? "error_analysis_metadata_ready"
      : errorItemCount > 0
        ? "error_analysis_metadata_warning"
        : "error_analysis_metadata_missing";
  const recommendation: OfflineCandidateErrorAnalysisMetadataRecommendation = status === "error_analysis_metadata_ready"
    ? "review_error_analysis_metadata"
    : "add_offline_error_analysis_metadata_to_candidate_package";
  const warnings = checks.filter((check) => check.status !== "pass").map((check) => check.message);

  return {
    success: true,
    contract,
    summary: {
      generatedAt,
      metadataImportId: Number(row.id) || null,
      candidatePackageId: String(row.candidatePackageId || candidateManifest.candidatePackageId || "unknown"),
      modelKey: String(row.modelKey || candidateManifest.modelKey || "inventory_stockout"),
      modelVersion: String(row.modelVersion || candidateManifest.modelVersion || "unknown"),
      predictionType: String(row.predictionType || candidateManifest.predictionType || "classification"),
      horizonDays: asNumber(row.horizonDays ?? candidateManifest.horizonDays),
      status,
      recommendation,
      errorAnalysisScorePct: Math.round((earnedWeight / totalWeight) * 100),
      passCount,
      warningCount,
      failCount,
      totalCheckCount: checks.length,
      errorItemCount,
      falsePositiveMetadataCount: falsePositiveItems.length,
      falseNegativeMetadataCount: falseNegativeItems.length,
      highConfidenceWrongCount: highConfidenceWrongItems.length,
      errorBucketCount: bucketItems.length,
      errorNoteCount: noteItems.length,
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
      recommendedNextAction: status === "error_analysis_metadata_ready"
        ? "Review false-positive, false-negative, bucket, and high-confidence error metadata before any future offline comparison step."
        : "Add offline error analysis metadata to the candidate package builder output; do not compute errors inside the backend.",
    },
    checks,
    errorAnalysisSignals: signals,
    errorAnalysisItems,
    errorAnalysisMetadataPreview: {
      falsePositives: previewRecord(falsePositiveDiscovery.value),
      falseNegatives: previewRecord(falseNegativeDiscovery.value),
      errorBuckets: previewRecord(bucketDiscovery.value),
      highConfidenceWrong: previewRecord(highConfidenceWrongDiscovery.value),
      notes: previewRecord(noteDiscovery.value),
    },
    safetyPolicy,
  };
};

export const buildMlCandidateErrorAnalysisMetadataCatalogSummary = async (query: Record<string, unknown> = {}): Promise<MlCandidateErrorAnalysisMetadataCatalogSummary> => {
  const limit = query.limit ?? 8;
  const rows = await listMlCandidateEvaluationMetadataImports(limit) as Array<Record<string, unknown>>;
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const candidateCount = rows.length;
  const status: OfflineCandidateErrorAnalysisMetadataStatus = candidateCount > 0 ? "error_analysis_metadata_warning" : "error_analysis_metadata_missing";
  const recommendation: OfflineCandidateErrorAnalysisMetadataRecommendation = candidateCount > 0 ? "review_error_analysis_metadata" : "import_candidate_evaluation_metadata_first";
  return {
    generatedAt,
    contract,
    currentCandidateErrorAnalysisMetadata: {
      generatedAt,
      status,
      recommendation,
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports",
      metadataReadOnlyErrorAnalysisMetadata,
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
    },
    recentCandidateImports: rows.slice(0, 8),
    recommendedNextAction: candidateCount > 0
      ? "Open Error analysis metadata from the offline comparison dashboard for an imported candidate."
      : "Import Phase 9B candidate evaluation metadata before reviewing error analysis metadata.",
  };
};

/* Phase 9L anchors: ml_candidate_evaluation_metadata_imports, inventory_stockout_offline_candidate_error_analysis_metadata_v1, metadata-only false positive false negative high confidence wrong error bucket review. */
