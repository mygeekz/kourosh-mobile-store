import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateCalibrationBin,
  InventoryStockoutCandidateCalibrationMetadataCheck,
  InventoryStockoutCandidateCalibrationMetadataContract,
  InventoryStockoutCandidateCalibrationMetadataResponse,
  InventoryStockoutCandidateCalibrationSignal,
  MlCandidateCalibrationMetadataCatalogSummary,
  OfflineCandidateCalibrationMetadataRecommendation,
  OfflineCandidateCalibrationMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_calibration_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9K" as const;

const metadataReadOnlyCalibrationMetadata = true as const;
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
const backendProbabilityRecalibrationAllowed = false as const;

const CALIBRATION_CHECK_KEYS = [
  "calibration_metadata_available",
  "probability_bins_reviewable",
  "predicted_probability_reviewable",
  "observed_positive_rate_reviewable",
  "brier_score_reviewable",
  "expected_calibration_error_reviewable",
  "no_backend_calibration_execution",
  "no_activation_or_decision_automation",
  "output_contract_safe_for_calibration_review",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No backend threshold execution.",
  "No backend calibration execution.",
  "No probability recalibration in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };
type CalibrationDiscovery = { value: unknown; source: string };

const safetyPolicy = {
  metadataReadOnlyCalibrationMetadata,
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
  backendProbabilityRecalibrationAllowed,
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

const findAtPaths = (sources: MetadataSource[], paths: string[]): CalibrationDiscovery => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (hasContent(value)) return { source: `${source.name}.${path}`, value };
    }
  }
  return { source: "missing", value: null };
};

const findNumberAtPaths = (sources: MetadataSource[], paths: string[]): CalibrationDiscovery & { numberValue: number | null } => {
  const discovery = findAtPaths(sources, paths);
  return { ...discovery, numberValue: asNumber(discovery.value) };
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (asRecord(value)) return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).filter(Boolean);
  return [];
};

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const parsed = parseJsonValue(value);
  const record = asRecord(parsed);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const extractBinsValue = (value: unknown): unknown => {
  const parsed = parseJsonValue(value);
  const record = asRecord(parsed);
  if (!record) return parsed;
  return record.bins
    ?? record.probabilityBins
    ?? record.probability_bins
    ?? record.calibrationBins
    ?? record.calibration_bins
    ?? record.calibrationCurve
    ?? record.calibration_curve
    ?? record.reliabilityDiagram
    ?? record.reliability_diagram
    ?? parsed;
};

const normalizeCalibrationBins = (value: unknown, source: string): InventoryStockoutCandidateCalibrationBin[] => {
  const binsValue = extractBinsValue(value);
  const entries: Array<[string, unknown]> = Array.isArray(binsValue)
    ? binsValue.map((entry, index) => [`bin_${index + 1}`, entry])
    : asRecord(binsValue)
      ? Object.entries(binsValue as Record<string, unknown>)
      : [];

  return entries.map(([key, entry], index) => {
    const record = asRecord(entry) || { value: entry };
    const lowerBound = asNumber(record.lowerBound ?? record.lower_bound ?? record.binLower ?? record.bin_lower ?? record.min ?? record.left);
    const upperBound = asNumber(record.upperBound ?? record.upper_bound ?? record.binUpper ?? record.bin_upper ?? record.max ?? record.right);
    const meanPredictedProbability = asNumber(
      record.meanPredictedProbability
      ?? record.mean_predicted_probability
      ?? record.predictedProbability
      ?? record.predicted_probability
      ?? record.averagePrediction
      ?? record.avgPrediction
      ?? record.probability,
    );
    const observedPositiveRate = asNumber(
      record.observedPositiveRate
      ?? record.observed_positive_rate
      ?? record.fractionPositive
      ?? record.fraction_positive
      ?? record.actualPositiveRate
      ?? record.empiricalPositiveRate
      ?? record.eventRate,
    );
    const sampleCount = asNumber(record.sampleCount ?? record.sample_count ?? record.count ?? record.n ?? record.rows);
    const label = String(record.label ?? record.binLabel ?? record.name ?? key ?? `bin_${index + 1}`).trim();
    return {
      key: String(key || `bin_${index + 1}`),
      label: label || `bin_${index + 1}`,
      lowerBound,
      upperBound,
      meanPredictedProbability,
      observedPositiveRate,
      sampleCount,
      source,
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
): InventoryStockoutCandidateCalibrationMetadataCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const buildSignals = (
  calibrationDiscovery: CalibrationDiscovery,
  bins: InventoryStockoutCandidateCalibrationBin[],
  brierScoreDiscovery: CalibrationDiscovery & { numberValue: number | null },
  eceDiscovery: CalibrationDiscovery & { numberValue: number | null },
): InventoryStockoutCandidateCalibrationSignal[] => {
  const probabilityBinCount = bins.filter((bin) => bin.lowerBound !== null || bin.upperBound !== null).length;
  const predictedProbabilityBinCount = bins.filter((bin) => bin.meanPredictedProbability !== null).length;
  const observedRateBinCount = bins.filter((bin) => bin.observedPositiveRate !== null).length;
  const signal = (
    key: string,
    family: InventoryStockoutCandidateCalibrationSignal["family"],
    label: string,
    count: number,
    source: string,
    value: unknown,
    message: string,
  ): InventoryStockoutCandidateCalibrationSignal => ({
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
    signal("calibration_metadata_available", "calibration_metadata", "Calibration metadata", bins.length, calibrationDiscovery.source, calibrationDiscovery.value, bins.length ? "Offline calibration metadata is available." : "No calibration metadata is available."),
    signal("probability_bins_reviewable", "probability_bins", "Probability bins", probabilityBinCount, calibrationDiscovery.source, probabilityBinCount, probabilityBinCount ? "Probability bins are reviewable." : "Probability-bin metadata is missing."),
    signal("predicted_probability_reviewable", "predicted_probability", "Mean predicted probability", predictedProbabilityBinCount, calibrationDiscovery.source, predictedProbabilityBinCount, predictedProbabilityBinCount ? "Predicted probability metadata exists in bins." : "Predicted probability metadata is missing."),
    signal("observed_positive_rate_reviewable", "observed_rate", "Observed positive rate", observedRateBinCount, calibrationDiscovery.source, observedRateBinCount, observedRateBinCount ? "Observed positive rates are reviewable." : "Observed positive rate metadata is missing."),
    signal("brier_score_reviewable", "brier_score", "Brier score", brierScoreDiscovery.numberValue === null ? 0 : 1, brierScoreDiscovery.source, brierScoreDiscovery.value, brierScoreDiscovery.numberValue === null ? "Brier score metadata is missing." : "Brier score is available from metadata."),
    signal("expected_calibration_error_reviewable", "expected_calibration_error", "Expected calibration error", eceDiscovery.numberValue === null ? 0 : 1, eceDiscovery.source, eceDiscovery.value, eceDiscovery.numberValue === null ? "Expected calibration error metadata is missing." : "Expected calibration error is available from metadata."),
    signal("no_backend_calibration_execution", "safety", "No backend calibration execution", 1, "safetyPolicy.backendCalibrationExecutionAllowed", false, "Backend calibration execution remains disabled."),
  ];
};

const buildChecks = (
  calibrationDiscovery: CalibrationDiscovery,
  bins: InventoryStockoutCandidateCalibrationBin[],
  brierScoreDiscovery: CalibrationDiscovery & { numberValue: number | null },
  eceDiscovery: CalibrationDiscovery & { numberValue: number | null },
  row: RawImportRow,
) => {
  const signals = buildSignals(calibrationDiscovery, bins, brierScoreDiscovery, eceDiscovery);
  const probabilityBinCount = bins.filter((bin) => bin.lowerBound !== null || bin.upperBound !== null).length;
  const predictedProbabilityBinCount = bins.filter((bin) => bin.meanPredictedProbability !== null).length;
  const observedRateBinCount = bins.filter((bin) => bin.observedPositiveRate !== null).length;
  const outputContractStatus = String(row.outputContractStatus ?? "").toLowerCase();
  const safetyPolicyStatus = String(row.safetyPolicyStatus ?? "").toLowerCase();
  const checks = [
    makeCheck("calibration_metadata_available", "Calibration metadata", 14, bins.length ? "pass" : "warning", calibrationDiscovery.source, bins.length, bins.length ? "Offline calibration metadata is present." : "Calibration metadata was not included in the imported candidate package."),
    makeCheck("probability_bins_reviewable", "Probability bins reviewable", 10, probabilityBinCount ? "pass" : "warning", calibrationDiscovery.source, probabilityBinCount, probabilityBinCount ? "Probability bins can be reviewed from metadata." : "No probability-bin metadata is available for review."),
    makeCheck("predicted_probability_reviewable", "Predicted probability reviewable", 10, predictedProbabilityBinCount ? "pass" : "warning", calibrationDiscovery.source, predictedProbabilityBinCount, predictedProbabilityBinCount ? "Mean predicted probability metadata exists in bins." : "Predicted probability metadata is missing."),
    makeCheck("observed_positive_rate_reviewable", "Observed positive rate reviewable", 10, observedRateBinCount ? "pass" : "warning", calibrationDiscovery.source, observedRateBinCount, observedRateBinCount ? "Observed positive rate metadata exists in bins." : "Observed positive rate metadata is missing."),
    makeCheck("brier_score_reviewable", "Brier score reviewable", 8, brierScoreDiscovery.numberValue !== null ? "pass" : "warning", brierScoreDiscovery.source, brierScoreDiscovery.value, brierScoreDiscovery.numberValue !== null ? "Brier score is reviewable from metadata." : "Brier score metadata is missing."),
    makeCheck("expected_calibration_error_reviewable", "Expected calibration error reviewable", 8, eceDiscovery.numberValue !== null ? "pass" : "warning", eceDiscovery.source, eceDiscovery.value, eceDiscovery.numberValue !== null ? "Expected calibration error is reviewable from metadata." : "Expected calibration error metadata is missing."),
    makeCheck("no_backend_calibration_execution", "No backend calibration execution", 12, backendCalibrationExecutionAllowed === false && backendProbabilityRecalibrationAllowed === false ? "pass" : "fail", "safetyPolicy.backendCalibrationExecutionAllowed", backendCalibrationExecutionAllowed, "Backend calibration execution and probability recalibration are disabled."),
    makeCheck("no_activation_or_decision_automation", "No activation or decision automation", 14, safetyPolicyStatus === "pass" || safetyPolicyStatus === "warning" || !safetyPolicyStatus ? "pass" : "fail", "metadataImport.safetyPolicyStatus", row.safetyPolicyStatus, "Calibration metadata does not activate a model or automate decisions."),
    makeCheck("output_contract_safe_for_calibration_review", "Safe output contract", 14, outputContractStatus === "pass" || outputContractStatus === "warning" || !outputContractStatus ? "pass" : "fail", "metadataImport.outputContractStatus", row.outputContractStatus, "Calibration review relies on safe candidate-output metadata only."),
  ];
  return { checks, signals };
};

const buildContract = (): InventoryStockoutCandidateCalibrationMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline calibration metadata snapshot for Inventory Stockout candidate models.",
  metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
  readOnly: true,
  allowedMetadataFamilies: [
    "calibration_metadata",
    "calibration_bins",
    "probability_bins",
    "reliability_diagram",
    "brier_score",
    "expected_calibration_error",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

export const buildInventoryStockoutCandidateCalibrationMetadataContract = buildContract;

const buildMissingResponse = (inputId: unknown, contract: InventoryStockoutCandidateCalibrationMetadataContract, generatedAt: string): InventoryStockoutCandidateCalibrationMetadataResponse => ({
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
    calibrationScorePct: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 1,
    totalCheckCount: CALIBRATION_CHECK_KEYS.length,
    calibrationBinCount: 0,
    probabilityBinCount: 0,
    predictedProbabilityBinCount: 0,
    observedRateBinCount: 0,
    sampleCountBinCount: 0,
    brierScore: null,
    expectedCalibrationError: null,
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
    backendProbabilityRecalibrationAllowed,
    recommendedNextAction: "Import Phase 9B candidate evaluation metadata before reviewing calibration metadata.",
  },
  checks: [],
  calibrationSignals: [],
  calibrationBins: [],
  calibrationMetadataPreview: {},
  safetyPolicy,
});

export const buildInventoryStockoutCandidateCalibrationMetadata = async (input: { id: unknown }): Promise<InventoryStockoutCandidateCalibrationMetadataResponse> => {
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

  const calibrationDiscovery = findAtPaths(sources, [
    "calibration",
    "calibrationMetadata",
    "calibration_metadata",
    "calibrationCurve",
    "calibration_curve",
    "probabilityBins",
    "probability_bins",
    "reliabilityDiagram",
    "reliability_diagram",
    "metrics.calibration",
    "metrics.calibrationCurve",
    "metrics.probabilityBins",
    "evaluation.calibration",
    "classification.calibration",
    "offlineCalibrationMetadata",
  ]);
  const brierScoreDiscovery = findNumberAtPaths(sources, [
    "brierScore",
    "brier_score",
    "metrics.brierScore",
    "metrics.brier_score",
    "calibration.brierScore",
    "calibration.brier_score",
    "classification.brierScore",
    "evaluation.brierScore",
  ]);
  const eceDiscovery = findNumberAtPaths(sources, [
    "expectedCalibrationError",
    "expected_calibration_error",
    "ece",
    "metrics.expectedCalibrationError",
    "metrics.expected_calibration_error",
    "metrics.ece",
    "calibration.expectedCalibrationError",
    "calibration.ece",
    "classification.expectedCalibrationError",
    "evaluation.expectedCalibrationError",
  ]);
  const calibrationBins = normalizeCalibrationBins(calibrationDiscovery.value, calibrationDiscovery.source);
  const { checks, signals } = buildChecks(calibrationDiscovery, calibrationBins, brierScoreDiscovery, eceDiscovery, row);
  const weight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + check.earned, 0);
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const calibrationScorePct = weight ? Math.round((earned / weight) * 100) : 0;
  const probabilityBinCount = calibrationBins.filter((bin) => bin.lowerBound !== null || bin.upperBound !== null).length;
  const predictedProbabilityBinCount = calibrationBins.filter((bin) => bin.meanPredictedProbability !== null).length;
  const observedRateBinCount = calibrationBins.filter((bin) => bin.observedPositiveRate !== null).length;
  const sampleCountBinCount = calibrationBins.filter((bin) => bin.sampleCount !== null).length;
  const warnings = [
    ...checks.filter((check) => check.status !== "pass").map((check) => check.message),
    ...calibrationBins.flatMap((bin) => bin.notes),
  ].slice(0, 20);
  const status: OfflineCandidateCalibrationMetadataStatus =
    calibrationBins.length === 0 && brierScoreDiscovery.numberValue === null && eceDiscovery.numberValue === null
      ? "calibration_metadata_missing"
      : failCount > 0 || warningCount > 0
        ? "calibration_metadata_warning"
        : "calibration_metadata_ready";
  const recommendation: OfflineCandidateCalibrationMetadataRecommendation =
    status === "calibration_metadata_missing" ? "add_offline_calibration_metadata_to_candidate_package" : "review_calibration_metadata";

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
      calibrationScorePct,
      passCount,
      warningCount,
      failCount,
      totalCheckCount: checks.length,
      calibrationBinCount: calibrationBins.length,
      probabilityBinCount,
      predictedProbabilityBinCount,
      observedRateBinCount,
      sampleCountBinCount,
      brierScore: brierScoreDiscovery.numberValue,
      expectedCalibrationError: eceDiscovery.numberValue,
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
      backendProbabilityRecalibrationAllowed,
      recommendedNextAction: recommendation === "review_calibration_metadata"
        ? "Review calibration metadata as an offline confidence-quality snapshot only; do not treat it as activation or production readiness."
        : "Add calibration bins, Brier score, and expected calibration error to the offline candidate package metadata if calibration review is required.",
    },
    checks,
    calibrationSignals: signals,
    calibrationBins,
    calibrationMetadataPreview: previewRecord(calibrationDiscovery.value),
    safetyPolicy,
  };
};

export const buildMlCandidateCalibrationMetadataCatalogSummary = async (_query: Record<string, unknown> = {}): Promise<MlCandidateCalibrationMetadataCatalogSummary> => {
  const contract = buildContract();
  const rows = await listMlCandidateEvaluationMetadataImports({ limit: 8 }) as Array<Record<string, unknown>>;
  const candidateCount = rows.length;
  return {
    generatedAt: new Date().toISOString(),
    contract,
    currentCandidateCalibrationMetadata: {
      generatedAt: new Date().toISOString(),
      status: candidateCount ? "calibration_metadata_warning" : "calibration_metadata_missing",
      recommendation: candidateCount ? "review_calibration_metadata" : "import_candidate_evaluation_metadata_first",
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports imported by Phase 9B",
      metadataReadOnlyCalibrationMetadata,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      backendThresholdExecutionAllowed,
      backendCalibrationExecutionAllowed,
      backendProbabilityRecalibrationAllowed,
    },
    recentCandidateImports: rows.map((row) => ({
      id: row.id,
      candidatePackageId: row.candidatePackageId,
      modelKey: row.modelKey,
      modelVersion: row.modelVersion,
      predictionType: row.predictionType,
      horizonDays: row.horizonDays,
      validationStatus: row.validationStatus,
      metricsStatus: row.metricsStatus,
      outputContractStatus: row.outputContractStatus,
      safetyPolicyStatus: row.safetyPolicyStatus,
      createdAt: row.createdAt,
    })),
    recommendedNextAction: "Open a candidate from the comparison dashboard and review imported calibration metadata only. Backend execution, inference, activation, and mutation remain disabled.",
  };
};

/* Phase 9K service anchors: ml_candidate_evaluation_metadata_imports, calibration_metadata_available, probability_bins_reviewable, predicted_probability_reviewable, observed_positive_rate_reviewable, brier_score_reviewable, expected_calibration_error_reviewable, no_backend_calibration_execution, output_contract_safe_for_calibration_review, metadataReadOnlyCalibrationMetadata = true, backendCalibrationExecutionAllowed = false, backendProbabilityRecalibrationAllowed = false. */
