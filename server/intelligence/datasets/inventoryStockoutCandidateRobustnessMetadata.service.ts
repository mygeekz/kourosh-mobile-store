import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateRobustnessItem,
  InventoryStockoutCandidateRobustnessMetadataCheck,
  InventoryStockoutCandidateRobustnessMetadataContract,
  InventoryStockoutCandidateRobustnessMetadataResponse,
  InventoryStockoutCandidateRobustnessSignal,
  MlCandidateRobustnessMetadataCatalogSummary,
  OfflineCandidateRobustnessMetadataRecommendation,
  OfflineCandidateRobustnessMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_robustness_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9M" as const;

const metadataReadOnlyRobustnessMetadata = true as const;
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

const ROBUSTNESS_CHECK_KEYS = [
  "stress_test_metadata_reviewable",
  "edge_case_metadata_reviewable",
  "low_sample_segment_metadata_reviewable",
  "missing_feature_stress_metadata_reviewable",
  "robustness_warnings_reviewable",
  "limitation_notes_reviewable",
  "no_backend_robustness_execution",
  "no_activation_or_decision_automation",
  "output_contract_safe_for_robustness_review",
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
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };
type RobustnessDiscovery = { value: unknown; source: string };

const safetyPolicy = {
  metadataReadOnlyRobustnessMetadata,
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

const findAtPaths = (sources: MetadataSource[], paths: string[]): RobustnessDiscovery => {
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
  const nested = record.items ?? record.robustnessItems ?? record.robustness_items ?? record.scenarios ?? record.segments ?? record.buckets ?? record.rows ?? record.examples ?? parsed;
  if (Array.isArray(nested)) return nested.map((entry, index) => [`item_${index + 1}`, entry]);
  if (asRecord(nested)) return Object.entries(nested as Record<string, unknown>);
  return Object.entries(record);
};

const normalizeRobustnessItems = (
  value: unknown,
  source: string,
  family: InventoryStockoutCandidateRobustnessItem["family"],
  defaultLabel: string,
): InventoryStockoutCandidateRobustnessItem[] => entriesFromValue(value).map(([key, entry], index) => {
  const record = asRecord(entry) || { value: entry };
  const label = String(record.label ?? record.name ?? record.bucket ?? record.segment ?? record.scenario ?? record.type ?? key ?? `${defaultLabel}_${index + 1}`).trim();
  const score = asNumber(record.score ?? record.robustnessScore ?? record.robustness_score ?? record.passRate ?? record.pass_rate ?? record.stabilityScore ?? record.stability_score);
  const metric = asNumber(record.metric ?? record.f1 ?? record.recall ?? record.precision ?? record.accuracy ?? record.errorRate ?? record.error_rate ?? record.delta ?? record.drift ?? record.rate);
  const rowCount = asNumber(record.rowCount ?? record.row_count ?? record.rows ?? record.n ?? record.sampleCount ?? record.sample_count ?? record.count);
  const severityText = String(record.severity ?? record.risk ?? record.status ?? "").toLowerCase();
  const severity: InventoryStockoutCandidateRobustnessItem["severity"] = severityText.includes("critical") || severityText.includes("high") || severityText.includes("fail") ? "critical" : severityText.includes("warn") || severityText.includes("medium") ? "warning" : "info";
  return {
    key: String(key || `${family}_${index + 1}`),
    family,
    label: label || `${defaultLabel} ${index + 1}`,
    score,
    metric,
    rowCount,
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
): InventoryStockoutCandidateRobustnessMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const countFamily = (items: InventoryStockoutCandidateRobustnessItem[], family: InventoryStockoutCandidateRobustnessItem["family"]): number =>
  items.filter((item) => item.family === family).length;

const buildSignals = (
  stressDiscovery: RobustnessDiscovery,
  edgeCaseDiscovery: RobustnessDiscovery,
  lowSampleDiscovery: RobustnessDiscovery,
  missingFeatureDiscovery: RobustnessDiscovery,
  warningDiscovery: RobustnessDiscovery,
  limitationDiscovery: RobustnessDiscovery,
  items: InventoryStockoutCandidateRobustnessItem[],
): InventoryStockoutCandidateRobustnessSignal[] => {
  const signal = (
    key: string,
    family: InventoryStockoutCandidateRobustnessSignal["family"],
    label: string,
    count: number,
    source: string,
    value: unknown,
    message: string,
  ): InventoryStockoutCandidateRobustnessSignal => ({
    key,
    family,
    label,
    status: count > 0 ? "available" : "missing",
    source,
    value,
    count,
    message,
  });
  const stressTestCount = countFamily(items, "stress_test");
  const edgeCaseCount = countFamily(items, "edge_case");
  const lowSampleSegmentCount = countFamily(items, "low_sample_segment");
  const missingFeatureStressCount = countFamily(items, "missing_feature_stress");
  const robustnessWarningCount = countFamily(items, "robustness_warning");
  const limitationCount = countFamily(items, "limitation");
  return [
    signal("stress_test_metadata_reviewable", "stress_test", "Stress-test metadata", stressTestCount, stressDiscovery.source, stressDiscovery.value, stressTestCount ? "Stress-test metadata is reviewable." : "Stress-test metadata is missing."),
    signal("edge_case_metadata_reviewable", "edge_case", "Edge-case metadata", edgeCaseCount, edgeCaseDiscovery.source, edgeCaseDiscovery.value, edgeCaseCount ? "Edge-case metadata is reviewable." : "Edge-case metadata is missing."),
    signal("low_sample_segment_metadata_reviewable", "low_sample_segment", "Low-sample segment metadata", lowSampleSegmentCount, lowSampleDiscovery.source, lowSampleDiscovery.value, lowSampleSegmentCount ? "Low-sample segment metadata is reviewable." : "Low-sample segment metadata is missing."),
    signal("missing_feature_stress_metadata_reviewable", "missing_feature_stress", "Missing-feature stress metadata", missingFeatureStressCount, missingFeatureDiscovery.source, missingFeatureDiscovery.value, missingFeatureStressCount ? "Missing-feature stress metadata is reviewable." : "Missing-feature stress metadata is missing."),
    signal("robustness_warnings_reviewable", "robustness_warning", "Robustness warnings", robustnessWarningCount, warningDiscovery.source, warningDiscovery.value, robustnessWarningCount ? "Robustness warnings are reviewable." : "Robustness warning metadata is missing."),
    signal("limitation_notes_reviewable", "limitation", "Limitation notes", limitationCount, limitationDiscovery.source, limitationDiscovery.value, limitationCount ? "Limitation notes are reviewable." : "Limitation notes are missing."),
    signal("no_backend_robustness_execution", "safety", "No backend robustness execution", 1, "safetyPolicy.backendRobustnessExecutionAllowed", false, "Backend robustness execution remains disabled."),
  ];
};

const buildChecks = (
  stressDiscovery: RobustnessDiscovery,
  edgeCaseDiscovery: RobustnessDiscovery,
  lowSampleDiscovery: RobustnessDiscovery,
  missingFeatureDiscovery: RobustnessDiscovery,
  warningDiscovery: RobustnessDiscovery,
  limitationDiscovery: RobustnessDiscovery,
  items: InventoryStockoutCandidateRobustnessItem[],
  row: RawImportRow,
) => {
  const signals = buildSignals(stressDiscovery, edgeCaseDiscovery, lowSampleDiscovery, missingFeatureDiscovery, warningDiscovery, limitationDiscovery, items);
  const stressTestCount = countFamily(items, "stress_test");
  const edgeCaseCount = countFamily(items, "edge_case");
  const lowSampleSegmentCount = countFamily(items, "low_sample_segment");
  const missingFeatureStressCount = countFamily(items, "missing_feature_stress");
  const robustnessWarningCount = countFamily(items, "robustness_warning");
  const limitationCount = countFamily(items, "limitation");
  const outputContractStatus = String(row.outputContractStatus ?? "").toLowerCase();
  const safetyPolicyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();
  const checks = [
    makeCheck("stress_test_metadata_reviewable", "Stress-test metadata", 12, stressTestCount ? "pass" : "warning", stressDiscovery.source, stressTestCount, stressTestCount ? "Stress-test metadata can be reviewed." : "Stress-test metadata was not included in the imported candidate package."),
    makeCheck("edge_case_metadata_reviewable", "Edge-case metadata", 12, edgeCaseCount ? "pass" : "warning", edgeCaseDiscovery.source, edgeCaseCount, edgeCaseCount ? "Edge-case metadata can be reviewed." : "Edge-case metadata was not included in the imported candidate package."),
    makeCheck("low_sample_segment_metadata_reviewable", "Low-sample segment metadata", 10, lowSampleSegmentCount ? "pass" : "warning", lowSampleDiscovery.source, lowSampleSegmentCount, lowSampleSegmentCount ? "Low-sample segment metadata can be reviewed." : "Low-sample segment metadata is missing."),
    makeCheck("missing_feature_stress_metadata_reviewable", "Missing-feature stress metadata", 10, missingFeatureStressCount ? "pass" : "warning", missingFeatureDiscovery.source, missingFeatureStressCount, missingFeatureStressCount ? "Missing-feature stress metadata can be reviewed." : "Missing-feature stress metadata is missing."),
    makeCheck("robustness_warnings_reviewable", "Robustness warnings", 8, robustnessWarningCount ? "pass" : "warning", warningDiscovery.source, robustnessWarningCount, robustnessWarningCount ? "Robustness warnings can be reviewed." : "Robustness warning metadata is missing."),
    makeCheck("limitation_notes_reviewable", "Limitation notes", 8, limitationCount ? "pass" : "warning", limitationDiscovery.source, limitationCount, limitationCount ? "Limitations are reviewable." : "Limitation notes are missing."),
    makeCheck("no_backend_robustness_execution", "No backend robustness execution", 14, backendRobustnessExecutionAllowed === false ? "pass" : "fail", "safetyPolicy.backendRobustnessExecutionAllowed", backendRobustnessExecutionAllowed, "Backend robustness execution is disabled."),
    makeCheck("no_activation_or_decision_automation", "No activation or decision automation", 14, safetyPolicyStatus === "pass" || safetyPolicyStatus === "warning" || !safetyPolicyStatus ? "pass" : "fail", "metadataImport.safetyPolicyStatus", row.safetyPolicyStatus, "Robustness metadata does not activate a model or automate decisions."),
    makeCheck("output_contract_safe_for_robustness_review", "Safe output contract", 12, outputContractStatus === "pass" || outputContractStatus === "warning" || !outputContractStatus ? "pass" : "fail", "metadataImport.outputContractStatus", row.outputContractStatus, "Robustness review relies on safe candidate-output metadata only."),
  ];
  return { checks, signals };
};

const buildContract = (): InventoryStockoutCandidateRobustnessMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline robustness and stress-test metadata snapshot for Inventory Stockout candidate models.",
  metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
  readOnly: true,
  allowedMetadataFamilies: [
    "stress_test_metadata",
    "edge_case_metadata",
    "low_sample_segment_metadata",
    "missing_feature_stress_metadata",
    "robustness_warnings",
    "limitations",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

export const buildInventoryStockoutCandidateRobustnessMetadataContract = buildContract;

const buildMissingResponse = (inputId: unknown, contract: InventoryStockoutCandidateRobustnessMetadataContract, generatedAt: string): InventoryStockoutCandidateRobustnessMetadataResponse => ({
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
    robustnessScorePct: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 1,
    totalCheckCount: ROBUSTNESS_CHECK_KEYS.length,
    robustnessItemCount: 0,
    stressTestCount: 0,
    edgeCaseCount: 0,
    lowSampleSegmentCount: 0,
    missingFeatureStressCount: 0,
    robustnessWarningCount: 0,
    limitationCount: 0,
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
    recommendedNextAction: "Import Phase 9B candidate evaluation metadata before reviewing robustness metadata.",
  },
  checks: [],
  robustnessSignals: [],
  robustnessItems: [],
  robustnessMetadataPreview: {},
  safetyPolicy,
});

export const buildInventoryStockoutCandidateRobustnessMetadata = async (input: { id: unknown }): Promise<InventoryStockoutCandidateRobustnessMetadataResponse> => {
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

  const stressDiscovery = findAtPaths(sources, [
    "robustness.stressTests",
    "robustness.stress_tests",
    "stressTests",
    "stress_tests",
    "diagnostics.robustness.stressTests",
    "evaluation.robustness.stressTests",
  ]);
  const edgeCaseDiscovery = findAtPaths(sources, [
    "robustness.edgeCases",
    "robustness.edge_cases",
    "edgeCases",
    "edge_cases",
    "diagnostics.edgeCases",
    "sliceDiagnostics.edgeCases",
  ]);
  const lowSampleDiscovery = findAtPaths(sources, [
    "robustness.lowSampleSegments",
    "robustness.low_sample_segments",
    "lowSampleSegments",
    "low_sample_segments",
    "sliceDiagnostics.lowSampleSegments",
    "diagnostics.low_sample_segments",
  ]);
  const missingFeatureDiscovery = findAtPaths(sources, [
    "robustness.missingFeatureStress",
    "robustness.missing_feature_stress",
    "missingFeatureStress",
    "missing_feature_stress",
    "diagnostics.missingFeatureStress",
    "dataQuality.missingFeatureStress",
  ]);
  const warningDiscovery = findAtPaths(sources, [
    "robustness.warnings",
    "robustnessWarnings",
    "robustness_warnings",
    "warnings.robustness",
    "diagnostics.robustnessWarnings",
  ]);
  const limitationDiscovery = findAtPaths(sources, [
    "robustness.limitations",
    "limitations.robustness",
    "knownLimitations.robustness",
    "known_limitations.robustness",
    "modelCard.knownLimitations",
    "knownLimitations",
    "known_limitations",
  ]);

  const stressItems = normalizeRobustnessItems(stressDiscovery.value, stressDiscovery.source, "stress_test", "Stress test");
  const edgeCaseItems = normalizeRobustnessItems(edgeCaseDiscovery.value, edgeCaseDiscovery.source, "edge_case", "Edge case");
  const lowSampleItems = normalizeRobustnessItems(lowSampleDiscovery.value, lowSampleDiscovery.source, "low_sample_segment", "Low-sample segment");
  const missingFeatureItems = normalizeRobustnessItems(missingFeatureDiscovery.value, missingFeatureDiscovery.source, "missing_feature_stress", "Missing-feature stress");
  const warningItems = normalizeRobustnessItems(warningDiscovery.value, warningDiscovery.source, "robustness_warning", "Robustness warning");
  const limitationItems = normalizeRobustnessItems(limitationDiscovery.value, limitationDiscovery.source, "limitation", "Limitation");
  const robustnessItems = [
    ...stressItems,
    ...edgeCaseItems,
    ...lowSampleItems,
    ...missingFeatureItems,
    ...warningItems,
    ...limitationItems,
  ];

  const { checks, signals } = buildChecks(stressDiscovery, edgeCaseDiscovery, lowSampleDiscovery, missingFeatureDiscovery, warningDiscovery, limitationDiscovery, robustnessItems, row);
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earnedWeight = checks.reduce((sum, check) => sum + check.earned, 0);
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const robustnessItemCount = robustnessItems.length;
  const status: OfflineCandidateRobustnessMetadataStatus = failCount > 0
    ? "robustness_metadata_missing"
    : robustnessItemCount > 0 && warningCount === 0
      ? "robustness_metadata_ready"
      : robustnessItemCount > 0
        ? "robustness_metadata_warning"
        : "robustness_metadata_missing";
  const recommendation: OfflineCandidateRobustnessMetadataRecommendation = status === "robustness_metadata_ready"
    ? "review_robustness_metadata"
    : "add_offline_robustness_metadata_to_candidate_package";
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
      robustnessScorePct: Math.round((earnedWeight / totalWeight) * 100),
      passCount,
      warningCount,
      failCount,
      totalCheckCount: checks.length,
      robustnessItemCount,
      stressTestCount: stressItems.length,
      edgeCaseCount: edgeCaseItems.length,
      lowSampleSegmentCount: lowSampleItems.length,
      missingFeatureStressCount: missingFeatureItems.length,
      robustnessWarningCount: warningItems.length,
      limitationCount: limitationItems.length,
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
      recommendedNextAction: status === "robustness_metadata_ready"
        ? "Review stress-test, edge-case, low-sample, missing-feature, warning, and limitation metadata before any future offline comparison step."
        : "Add offline robustness metadata to the candidate package builder output; do not compute robustness inside the backend.",
    },
    checks,
    robustnessSignals: signals,
    robustnessItems,
    robustnessMetadataPreview: {
      stressTests: previewRecord(stressDiscovery.value),
      edgeCases: previewRecord(edgeCaseDiscovery.value),
      lowSampleSegments: previewRecord(lowSampleDiscovery.value),
      missingFeatureStress: previewRecord(missingFeatureDiscovery.value),
      warnings: previewRecord(warningDiscovery.value),
      limitations: previewRecord(limitationDiscovery.value),
    },
    safetyPolicy,
  };
};

export const buildMlCandidateRobustnessMetadataCatalogSummary = async (query: Record<string, unknown> = {}): Promise<MlCandidateRobustnessMetadataCatalogSummary> => {
  const limit = query.limit ?? 8;
  const rows = await listMlCandidateEvaluationMetadataImports(limit) as Array<Record<string, unknown>>;
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const candidateCount = rows.length;
  const status: OfflineCandidateRobustnessMetadataStatus = candidateCount > 0 ? "robustness_metadata_warning" : "robustness_metadata_missing";
  const recommendation: OfflineCandidateRobustnessMetadataRecommendation = candidateCount > 0 ? "review_robustness_metadata" : "import_candidate_evaluation_metadata_first";
  return {
    generatedAt,
    contract,
    currentCandidateRobustnessMetadata: {
      generatedAt,
      status,
      recommendation,
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports",
      metadataReadOnlyRobustnessMetadata,
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
      ? "Open a candidate robustness metadata panel to review offline stress-test and edge-case evidence."
      : "Import Phase 9B candidate evaluation metadata before reviewing robustness metadata.",
  };
};

/* Phase 9M anchors: inventory_stockout_offline_candidate_robustness_metadata_v1, metadataReadOnlyRobustnessMetadata, backendRobustnessExecutionAllowed false, robustnessItems, robustnessSignals. */
