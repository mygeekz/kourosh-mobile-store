import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateDataDriftBaselineMetadataCheck,
  InventoryStockoutCandidateDataDriftBaselineMetadataContract,
  InventoryStockoutCandidateDataDriftBaselineMetadataResponse,
  InventoryStockoutCandidateDataDriftBaselineMetadataSummary,
  InventoryStockoutCandidateDataDriftSignal,
  MlCandidateDataDriftBaselineMetadataCatalogSummary,
  OfflineCandidateDataDriftBaselineMetadataRecommendation,
  OfflineCandidateDataDriftBaselineMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_data_drift_baseline_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9H" as const;

const metadataReadOnlyDataDriftBaseline = true as const;
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
const baselineTrainingDataLoadingAllowedInBackend = false as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No baseline training data loading in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

const DRIFT_CHECK_KEYS = [
  "drift_baseline_metadata_available",
  "baseline_reference_available",
  "current_reference_available",
  "feature_distribution_metadata_available",
  "missingness_drift_metadata_available",
  "target_balance_drift_metadata_available",
  "row_count_drift_metadata_available",
  "drift_warning_metadata_reviewable",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };

const safetyPolicy = {
  metadataReadOnlyDataDriftBaseline,
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
  baselineTrainingDataLoadingAllowedInBackend,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

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

const findAtPaths = (sources: MetadataSource[], paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (hasContent(value)) return { available: true, source: `${source.name}.${path}`, value };
    }
  }
  return { available: false, source: "missing", value: null };
};

const firstNumberAtPaths = (sources: MetadataSource[], paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = asNumber(getPath(source.record, path));
      if (value !== null) return { value, source: `${source.name}.${path}` };
    }
  }
  return { value: null, source: "missing" };
};

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (asRecord(value)) return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).filter(Boolean);
  return [];
};

const countEntries = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  const record = asRecord(value);
  return record ? Object.keys(record).length : hasContent(value) ? 1 : 0;
};

const pctDelta = (baseline: number | null, candidate: number | null): number | null => {
  if (baseline === null || candidate === null || baseline === 0) return null;
  return Number(((candidate - baseline) / Math.abs(baseline)).toFixed(6));
};

const absoluteDelta = (baseline: number | null, candidate: number | null): number | null => {
  if (baseline === null || candidate === null) return null;
  return Number((candidate - baseline).toFixed(6));
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateDataDriftBaselineMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const makeSignal = (
  key: string,
  family: InventoryStockoutCandidateDataDriftSignal["family"],
  label: string,
  source: string,
  baselineValue: unknown,
  candidateValue: unknown,
  message: string,
): InventoryStockoutCandidateDataDriftSignal => {
  const baselineNumber = asNumber(baselineValue);
  const candidateNumber = asNumber(candidateValue);
  const available = hasContent(baselineValue) || hasContent(candidateValue);
  return {
    key,
    family,
    label,
    status: available ? "available" : "missing",
    source,
    baselineValue: baselineValue ?? null,
    candidateValue: candidateValue ?? null,
    delta: absoluteDelta(baselineNumber, candidateNumber),
    deltaPct: pctDelta(baselineNumber, candidateNumber),
    message,
  };
};

const getContract = (): InventoryStockoutCandidateDataDriftBaselineMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read imported offline candidate metadata and display data drift baseline metadata only. This does not load baseline files, raw training files, models, artifacts, or runtime ML packages.",
  metadataSource: "ml_candidate_evaluation_metadata_imports",
  readOnly: true,
  allowedMetadataFamilies: [
    "baseline reference metadata",
    "current candidate dataset metadata",
    "feature distribution metadata",
    "missingness drift metadata",
    "target balance drift metadata",
    "row count drift metadata",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

const buildDriftView = (row: RawImportRow): InventoryStockoutCandidateDataDriftBaselineMetadataResponse => {
  const candidateManifest = parseJsonRecord(row.candidateManifestJson);
  const modelCard = parseJsonRecord(row.modelCardJson);
  const metrics = parseJsonRecord(row.metricsJson);
  const evaluationReport = parseJsonRecord(row.evaluationReportJson);
  const trainingPackageValidationReport = parseJsonRecord(row.trainingPackageValidationReportJson);
  const importSummary = parseJsonRecord(row.importSummaryJson);
  const checksums = parseJsonRecord(row.checksumsJson);
  const candidateOutputSample = parseJsonRecord(row.candidateOutputSampleJson);

  const sources: MetadataSource[] = [
    { name: "evaluationReport", record: evaluationReport },
    { name: "metrics", record: metrics },
    { name: "candidateManifest", record: candidateManifest },
    { name: "modelCard", record: modelCard },
    { name: "trainingPackageValidationReport", record: trainingPackageValidationReport },
    { name: "importSummary", record: importSummary },
    { name: "checksums", record: checksums },
    { name: "candidateOutputSample", record: candidateOutputSample },
    { name: "metadataImport", record: row },
  ];

  const driftMetadata = findAtPaths(sources, [
    "dataDrift",
    "dataDriftMetadata",
    "driftBaseline",
    "driftBaselineMetadata",
    "datasetDrift",
    "datasetDiagnostics.drift",
    "sliceDiagnostics.drift",
    "baselineComparison.dataDrift",
  ]);
  const baselineReference = findAtPaths(sources, [
    "driftBaseline.baselineReference",
    "driftBaselineMetadata.baselineReference",
    "dataDrift.baselineReference",
    "datasetDrift.baselineReference",
    "baselineReference",
    "baselineDatasetReference",
    "trainingPackageReference.baselineReference",
    "modelCard.dataset.baselineReference",
  ]);
  const currentReference = findAtPaths(sources, [
    "driftBaseline.currentReference",
    "driftBaselineMetadata.currentReference",
    "dataDrift.currentReference",
    "datasetDrift.currentReference",
    "currentDatasetReference",
    "candidateDatasetReference",
    "trainingPackageReference",
    "candidateManifest.trainingPackageReference",
  ]);
  const featureDistribution = findAtPaths(sources, [
    "featureDistributions",
    "featureDistribution",
    "dataDrift.featureDistribution",
    "dataDrift.featureDistributions",
    "driftBaseline.featureDistributions",
    "driftBaselineMetadata.featureDistributions",
    "datasetDrift.featureDistributions",
    "datasetDiagnostics.featureDistributions",
    "featureStats",
    "featureStatistics",
  ]);
  const missingness = findAtPaths(sources, [
    "missingnessDrift",
    "missingness",
    "dataDrift.missingness",
    "driftBaseline.missingness",
    "driftBaselineMetadata.missingness",
    "datasetDrift.missingness",
    "datasetDiagnostics.missingness",
    "trainingPackageValidationReport.missingness",
  ]);
  const targetBalance = findAtPaths(sources, [
    "targetBalance",
    "targetDistribution",
    "dataDrift.targetBalance",
    "dataDrift.targetDistribution",
    "driftBaseline.targetBalance",
    "driftBaselineMetadata.targetBalance",
    "datasetDrift.targetBalance",
    "evaluationReport.targetDistribution",
    "predictionDistribution",
  ]);
  const rowCountDrift = findAtPaths(sources, [
    "rowCountDrift",
    "dataDrift.rowCount",
    "driftBaseline.rowCount",
    "driftBaselineMetadata.rowCount",
    "datasetDrift.rowCount",
    "rowCounts",
    "summary.rowCounts",
  ]);

  const rowCountBaseline = firstNumberAtPaths(sources, [
    "dataDrift.rowCount.baseline",
    "driftBaseline.rowCount.baseline",
    "driftBaselineMetadata.rowCount.baseline",
    "datasetDrift.rowCount.baseline",
    "baselineRowCount",
    "rowCounts.baseline",
  ]);
  const rowCountCandidate = firstNumberAtPaths(sources, [
    "dataDrift.rowCount.candidate",
    "driftBaseline.rowCount.candidate",
    "driftBaselineMetadata.rowCount.candidate",
    "datasetDrift.rowCount.candidate",
    "candidateRowCount",
    "rowCounts.candidate",
    "rowCounts.total",
    "summary.totalRows",
  ]);
  const targetPositiveRateBaseline = firstNumberAtPaths(sources, [
    "dataDrift.targetBalance.baselinePositiveRate",
    "driftBaseline.targetBalance.baselinePositiveRate",
    "targetBalance.baselinePositiveRate",
    "targetDistribution.baselinePositiveRate",
    "baselinePositiveRate",
  ]);
  const targetPositiveRateCandidate = firstNumberAtPaths(sources, [
    "dataDrift.targetBalance.candidatePositiveRate",
    "driftBaseline.targetBalance.candidatePositiveRate",
    "targetBalance.candidatePositiveRate",
    "targetDistribution.positiveRate",
    "positiveClassRate",
    "metrics.positiveClassRate",
  ]);
  const warnings = [
    ...asStringArray(getPath(evaluationReport, "dataDrift.warnings")),
    ...asStringArray(getPath(evaluationReport, "datasetDrift.warnings")),
    ...asStringArray(getPath(metrics, "driftWarnings")),
    ...asStringArray(getPath(importSummary, "driftWarnings")),
  ];

  const checks = [
    makeCheck(
      "drift_baseline_metadata_available",
      "Drift baseline metadata",
      15,
      driftMetadata.available ? "pass" : "warning",
      driftMetadata.source,
      driftMetadata.value,
      driftMetadata.available ? "Imported metadata contains a drift baseline or dataset drift section." : "No dedicated drift baseline section was found in imported metadata.",
    ),
    makeCheck(
      "baseline_reference_available",
      "Baseline reference",
      12,
      baselineReference.available ? "pass" : "warning",
      baselineReference.source,
      baselineReference.value,
      baselineReference.available ? "Baseline dataset reference metadata is available." : "Baseline reference metadata is missing; comparison context is limited.",
    ),
    makeCheck(
      "current_reference_available",
      "Current candidate reference",
      12,
      currentReference.available ? "pass" : "warning",
      currentReference.source,
      currentReference.value,
      currentReference.available ? "Current candidate dataset reference metadata is available." : "Current candidate reference metadata is missing.",
    ),
    makeCheck(
      "feature_distribution_metadata_available",
      "Feature distribution metadata",
      18,
      featureDistribution.available ? "pass" : "warning",
      featureDistribution.source,
      featureDistribution.value,
      featureDistribution.available ? "Feature distribution metadata can be reviewed." : "No feature distribution metadata is available for drift review.",
    ),
    makeCheck(
      "missingness_drift_metadata_available",
      "Missingness drift metadata",
      14,
      missingness.available ? "pass" : "warning",
      missingness.source,
      missingness.value,
      missingness.available ? "Missingness metadata can be reviewed." : "No missingness drift metadata is available.",
    ),
    makeCheck(
      "target_balance_drift_metadata_available",
      "Target balance metadata",
      12,
      targetBalance.available ? "pass" : "warning",
      targetBalance.source,
      targetBalance.value,
      targetBalance.available ? "Target balance or distribution metadata is available." : "No target balance drift metadata is available.",
    ),
    makeCheck(
      "row_count_drift_metadata_available",
      "Row count drift metadata",
      10,
      rowCountDrift.available || rowCountCandidate.value !== null ? "pass" : "warning",
      rowCountDrift.source !== "missing" ? rowCountDrift.source : rowCountCandidate.source,
      rowCountDrift.value ?? rowCountCandidate.value,
      rowCountDrift.available || rowCountCandidate.value !== null ? "Row count metadata can be reviewed." : "No row count drift metadata is available.",
    ),
    makeCheck(
      "drift_warning_metadata_reviewable",
      "Drift warnings reviewable",
      7,
      warnings.length > 0 ? "warning" : "pass",
      warnings.length > 0 ? "evaluationReport/importSummary" : "no_drift_warnings",
      warnings,
      warnings.length > 0 ? "Imported metadata contains drift warnings that should be reviewed." : "No imported drift warning metadata was found.",
    ),
  ] as InventoryStockoutCandidateDataDriftBaselineMetadataCheck[];

  const driftSignals = [
    makeSignal("baseline_reference", "baseline_reference", "Baseline reference", baselineReference.source, baselineReference.value, currentReference.value, "Reference comparison is metadata-only."),
    makeSignal("row_count", "row_count", "Row count drift", rowCountCandidate.source, rowCountBaseline.value, rowCountCandidate.value, "Row count comparison uses imported metadata only."),
    makeSignal("target_positive_rate", "target_balance", "Target positive-rate drift", targetPositiveRateCandidate.source, targetPositiveRateBaseline.value, targetPositiveRateCandidate.value, "Target balance drift is reported only when imported metadata includes rates."),
    makeSignal("feature_distribution", "feature_distribution", "Feature distribution metadata", featureDistribution.source, null, featureDistribution.value, "Feature distribution metadata is summarized without raw data access."),
    makeSignal("missingness", "missingness", "Missingness drift metadata", missingness.source, null, missingness.value, "Missingness drift metadata is summarized without loading training files."),
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earned = checks.reduce((sum, check) => sum + check.earned, 0);
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const driftScorePct = Math.round((earned / totalWeight) * 100);
  const availableSignalCount = driftSignals.filter((signal) => signal.status === "available").length;
  const missingSignalCount = driftSignals.filter((signal) => signal.status === "missing").length;
  const status: OfflineCandidateDataDriftBaselineMetadataStatus = availableSignalCount >= 4
    ? "drift_metadata_ready"
    : availableSignalCount > 0
      ? "drift_metadata_warning"
      : "drift_metadata_missing";
  const recommendation: OfflineCandidateDataDriftBaselineMetadataRecommendation = status === "drift_metadata_ready"
    ? "review_drift_baseline_metadata"
    : "add_offline_drift_metadata_to_candidate_package";

  const summary: InventoryStockoutCandidateDataDriftBaselineMetadataSummary = {
    generatedAt: new Date().toISOString(),
    status,
    recommendation,
    candidatePackageId: asString(row.candidatePackageId),
    modelKey: asString(row.modelKey),
    modelVersion: asString(row.modelVersion),
    predictionType: asString(row.predictionType),
    targetColumn: asString(row.targetColumn),
    horizonDays: asNumber(row.horizonDays),
    trainingManifestHash: asString(row.trainingManifestHash),
    driftScorePct,
    passCount,
    warningCount,
    failCount,
    driftSignalCount: driftSignals.length,
    availableSignalCount,
    missingSignalCount,
    featureDistributionCount: countEntries(featureDistribution.value),
    missingnessDriftCount: countEntries(missingness.value),
    targetBalanceSignalCount: countEntries(targetBalance.value),
    rowCountSignalCount: countEntries(rowCountDrift.value) || (rowCountCandidate.value !== null ? 1 : 0),
    baselineReferenceAvailable: baselineReference.available,
    currentReferenceAvailable: currentReference.available,
    rowCountBaseline: rowCountBaseline.value,
    rowCountCandidate: rowCountCandidate.value,
    rowCountDeltaPct: pctDelta(rowCountBaseline.value, rowCountCandidate.value),
    targetPositiveRateBaseline: targetPositiveRateBaseline.value,
    targetPositiveRateCandidate: targetPositiveRateCandidate.value,
    targetPositiveRateDelta: absoluteDelta(targetPositiveRateBaseline.value, targetPositiveRateCandidate.value),
    metadataReadOnlyDataDriftBaseline,
    backendModelExecutionAllowed,
    runtimeInvocationAllowed,
    backendInferenceEndpointExposed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    artifactActivationAllowed,
    artifactBytesLoadingAllowedInBackend,
    rawTrainingCsvLoadingAllowedInBackend,
    baselineTrainingDataLoadingAllowedInBackend,
    recommendedNextAction: status === "drift_metadata_ready"
      ? "Review offline drift baseline metadata before comparing candidate quality; this is not production approval."
      : "Add drift baseline metadata in the offline candidate package builder before relying on drift diagnostics.",
  };

  return {
    success: true,
    contract: getContract(),
    summary,
    checks,
    driftSignals,
    baselineMetadataPreview: previewRecord(baselineReference.value),
    currentMetadataPreview: previewRecord(currentReference.value),
    featureDistributionPreview: previewRecord(featureDistribution.value),
    missingnessPreview: previewRecord(missingness.value),
    targetBalancePreview: previewRecord(targetBalance.value),
    sourceMetadata: {
      candidatePackageId: summary.candidatePackageId,
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      trainingManifestHash: summary.trainingManifestHash,
      driftMetadataSource: driftMetadata.source,
      featureDistributionSource: featureDistribution.source,
      missingnessSource: missingness.source,
      targetBalanceSource: targetBalance.source,
      rowCountSource: rowCountDrift.source !== "missing" ? rowCountDrift.source : rowCountCandidate.source,
      driftCheckKeys: [...DRIFT_CHECK_KEYS],
      warnings,
    },
    safetyPolicy,
  };
};

const notFoundResponse = (id: unknown): InventoryStockoutCandidateDataDriftBaselineMetadataResponse => {
  const checks = [
    makeCheck("candidate_metadata_import_found", "Candidate metadata import found", 100, "fail", "ml_candidate_evaluation_metadata_imports", id, "Imported candidate evaluation metadata row was not found."),
  ];
  const summary: InventoryStockoutCandidateDataDriftBaselineMetadataSummary = {
    generatedAt: new Date().toISOString(),
    status: "candidate_not_found",
    recommendation: "import_candidate_evaluation_metadata_first",
    candidatePackageId: null,
    modelKey: null,
    modelVersion: null,
    predictionType: null,
    targetColumn: null,
    horizonDays: null,
    trainingManifestHash: null,
    driftScorePct: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 1,
    driftSignalCount: 0,
    availableSignalCount: 0,
    missingSignalCount: 0,
    featureDistributionCount: 0,
    missingnessDriftCount: 0,
    targetBalanceSignalCount: 0,
    rowCountSignalCount: 0,
    baselineReferenceAvailable: false,
    currentReferenceAvailable: false,
    rowCountBaseline: null,
    rowCountCandidate: null,
    rowCountDeltaPct: null,
    targetPositiveRateBaseline: null,
    targetPositiveRateCandidate: null,
    targetPositiveRateDelta: null,
    metadataReadOnlyDataDriftBaseline,
    backendModelExecutionAllowed,
    runtimeInvocationAllowed,
    backendInferenceEndpointExposed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    artifactActivationAllowed,
    artifactBytesLoadingAllowedInBackend,
    rawTrainingCsvLoadingAllowedInBackend,
    baselineTrainingDataLoadingAllowedInBackend,
    recommendedNextAction: "Import Phase 9B candidate evaluation metadata before opening data drift baseline metadata.",
  };
  return {
    success: true,
    contract: getContract(),
    summary,
    checks,
    driftSignals: [],
    baselineMetadataPreview: {},
    currentMetadataPreview: {},
    featureDistributionPreview: {},
    missingnessPreview: {},
    targetBalancePreview: {},
    sourceMetadata: { requestedId: id },
    safetyPolicy,
  };
};

export const getInventoryStockoutCandidateDataDriftBaselineMetadataContract = () => getContract();

export const getInventoryStockoutCandidateDataDriftBaselineMetadata = async (metadataImportId: unknown) => {
  const row = await getMlCandidateEvaluationMetadataImportById(metadataImportId) as RawImportRow | null;
  if (!row) return notFoundResponse(metadataImportId);
  return buildDriftView(row);
};

export const getInventoryStockoutCandidateDataDriftBaselineMetadataSummary = async (input: { limit?: unknown } = {}): Promise<MlCandidateDataDriftBaselineMetadataCatalogSummary> => {
  const limit = asNumber(input.limit) ?? 10;
  const imports = await listMlCandidateEvaluationMetadataImports(limit) as RawImportRow[];
  const summaries = await Promise.all(imports.slice(0, limit).map(async (row) => {
    const response = await getInventoryStockoutCandidateDataDriftBaselineMetadata(row.id);
    return response.summary;
  }));
  const candidatesWithDriftMetadata = summaries.filter((summary) => summary.status !== "drift_metadata_missing").length;
  const averageDriftScorePct = summaries.length
    ? Math.round(summaries.reduce((sum, summary) => sum + summary.driftScorePct, 0) / summaries.length)
    : 0;
  return {
    generatedAt: new Date().toISOString(),
    contract: getContract(),
    candidateCount: imports.length,
    candidatesWithDriftMetadata,
    candidatesMissingDriftMetadata: Math.max(0, imports.length - candidatesWithDriftMetadata),
    averageDriftScorePct,
    lastCandidateDataDriftBaselineMetadata: summaries,
    recommendedNextAction: "Review offline drift metadata when present; do not enable backend execution, inference, activation, or business mutation.",
  };
};

/* Phase 9H anchors: inventory_stockout_offline_candidate_data_drift_baseline_metadata_v1, metadataReadOnlyDataDriftBaseline, drift_baseline_metadata_available, feature_distribution_metadata_available, missingness_drift_metadata_available, target_balance_drift_metadata_available, row_count_drift_metadata_available. */
