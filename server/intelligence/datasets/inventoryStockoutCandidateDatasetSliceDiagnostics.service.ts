import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateDatasetSliceDiagnostic,
  InventoryStockoutCandidateDatasetSliceDiagnosticsContract,
  InventoryStockoutCandidateDatasetSliceDiagnosticsResponse,
  MlCandidateDatasetSliceDiagnosticsCatalogSummary,
  OfflineCandidateDatasetSliceDiagnosticsRecommendation,
  OfflineCandidateDatasetSliceDiagnosticsStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_dataset_slice_diagnostics_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9E" as const;

const metadataReadOnlySliceDiagnostics = true as const;
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

const SUPPORTED_SLICE_DIMENSIONS = [
  "category",
  "stock_level_band",
  "sales_velocity_band",
  "missingness_band",
  "target_distribution",
  "class_balance",
  "row_count_band",
] as const;

const DIAGNOSTIC_TYPES = [
  "slice_metric",
  "target_distribution",
  "missingness",
  "row_count",
  "metadata_availability",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, or invoice records.",
  "No raw training CSV or model artifact loading in backend slice diagnostics.",
] as const;

type RawImportRow = Record<string, unknown>;

const safetyPolicy = {
  metadataReadOnlySliceDiagnostics,
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

const getPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((current, segment) => asRecord(current)?.[segment], source);

const collectArrayAtPaths = (sourceName: string, source: Record<string, unknown>, paths: string[]) => {
  const out: Array<{ source: string; value: unknown[] }> = [];
  for (const path of paths) {
    const value = getPath(source, path);
    if (Array.isArray(value)) out.push({ source: `${sourceName}.${path}`, value });
  }
  return out;
};

const metricPairFromRecord = (record: Record<string, unknown>): { metricKey: string | null; metricValue: number | null } => {
  const directKey = asString(record.metricKey ?? record.metric ?? record.name);
  const directValue = asNumber(record.metricValue ?? record.value ?? record.score);
  if (directKey && directValue !== null) return { metricKey: directKey, metricValue: directValue };

  for (const key of ["f1", "recallScore", "recall", "precisionScore", "precision", "accuracy", "rocAuc", "roc_auc", "mae", "rmse", "r2"]) {
    const value = asNumber(record[key]);
    if (value !== null) return { metricKey: key, metricValue: value };
  }

  const nestedMetrics = asRecord(record.metrics);
  if (nestedMetrics) return metricPairFromRecord(nestedMetrics);

  return { metricKey: null, metricValue: null };
};

const normalizeDiagnostic = (
  value: unknown,
  fallbackType: string,
  source: string,
  index: number,
): InventoryStockoutCandidateDatasetSliceDiagnostic | null => {
  const record = asRecord(value);
  if (!record) return null;
  const metric = metricPairFromRecord(record);
  const sliceType = asString(record.sliceType ?? record.type ?? record.dimension ?? record.feature ?? fallbackType) || fallbackType;
  const segment = asString(record.segment ?? record.value ?? record.category ?? record.bucket ?? record.band ?? record.classLabel ?? record.label) || "overall";
  const label = asString(record.label ?? record.name ?? `${sliceType}: ${segment}`) || `${sliceType}: ${segment}`;
  const warning = asString(record.warning ?? record.issue ?? record.note ?? record.message);
  return {
    key: asString(record.key ?? record.id) || `${source.replace(/[^a-z0-9]+/gi, "_")}_${index + 1}`,
    label,
    sliceType,
    segment,
    rowCount: asNumber(record.rowCount ?? record.rows ?? record.count ?? record.support ?? record.n),
    positiveRate: asNumber(record.positiveRate ?? record.targetRate ?? record.stockoutRate ?? record.classRate ?? record.rate),
    missingRate: asNumber(record.missingRate ?? record.missingnessRate ?? record.nullRate ?? record.naRate),
    metricKey: metric.metricKey,
    metricValue: metric.metricValue,
    warning,
    source,
  };
};

const diagnosticsFromObjectDistribution = (
  source: string,
  sliceType: string,
  value: unknown,
): InventoryStockoutCandidateDatasetSliceDiagnostic[] => {
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).map(([segment, rawValue], index) => ({
    key: `${source.replace(/[^a-z0-9]+/gi, "_")}_${segment}_${index + 1}`,
    label: `${sliceType}: ${segment}`,
    sliceType,
    segment,
    rowCount: asNumber(rawValue),
    positiveRate: sliceType === "target_distribution" ? asNumber(rawValue) : null,
    missingRate: sliceType === "missingness" ? asNumber(rawValue) : null,
    metricKey: null,
    metricValue: null,
    warning: null,
    source,
  }));
};

const extractDiagnostics = (input: {
  evaluationReport: Record<string, unknown>;
  metrics: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  trainingPackageValidationReport: Record<string, unknown>;
}): InventoryStockoutCandidateDatasetSliceDiagnostic[] => {
  const sources = [
    {
      name: "evaluationReport",
      record: input.evaluationReport,
      paths: ["sliceDiagnostics", "datasetSlices", "sliceMetrics", "slices", "diagnostics.slices"],
    },
    {
      name: "metrics",
      record: input.metrics,
      paths: ["sliceDiagnostics", "datasetSlices", "sliceMetrics", "slices", "diagnostics.slices"],
    },
    {
      name: "modelCard",
      record: input.modelCard,
      paths: ["sliceDiagnostics", "datasetSlices", "sliceMetrics", "slices"],
    },
    {
      name: "trainingPackageValidationReport",
      record: input.trainingPackageValidationReport,
      paths: ["sliceDiagnostics", "datasetSlices", "sliceMetrics", "slices", "featureMissingness", "missingness"],
    },
  ];

  const directDiagnostics = sources.flatMap(({ name, record, paths }) =>
    collectArrayAtPaths(name, record, paths).flatMap(({ source, value }) =>
      value.map((item, index) => normalizeDiagnostic(item, "slice_metric", source, index)).filter(Boolean) as InventoryStockoutCandidateDatasetSliceDiagnostic[],
    ),
  );

  const distributionDiagnostics = [
    ...diagnosticsFromObjectDistribution("evaluationReport.targetDistribution", "target_distribution", input.evaluationReport.targetDistribution),
    ...diagnosticsFromObjectDistribution("evaluationReport.predictionDistribution", "target_distribution", input.evaluationReport.predictionDistribution),
    ...diagnosticsFromObjectDistribution("metrics.targetDistribution", "target_distribution", input.metrics.targetDistribution),
    ...diagnosticsFromObjectDistribution("metrics.predictionDistribution", "target_distribution", input.metrics.predictionDistribution),
    ...diagnosticsFromObjectDistribution("trainingPackageValidationReport.missingColumns", "missingness", input.trainingPackageValidationReport.missingColumns),
    ...diagnosticsFromObjectDistribution("trainingPackageValidationReport.missingness", "missingness", input.trainingPackageValidationReport.missingness),
  ];

  const positiveRate = asNumber(input.evaluationReport.positiveClassRate ?? input.metrics.positiveClassRate ?? input.metrics.positive_class_rate);
  const positiveRateDiagnostic: InventoryStockoutCandidateDatasetSliceDiagnostic[] = positiveRate === null ? [] : [{
    key: "overall_positive_class_rate",
    label: "Target distribution: positive class rate",
    sliceType: "target_distribution",
    segment: "positive_class",
    rowCount: null,
    positiveRate,
    missingRate: null,
    metricKey: null,
    metricValue: null,
    warning: null,
    source: "metrics.positiveClassRate",
  }];

  return [...directDiagnostics, ...distributionDiagnostics, ...positiveRateDiagnostic].slice(0, 100);
};

const buildSliceFamilies = (diagnostics: InventoryStockoutCandidateDatasetSliceDiagnostic[]) => {
  const families = new Map<string, { key: string; label: string; count: number; warningCount: number }>();
  diagnostics.forEach((diagnostic) => {
    const key = diagnostic.sliceType || "unknown";
    const current = families.get(key) || { key, label: key.replace(/_/g, " "), count: 0, warningCount: 0 };
    current.count += 1;
    if (diagnostic.warning) current.warningCount += 1;
    families.set(key, current);
  });
  return [...families.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

const chooseStatus = (
  row: RawImportRow | null,
  diagnostics: InventoryStockoutCandidateDatasetSliceDiagnostic[],
): OfflineCandidateDatasetSliceDiagnosticsStatus => {
  if (!row) return "candidate_not_found";
  if (!diagnostics.length) return "no_slice_metadata";
  if (diagnostics.some((diagnostic) => diagnostic.warning)) return "slice_diagnostics_warning";
  return "slice_diagnostics_ready";
};

const chooseRecommendation = (status: OfflineCandidateDatasetSliceDiagnosticsStatus): OfflineCandidateDatasetSliceDiagnosticsRecommendation => {
  if (status === "candidate_not_found") return "import_candidate_evaluation_metadata_first";
  if (status === "no_slice_metadata") return "add_slice_diagnostics_to_offline_candidate_package";
  if (status === "slice_diagnostics_warning") return "review_slice_warnings_before_model_comparison";
  return "review_slice_diagnostics_metadata_only";
};

const buildRecommendedNextAction = (status: OfflineCandidateDatasetSliceDiagnosticsStatus): string => {
  if (status === "candidate_not_found") return "Import candidate evaluation metadata first through Phase 9B.";
  if (status === "no_slice_metadata") return "Generate slice diagnostics in the offline workbench candidate metadata, then import the metadata again; backend execution remains disabled.";
  if (status === "slice_diagnostics_warning") return "Review slice warnings before comparing candidates; this remains metadata-only and cannot trigger production actions.";
  return "Review dataset slice diagnostics as offline metadata only; no model execution, activation, inference, or business mutation is allowed.";
};

export const buildInventoryStockoutCandidateDatasetSliceDiagnosticsContract = (): InventoryStockoutCandidateDatasetSliceDiagnosticsContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Show imported offline candidate dataset slice diagnostics metadata for Inventory Stockout model review visibility only.",
  diagnosticsScope: "offline_candidate_dataset_slice_diagnostics_metadata_only",
  dataSource: "ml_candidate_evaluation_metadata_imports",
  diagnosticTypes: [...DIAGNOSTIC_TYPES],
  supportedSliceDimensions: [...SUPPORTED_SLICE_DIMENSIONS],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  operationalPolicy: safetyPolicy,
});

export const buildInventoryStockoutCandidateDatasetSliceDiagnostics = async (
  input: { id?: unknown },
): Promise<InventoryStockoutCandidateDatasetSliceDiagnosticsResponse> => {
  const row = await getMlCandidateEvaluationMetadataImportById(input.id) as RawImportRow | null;
  const candidateManifest = parseJsonRecord(row?.candidateManifestJson);
  const modelCard = parseJsonRecord(row?.modelCardJson);
  const metrics = parseJsonRecord(row?.metricsJson);
  const evaluationReport = parseJsonRecord(row?.evaluationReportJson);
  const trainingPackageValidationReport = parseJsonRecord(row?.trainingPackageValidationReportJson);
  const diagnostics = row ? extractDiagnostics({ evaluationReport, metrics, modelCard, trainingPackageValidationReport }) : [];
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.warning).length;
  const status = chooseStatus(row, diagnostics);
  const recommendation = chooseRecommendation(status);
  const generatedAt = new Date().toISOString();

  const summary = {
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    metadataImportId: asNumber(row?.id),
    candidatePackageId: asString(row?.candidatePackageId ?? candidateManifest.candidatePackageId),
    modelKey: asString(row?.modelKey ?? candidateManifest.modelKey),
    modelVersion: asString(row?.modelVersion ?? candidateManifest.modelVersion),
    predictionType: asString(row?.predictionType ?? candidateManifest.predictionType),
    horizonDays: asNumber(row?.horizonDays ?? candidateManifest.horizonDays),
    sliceCount: diagnostics.length,
    supportedSliceCount: diagnostics.filter((diagnostic) => SUPPORTED_SLICE_DIMENSIONS.includes(diagnostic.sliceType as typeof SUPPORTED_SLICE_DIMENSIONS[number])).length,
    warningCount,
    missingnessSliceCount: diagnostics.filter((diagnostic) => diagnostic.sliceType.includes("missing")).length,
    targetDistributionSliceCount: diagnostics.filter((diagnostic) => diagnostic.sliceType.includes("target") || diagnostic.sliceType.includes("class")).length,
    safetyLocked: true,
    metadataReadOnlySliceDiagnostics,
    backendModelExecutionAllowed,
    backendInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    artifactActivationAllowed,
    recommendedNextAction: buildRecommendedNextAction(status),
  };

  return {
    success: true,
    contract: buildInventoryStockoutCandidateDatasetSliceDiagnosticsContract(),
    summary,
    diagnostics,
    sliceFamilies: buildSliceFamilies(diagnostics),
    sourceMetadata: {
      evaluationReport: Object.keys(evaluationReport).length > 0,
      metrics: Object.keys(metrics).length > 0,
      modelCard: Object.keys(modelCard).length > 0,
      trainingPackageValidationReport: Object.keys(trainingPackageValidationReport).length > 0,
    },
    safetyPolicy,
  };
};

export const buildMlCandidateDatasetSliceDiagnosticsCatalogSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlCandidateDatasetSliceDiagnosticsCatalogSummary> => {
  const imports = await listMlCandidateEvaluationMetadataImports(asNumber(input.limit) ?? 10) as RawImportRow[];
  const latest = imports[0] || null;
  const current = latest ? await buildInventoryStockoutCandidateDatasetSliceDiagnostics({ id: latest.id }) : null;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidateDatasetSliceDiagnosticsContract(),
    currentCandidateDatasetSliceDiagnostics: current?.summary ?? null,
    recentCandidateMetadataImports: imports.slice(0, 10),
    recommendedNextAction: current?.summary.recommendedNextAction || "Import candidate evaluation metadata first through Phase 9B, then review slice diagnostics metadata only.",
  };
};

/* Phase 9E anchors: inventory_stockout_offline_candidate_dataset_slice_diagnostics_v1, metadataReadOnlySliceDiagnostics, dataset slice diagnostics metadata-only, no backend model execution, no inference endpoint, no artifact activation. */
