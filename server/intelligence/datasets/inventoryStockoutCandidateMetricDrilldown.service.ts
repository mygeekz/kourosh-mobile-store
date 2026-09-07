import { getMlCandidateEvaluationMetadataImportById } from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateMetricDrilldownContract,
  InventoryStockoutCandidateMetricDrilldownFeature,
  InventoryStockoutCandidateMetricDrilldownMetric,
  InventoryStockoutCandidateMetricDrilldownResponse,
  InventoryStockoutCandidateMetricDrilldownWarning,
  MlCandidateMetricDrilldownCatalogSummary,
  OfflineCandidateMetricDrilldownRecommendation,
  OfflineCandidateMetricDrilldownStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_metric_drilldown_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9D" as const;

const metadataReadOnlyDrilldown = true as const;
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

const SAFE_OUTPUT_FIELDS = [
  "entityId",
  "predictionType",
  "horizonDays",
  "score",
  "label",
  "confidence",
  "modelVersion",
  "generatedAt",
] as const;

const METRIC_DEFINITIONS = [
  ["accuracy", "higher_is_better", "Classification accuracy where available."],
  ["precisionScore", "higher_is_better", "Classification precision where available."],
  ["recallScore", "higher_is_better", "Classification recall where available."],
  ["f1", "higher_is_better", "Classification F1 score where available."],
  ["rocAuc", "higher_is_better", "ROC-AUC where probabilities and both classes are available."],
  ["mae", "lower_is_better", "Regression mean absolute error where available."],
  ["rmse", "lower_is_better", "Regression root mean squared error where available."],
  ["r2", "higher_is_better", "Regression R² where available."],
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

const safetyPolicy = {
  metadataReadOnlyDrilldown,
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

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

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

const parseJsonUnknown = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseWarning: "metadata_json_parse_failed" };
  }
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const extractWarningMessages = (source: string, value: unknown): InventoryStockoutCandidateMetricDrilldownWarning[] => {
  const out: InventoryStockoutCandidateMetricDrilldownWarning[] = [];
  const push = (message: unknown) => {
    const text = String(message ?? "").trim();
    if (text) out.push({ source, message: text });
  };

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (asRecord(item)) push((item as Record<string, unknown>).message ?? (item as Record<string, unknown>).note ?? JSON.stringify(item));
    });
  } else if (typeof value === "string") {
    push(value);
  }

  return out;
};

const extractFeatures = (candidateManifest: Record<string, unknown>, modelCard: Record<string, unknown>): InventoryStockoutCandidateMetricDrilldownFeature[] => {
  const featureContract = asRecord(candidateManifest.featureContract);
  const manifestFeatures = Array.isArray(featureContract?.features) ? featureContract?.features : candidateManifest.features;
  const modelCardFeatures = modelCard.featureList ?? modelCard.features;
  const rawFeatures = Array.isArray(manifestFeatures) ? manifestFeatures : Array.isArray(modelCardFeatures) ? modelCardFeatures : [];

  return rawFeatures.map((feature, index) => {
    if (typeof feature === "string") {
      return { name: feature, type: null, role: "feature", required: null };
    }
    const record = asRecord(feature) || {};
    return {
      name: asString(record.name ?? record.key ?? record.column ?? `feature_${index + 1}`) || `feature_${index + 1}`,
      type: asString(record.type ?? record.dataType ?? record.kind),
      role: asString(record.role) || "feature",
      required: typeof record.required === "boolean" ? record.required : null,
    };
  });
};

const extractTargetDefinition = (candidateManifest: Record<string, unknown>, modelCard: Record<string, unknown>): Record<string, unknown> | null => {
  const target = asRecord(candidateManifest.target) || asRecord(candidateManifest.targetDefinition) || asRecord(modelCard.targetDefinition);
  if (target) return target;
  const targetColumn = asString(candidateManifest.targetColumn ?? modelCard.targetColumn);
  return targetColumn ? { column: targetColumn } : null;
};

const extractKnownLimitations = (modelCard: Record<string, unknown>, evaluationReport: Record<string, unknown>): string[] => {
  const values = [
    ...asStringArray(modelCard.knownLimitations),
    ...asStringArray(modelCard.limitations),
    ...asStringArray(evaluationReport.knownLimitations),
    ...asStringArray(evaluationReport.limitations),
  ];
  return values.length ? values : [
    "Offline candidate metadata only; not approved for production use.",
    "Metric reliability depends on the exported training package size, quality, target definition, and split strategy.",
  ];
};

const sanitizeOutputSample = (value: unknown): Array<Record<string, unknown>> => {
  const rows = Array.isArray(value) ? value : asRecord(value) ? [value] : [];
  return rows.slice(0, 5).map((row) => {
    const record = asRecord(row) || {};
    return SAFE_OUTPUT_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      if (field in record) acc[field] = record[field];
      return acc;
    }, {});
  });
};

const buildMetrics = (row: RawImportRow): InventoryStockoutCandidateMetricDrilldownMetric[] =>
  METRIC_DEFINITIONS.map(([key, direction, note]) => {
    const value = asNumber(row[key]);
    return {
      key,
      value,
      available: value !== null,
      direction,
      note,
    };
  });

const chooseStatus = (row: RawImportRow | null, warnings: InventoryStockoutCandidateMetricDrilldownWarning[]): OfflineCandidateMetricDrilldownStatus => {
  if (!row) return "candidate_not_found";
  const safetyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();
  const outputStatus = String(row.outputContractStatus ?? "").toLowerCase();
  const importStatus = String(row.metadataImportStatus ?? "").toLowerCase();
  if (warnings.length || safetyStatus !== "pass" || outputStatus !== "pass" || importStatus.includes("warning")) return "drilldown_warning";
  return "drilldown_ready";
};

const chooseRecommendation = (status: OfflineCandidateMetricDrilldownStatus): OfflineCandidateMetricDrilldownRecommendation => {
  if (status === "candidate_not_found") return "import_candidate_evaluation_metadata_first";
  if (status === "drilldown_warning") return "review_candidate_warnings_before_comparison";
  return "review_candidate_metrics_and_limitations";
};

const buildExplainabilityNotes = (input: {
  modelCard: Record<string, unknown>;
  features: InventoryStockoutCandidateMetricDrilldownFeature[];
  metrics: InventoryStockoutCandidateMetricDrilldownMetric[];
}): string[] => {
  const algorithm = asString(input.modelCard.algorithm ?? input.modelCard.modelFamily) || "offline candidate model";
  const featureCount = input.features.length;
  const availableMetrics = input.metrics.filter((metric) => metric.available).map((metric) => metric.key);
  return [
    `Algorithm metadata: ${algorithm}. This drilldown does not load or execute the model artifact.`,
    `Feature contract visibility: ${featureCount} feature(s) listed from imported metadata.`,
    `Metric visibility: ${availableMetrics.length ? availableMetrics.join(", ") : "no comparable metric values available"}.`,
    "Explainability notes are descriptive metadata only; no SHAP/LIME/runtime attribution is computed in backend.",
    "No recommendation in this drilldown is a production approval, activation decision, purchase instruction, pricing change, or inventory/accounting mutation.",
  ];
};

export const buildInventoryStockoutCandidateMetricDrilldownContract = (): InventoryStockoutCandidateMetricDrilldownContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Show imported Phase 9B candidate metrics, warnings, limitations, feature contract, checksums, and explainability notes for offline review visibility only.",
  drilldownScope: "offline_candidate_evaluation_metadata_drilldown_only",
  dataSource: "ml_candidate_evaluation_metadata_imports",
  supportedLookup: ["metadataImportId"],
  exposedSections: ["metricDrilldown", "warnings", "knownLimitations", "featureContract", "targetDefinition", "checksumCoverage", "safeOutputSamplePreview", "explainabilityNotes", "modelCardMetadata"],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  operationalPolicy: safetyPolicy,
});

export const buildInventoryStockoutCandidateMetricDrilldown = async (
  input: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidateMetricDrilldownResponse> => {
  const id = asNumber(input.id ?? input.metadataImportId);
  const row = id ? await getMlCandidateEvaluationMetadataImportById(id) as RawImportRow | null : null;

  const candidateManifest = parseJsonRecord(row?.candidateManifestJson);
  const modelCard = parseJsonRecord(row?.modelCardJson);
  const metricsJson = parseJsonRecord(row?.metricsJson);
  const evaluationReport = parseJsonRecord(row?.evaluationReportJson);
  const candidateOutputSample = parseJsonUnknown(row?.candidateOutputSampleJson);
  const checksums = parseJsonRecord(row?.checksumsJson);
  const trainingPackageValidationReport = parseJsonRecord(row?.trainingPackageValidationReportJson);

  const metrics = row ? buildMetrics(row) : [];
  const warnings = [
    ...extractWarningMessages("metrics", metricsJson.warnings),
    ...extractWarningMessages("evaluation_report", evaluationReport.warnings),
    ...extractWarningMessages("training_package_validation", trainingPackageValidationReport.warnings),
    ...extractWarningMessages("training_package_validation_errors", trainingPackageValidationReport.errors),
    ...extractWarningMessages("model_card", modelCard.warnings),
  ];
  const knownLimitations = extractKnownLimitations(modelCard, evaluationReport);
  const featureContract = extractFeatures(candidateManifest, modelCard);
  const targetDefinition = extractTargetDefinition(candidateManifest, modelCard);
  const checksumCoverage = Object.keys(checksums).sort();
  const outputSamplePreview = sanitizeOutputSample(candidateOutputSample);
  const status = chooseStatus(row, warnings);
  const recommendation = chooseRecommendation(status);
  const explainabilityNotes = buildExplainabilityNotes({ modelCard, features: featureContract, metrics });
  const generatedAt = new Date().toISOString();

  const summary = {
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    id: asNumber(row?.id),
    candidatePackageId: asString(row?.candidatePackageId),
    modelKey: asString(row?.modelKey),
    modelVersion: asString(row?.modelVersion),
    modelFamily: asString(row?.modelFamily),
    predictionType: asString(row?.predictionType),
    targetColumn: asString(row?.targetColumn),
    horizonDays: asNumber(row?.horizonDays),
    validationStatus: asString(row?.validationStatus),
    metricsStatus: asString(row?.metricsStatus),
    outputContractStatus: asString(row?.outputContractStatus),
    safetyPolicyStatus: asString(row?.safetyPolicyStatus),
    metadataImportStatus: asString(row?.metadataImportStatus),
    warningCount: warnings.length,
    limitationCount: knownLimitations.length,
    featureCount: featureContract.length,
    checksumCount: checksumCoverage.length,
    metadataReadOnlyDrilldown,
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
    recommendedNextAction: status === "candidate_not_found"
      ? "Import candidate evaluation metadata through Phase 9B before using this drilldown."
      : "Review metric values, warnings, feature contract, limitations, and checksum coverage as metadata only; do not treat this as production approval.",
  };

  return {
    success: true,
    contract: buildInventoryStockoutCandidateMetricDrilldownContract(),
    summary,
    metrics,
    warnings,
    knownLimitations,
    featureContract,
    targetDefinition,
    checksumCoverage,
    outputSamplePreview,
    explainabilityNotes,
    modelCard,
    safetyPolicy,
  };
};

export const buildMlCandidateMetricDrilldownCatalogSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlCandidateMetricDrilldownCatalogSummary> => {
  const drilldown = await buildInventoryStockoutCandidateMetricDrilldown(input);
  return {
    generatedAt: new Date().toISOString(),
    contract: drilldown.contract,
    currentCandidateMetricDrilldown: drilldown.summary,
    recommendedNextAction: drilldown.summary.recommendedNextAction,
  };
};

/* Phase 9D anchors: candidate-metric-drilldown, explainability-notes, metadata-only candidate metric drilldown, no backend model execution, no artifact activation. */
