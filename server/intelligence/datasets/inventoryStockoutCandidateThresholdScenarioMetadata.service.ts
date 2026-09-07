import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateThresholdScenario,
  InventoryStockoutCandidateThresholdScenarioMetadataCheck,
  InventoryStockoutCandidateThresholdScenarioMetadataContract,
  InventoryStockoutCandidateThresholdScenarioMetadataResponse,
  InventoryStockoutCandidateThresholdScenarioSignal,
  MlCandidateThresholdScenarioMetadataCatalogSummary,
  OfflineCandidateThresholdScenarioMetadataRecommendation,
  OfflineCandidateThresholdScenarioMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_threshold_scenario_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9J" as const;

const metadataReadOnlyThresholdScenarioMetadata = true as const;
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

const THRESHOLD_SCENARIO_CHECK_KEYS = [
  "threshold_scenario_metadata_available",
  "threshold_values_reviewable",
  "precision_by_threshold_reviewable",
  "recall_by_threshold_reviewable",
  "f1_by_threshold_reviewable",
  "business_safe_scenario_labels_reviewable",
  "no_backend_threshold_execution",
  "no_activation_or_decision_automation",
  "output_contract_safe_for_threshold_review",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No backend threshold execution.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };

type ThresholdScenarioDiscovery = {
  value: unknown;
  source: string;
};

const safetyPolicy = {
  metadataReadOnlyThresholdScenarioMetadata,
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

const findAtPaths = (sources: MetadataSource[], paths: string[]): ThresholdScenarioDiscovery => {
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
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (asRecord(value)) return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).filter(Boolean);
  return [];
};

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const normalizeThresholdScenarios = (value: unknown, source: string): InventoryStockoutCandidateThresholdScenario[] => {
  const parsed = parseJsonValue(value);
  const entries: Array<[string, unknown]> = Array.isArray(parsed)
    ? parsed.map((entry, index) => [`scenario_${index + 1}`, entry])
    : asRecord(parsed)
      ? Object.entries(parsed as Record<string, unknown>)
      : [];

  return entries.map(([key, entry], index) => {
    const record = asRecord(entry) || { value: entry };
    const threshold = asNumber(
      record.threshold ?? record.scoreThreshold ?? record.decisionThreshold ?? record.cutoff ?? record.probabilityThreshold ?? key,
    );
    const precisionScore = asNumber(record.precision ?? record.precisionScore ?? record.precision_score);
    const recallScore = asNumber(record.recall ?? record.recallScore ?? record.recall_score);
    const f1 = asNumber(record.f1 ?? record.f1Score ?? record.f1_score);
    const accuracy = asNumber(record.accuracy ?? record.accuracyScore ?? record.accuracy_score);
    const predictedPositiveRate = asNumber(record.predictedPositiveRate ?? record.positiveRate ?? record.predictionPositiveRate);
    const label = String(record.label ?? record.scenarioLabel ?? record.name ?? key ?? `threshold_${index + 1}`).trim();
    const safeScenarioLabel = String(
      record.safeScenarioLabel ?? record.businessSafeScenarioLabel ?? record.businessLabel ?? label ?? `threshold_${index + 1}`,
    ).trim();
    return {
      key: String(key || `scenario_${index + 1}`),
      threshold,
      label: label || `threshold_${index + 1}`,
      precisionScore,
      recallScore,
      f1,
      accuracy,
      predictedPositiveRate,
      source,
      safeScenarioLabel: safeScenarioLabel || "offline review scenario",
      notes: asStringArray(record.notes ?? record.warnings ?? record.limitations),
    };
  });
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateThresholdScenarioMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const bestThresholdBy = (scenarios: InventoryStockoutCandidateThresholdScenario[], field: "f1" | "recallScore" | "precisionScore") => {
  const sorted = scenarios
    .filter((scenario) => scenario.threshold !== null && asNumber(scenario[field]) !== null)
    .sort((a, b) => Number(b[field]) - Number(a[field]));
  return sorted[0]?.threshold ?? null;
};

const buildSignals = (
  discovery: ThresholdScenarioDiscovery,
  scenarios: InventoryStockoutCandidateThresholdScenario[],
): InventoryStockoutCandidateThresholdScenarioSignal[] => {
  const thresholdValueCount = scenarios.filter((scenario) => scenario.threshold !== null).length;
  const precisionScenarioCount = scenarios.filter((scenario) => scenario.precisionScore !== null).length;
  const recallScenarioCount = scenarios.filter((scenario) => scenario.recallScore !== null).length;
  const f1ScenarioCount = scenarios.filter((scenario) => scenario.f1 !== null).length;
  const safeLabelCount = scenarios.filter((scenario) => scenario.safeScenarioLabel).length;
  const signal = (
    key: string,
    family: InventoryStockoutCandidateThresholdScenarioSignal["family"],
    label: string,
    count: number,
    source: string,
    value: unknown,
    message: string,
  ): InventoryStockoutCandidateThresholdScenarioSignal => ({
    key,
    family,
    label,
    status: count > 0 ? "available" : "missing",
    source,
    value,
    count,
    message,
  });
  return [
    signal("threshold_scenario_metadata_available", "threshold_metadata", "Threshold scenario metadata", scenarios.length, discovery.source, discovery.value, scenarios.length ? "Offline threshold scenario metadata is available." : "No threshold scenario metadata is available."),
    signal("threshold_values_reviewable", "threshold_values", "Threshold values", thresholdValueCount, discovery.source, thresholdValueCount, thresholdValueCount ? "Threshold values are reviewable." : "Threshold values are missing."),
    signal("precision_by_threshold_reviewable", "precision", "Precision by threshold", precisionScenarioCount, discovery.source, precisionScenarioCount, precisionScenarioCount ? "Precision is available for threshold scenarios." : "Precision-by-threshold metadata is missing."),
    signal("recall_by_threshold_reviewable", "recall", "Recall by threshold", recallScenarioCount, discovery.source, recallScenarioCount, recallScenarioCount ? "Recall is available for threshold scenarios." : "Recall-by-threshold metadata is missing."),
    signal("f1_by_threshold_reviewable", "f1", "F1 by threshold", f1ScenarioCount, discovery.source, f1ScenarioCount, f1ScenarioCount ? "F1 is available for threshold scenarios." : "F1-by-threshold metadata is missing."),
    signal("business_safe_scenario_labels_reviewable", "safe_labels", "Business-safe scenario labels", safeLabelCount, discovery.source, safeLabelCount, safeLabelCount ? "Scenario labels are descriptive metadata only." : "Business-safe scenario labels are missing."),
    signal("no_backend_threshold_execution", "safety", "No backend threshold execution", 1, "safetyPolicy.backendThresholdExecutionAllowed", false, "Backend threshold execution remains disabled."),
  ];
};

const buildChecks = (
  discovery: ThresholdScenarioDiscovery,
  scenarios: InventoryStockoutCandidateThresholdScenario[],
  row: RawImportRow,
) => {
  const signals = buildSignals(discovery, scenarios);
  const thresholdValueCount = scenarios.filter((scenario) => scenario.threshold !== null).length;
  const precisionScenarioCount = scenarios.filter((scenario) => scenario.precisionScore !== null).length;
  const recallScenarioCount = scenarios.filter((scenario) => scenario.recallScore !== null).length;
  const f1ScenarioCount = scenarios.filter((scenario) => scenario.f1 !== null).length;
  const safeLabelCount = scenarios.filter((scenario) => scenario.safeScenarioLabel).length;
  const outputContractStatus = String(row.outputContractStatus ?? "").toLowerCase();
  const safetyPolicyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();

  const checks = [
    makeCheck("threshold_scenario_metadata_available", "Threshold scenario metadata", 14, scenarios.length ? "pass" : "warning", discovery.source, scenarios.length, scenarios.length ? "Offline threshold scenario metadata is present." : "Threshold scenario metadata was not included in the imported candidate package."),
    makeCheck("threshold_values_reviewable", "Threshold values reviewable", 10, thresholdValueCount ? "pass" : "warning", discovery.source, thresholdValueCount, thresholdValueCount ? "Threshold values can be reviewed from metadata." : "No threshold values are available for review."),
    makeCheck("precision_by_threshold_reviewable", "Precision by threshold", 10, precisionScenarioCount ? "pass" : "warning", discovery.source, precisionScenarioCount, precisionScenarioCount ? "Precision metadata exists for scenarios." : "Precision-by-threshold metadata is missing."),
    makeCheck("recall_by_threshold_reviewable", "Recall by threshold", 10, recallScenarioCount ? "pass" : "warning", discovery.source, recallScenarioCount, recallScenarioCount ? "Recall metadata exists for scenarios." : "Recall-by-threshold metadata is missing."),
    makeCheck("f1_by_threshold_reviewable", "F1 by threshold", 10, f1ScenarioCount ? "pass" : "warning", discovery.source, f1ScenarioCount, f1ScenarioCount ? "F1 metadata exists for scenarios." : "F1-by-threshold metadata is missing."),
    makeCheck("business_safe_scenario_labels_reviewable", "Business-safe scenario labels", 8, safeLabelCount ? "pass" : "warning", discovery.source, safeLabelCount, safeLabelCount ? "Scenario labels are review-only metadata." : "Scenario labels are missing."),
    makeCheck("no_backend_threshold_execution", "No backend threshold execution", 12, backendThresholdExecutionAllowed === false ? "pass" : "fail", "safetyPolicy.backendThresholdExecutionAllowed", backendThresholdExecutionAllowed, "Backend threshold execution is disabled."),
    makeCheck("no_activation_or_decision_automation", "No activation or decision automation", 14, safetyPolicyStatus === "pass" || safetyPolicyStatus === "warning" || !safetyPolicyStatus ? "pass" : "fail", "metadataImport.safetyPolicyStatus", row.safetyPolicyStatus, "Threshold metadata does not activate a model or automate decisions."),
    makeCheck("output_contract_safe_for_threshold_review", "Safe output contract", 12, outputContractStatus === "pass" || outputContractStatus === "warning" || !outputContractStatus ? "pass" : "fail", "metadataImport.outputContractStatus", row.outputContractStatus, "Threshold review relies on safe candidate-output metadata only."),
  ];
  return { checks, signals };
};

const buildContract = (): InventoryStockoutCandidateThresholdScenarioMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline threshold scenario metadata view for Inventory Stockout candidate models.",
  metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
  readOnly: true,
  allowedMetadataFamilies: [
    "threshold_scenarios",
    "threshold_values",
    "precision_by_threshold",
    "recall_by_threshold",
    "f1_by_threshold",
    "business_safe_scenario_labels",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

export const buildInventoryStockoutCandidateThresholdScenarioMetadataContract = buildContract;

export const buildInventoryStockoutCandidateThresholdScenarioMetadata = async (input: { id: unknown }): Promise<InventoryStockoutCandidateThresholdScenarioMetadataResponse> => {
  const row = await getMlCandidateEvaluationMetadataImportById(input.id) as RawImportRow | null;
  const contract = buildContract();
  const generatedAt = new Date().toISOString();

  if (!row) {
    return {
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
        thresholdScenarioScorePct: 0,
        passCount: 0,
        warningCount: 0,
        failCount: 1,
        totalCheckCount: THRESHOLD_SCENARIO_CHECK_KEYS.length,
        thresholdScenarioCount: 0,
        thresholdValueCount: 0,
        precisionScenarioCount: 0,
        recallScenarioCount: 0,
        f1ScenarioCount: 0,
        safeLabelCount: 0,
        bestF1Threshold: null,
        bestRecallThreshold: null,
        bestPrecisionThreshold: null,
        warnings: ["Candidate evaluation metadata import was not found."],
        backendModelExecutionAllowed,
        backendInferenceEndpointExposed,
        productionIntegrationAllowed,
        decisionAutomationAllowed,
        canChangeInventoryOrAccounting,
        artifactActivationAllowed,
        rawTrainingCsvLoadingAllowedInBackend,
        backendThresholdExecutionAllowed,
        recommendedNextAction: "Import Phase 9B candidate evaluation metadata before reviewing threshold scenarios.",
      },
      checks: [],
      thresholdScenarioSignals: [],
      thresholdScenarios: [],
      thresholdScenarioMetadataPreview: {},
      safetyPolicy,
    };
  }

  const candidateManifest = parseJsonRecord(row.candidateManifestJson);
  const modelCard = parseJsonRecord(row.modelCardJson);
  const metrics = parseJsonRecord(row.metricsJson);
  const evaluationReport = parseJsonRecord(row.evaluationReportJson);
  const candidateOutputSample = parseJsonRecord(row.candidateOutputSampleJson);
  const importSummary = parseJsonRecord(row.importSummaryJson);
  const safetyPolicyJson = parseJsonRecord(row.safetyPolicyJson);
  const sources: MetadataSource[] = [
    { name: "evaluationReport", record: evaluationReport },
    { name: "metrics", record: metrics },
    { name: "candidateManifest", record: candidateManifest },
    { name: "modelCard", record: modelCard },
    { name: "candidateOutputSample", record: candidateOutputSample },
    { name: "importSummary", record: importSummary },
    { name: "safetyPolicy", record: safetyPolicyJson },
  ];
  const discovery = findAtPaths(sources, [
    "thresholdScenarios",
    "threshold_scenarios",
    "thresholdScenarioMetadata",
    "threshold_scenario_metadata",
    "scenarioMetrics.thresholds",
    "scenarioMetrics.thresholdScenarios",
    "classification.thresholds",
    "classification.thresholdScenarios",
    "metrics.thresholds",
    "metrics.thresholdScenarios",
    "evaluation.thresholds",
    "evaluation.thresholdScenarios",
    "offlineThresholdScenarios",
  ]);
  const thresholdScenarios = normalizeThresholdScenarios(discovery.value, discovery.source);
  const { checks, signals } = buildChecks(discovery, thresholdScenarios, row);
  const weight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + check.earned, 0);
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const thresholdScenarioScorePct = weight ? Math.round((earned / weight) * 100) : 0;
  const warnings = [
    ...checks.filter((check) => check.status !== "pass").map((check) => check.message),
    ...thresholdScenarios.flatMap((scenario) => scenario.notes),
  ].slice(0, 20);
  const status: OfflineCandidateThresholdScenarioMetadataStatus =
    thresholdScenarios.length === 0 ? "threshold_scenario_metadata_missing" : failCount > 0 || warningCount > 0 ? "threshold_scenario_metadata_warning" : "threshold_scenario_metadata_ready";
  const recommendation: OfflineCandidateThresholdScenarioMetadataRecommendation =
    thresholdScenarios.length === 0 ? "add_offline_threshold_scenario_metadata_to_candidate_package" : "review_threshold_scenario_metadata";

  return {
    success: true,
    contract,
    summary: {
      generatedAt,
      metadataImportId: Number(row.id ?? input.id),
      candidatePackageId: String(row.candidatePackageId ?? "unknown"),
      modelKey: String(row.modelKey ?? "inventory_stockout"),
      modelVersion: String(row.modelVersion ?? "unknown"),
      predictionType: String(row.predictionType ?? "classification"),
      horizonDays: asNumber(row.horizonDays),
      status,
      recommendation,
      thresholdScenarioScorePct,
      passCount,
      warningCount,
      failCount,
      totalCheckCount: checks.length,
      thresholdScenarioCount: thresholdScenarios.length,
      thresholdValueCount: thresholdScenarios.filter((scenario) => scenario.threshold !== null).length,
      precisionScenarioCount: thresholdScenarios.filter((scenario) => scenario.precisionScore !== null).length,
      recallScenarioCount: thresholdScenarios.filter((scenario) => scenario.recallScore !== null).length,
      f1ScenarioCount: thresholdScenarios.filter((scenario) => scenario.f1 !== null).length,
      safeLabelCount: thresholdScenarios.filter((scenario) => scenario.safeScenarioLabel).length,
      bestF1Threshold: bestThresholdBy(thresholdScenarios, "f1"),
      bestRecallThreshold: bestThresholdBy(thresholdScenarios, "recallScore"),
      bestPrecisionThreshold: bestThresholdBy(thresholdScenarios, "precisionScore"),
      warnings,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      backendThresholdExecutionAllowed,
      recommendedNextAction: thresholdScenarios.length
        ? "Review offline threshold scenario metadata only; do not activate or execute a threshold in backend."
        : "Add threshold scenario metadata to the offline candidate package if threshold comparison is needed.",
    },
    checks,
    thresholdScenarioSignals: signals,
    thresholdScenarios,
    thresholdScenarioMetadataPreview: previewRecord(discovery.value),
    safetyPolicy,
  };
};

export const buildMlCandidateThresholdScenarioMetadataCatalogSummary = async (query: Record<string, unknown> = {}): Promise<MlCandidateThresholdScenarioMetadataCatalogSummary> => {
  const rows = await listMlCandidateEvaluationMetadataImports(query.limit) as Array<Record<string, unknown>>;
  const candidateCount = rows.length;
  const status: OfflineCandidateThresholdScenarioMetadataStatus = candidateCount ? "threshold_scenario_metadata_warning" : "threshold_scenario_metadata_missing";
  const recommendation: OfflineCandidateThresholdScenarioMetadataRecommendation = candidateCount ? "review_threshold_scenario_metadata" : "import_candidate_evaluation_metadata_first";
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentCandidateThresholdScenarioMetadata: {
      generatedAt: new Date().toISOString(),
      status,
      recommendation,
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports",
      metadataReadOnlyThresholdScenarioMetadata,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      backendThresholdExecutionAllowed,
    },
    recentCandidateImports: rows.slice(0, 10),
    recommendedNextAction: "Open a candidate from the comparison dashboard to review offline threshold scenario metadata only.",
  };
};

/* Phase 9J anchors: ml_candidate_evaluation_metadata_imports, inventory_stockout_offline_candidate_threshold_scenario_metadata_v1, metadata-only threshold scenario review, backendThresholdExecutionAllowed false. */
