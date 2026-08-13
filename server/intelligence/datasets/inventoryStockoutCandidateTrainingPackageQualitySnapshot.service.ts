import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateTrainingPackageQualityCheck,
  InventoryStockoutCandidateTrainingPackageQualitySnapshotContract,
  InventoryStockoutCandidateTrainingPackageQualitySnapshotResponse,
  MlCandidateTrainingPackageQualitySnapshotCatalogSummary,
  OfflineCandidateTrainingPackageQualitySnapshotRecommendation,
  OfflineCandidateTrainingPackageQualitySnapshotStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_training_package_quality_snapshot_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9G" as const;

const metadataReadOnlyTrainingPackageQualitySnapshot = true as const;
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

const QUALITY_CHECK_KEYS = [
  "training_package_validation_report_available",
  "validation_status_available",
  "validation_errors_absent",
  "training_rows_available",
  "test_rows_available",
  "feature_count_available",
  "missing_columns_absent",
  "target_definition_available",
  "feature_contract_available",
  "split_information_available",
  "training_manifest_hash_available",
  "warnings_reviewable",
] as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

type RawImportRow = Record<string, unknown>;

const safetyPolicy = {
  metadataReadOnlyTrainingPackageQualitySnapshot,
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

const hasValueAtPaths = (sources: Array<{ name: string; record: Record<string, unknown> }>, paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (value === false) return { available: true, source: `${source.name}.${path}`, value };
      if (typeof value === "number" && Number.isFinite(value)) return { available: true, source: `${source.name}.${path}`, value };
      if (typeof value === "string" && value.trim()) return { available: true, source: `${source.name}.${path}`, value };
      if (Array.isArray(value) && value.length > 0) return { available: true, source: `${source.name}.${path}`, value };
      const recordValue = asRecord(value);
      if (recordValue && Object.keys(recordValue).length > 0) return { available: true, source: `${source.name}.${path}`, value };
    }
  }
  return { available: false, source: "missing", value: null };
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (asRecord(value)) return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).filter(Boolean);
  return [];
};

const firstNumberAtPaths = (sources: Array<{ name: string; record: Record<string, unknown> }>, paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = asNumber(getPath(source.record, path));
      if (value !== null) return { value, source: `${source.name}.${path}` };
    }
  }
  return { value: null, source: "missing" };
};

const firstArrayAtPaths = (sources: Array<{ name: string; record: Record<string, unknown> }>, paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (Array.isArray(value)) return { value, source: `${source.name}.${path}` };
      if (asRecord(value)) return { value: Object.keys(value as Record<string, unknown>), source: `${source.name}.${path}` };
    }
  }
  return { value: [], source: "missing" };
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateTrainingPackageQualityCheck => ({
  key,
  label,
  status,
  weight,
  earned: status === "pass" ? weight : status === "warning" ? Math.round(weight * 0.5) : 0,
  source,
  value,
  message,
});

const statusFromValidation = (rowStatus: unknown, validationReport: Record<string, unknown>) =>
  asString(rowStatus ?? validationReport.status ?? validationReport.validationStatus ?? validationReport.result);

const buildChecks = (input: {
  row: RawImportRow;
  candidateManifest: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  metrics: Record<string, unknown>;
  evaluationReport: Record<string, unknown>;
  trainingPackageValidationReport: Record<string, unknown>;
}) => {
  const validationReport = input.trainingPackageValidationReport;
  const sources = [
    { name: "trainingPackageValidationReport", record: validationReport },
    { name: "candidateManifest", record: input.candidateManifest },
    { name: "modelCard", record: input.modelCard },
    { name: "metrics", record: input.metrics },
    { name: "evaluationReport", record: input.evaluationReport },
    { name: "metadataImport", record: input.row },
  ];

  const reportAvailable = Object.keys(validationReport).length > 0 && !validationReport.parseWarning;
  const validationStatus = statusFromValidation(input.row.validationStatus, validationReport);
  const errors = asStringArray(validationReport.errors ?? validationReport.errorMessages ?? validationReport.validationErrors);
  const warnings = asStringArray(validationReport.warnings ?? validationReport.warningMessages ?? validationReport.validationWarnings);
  const trainRows = firstNumberAtPaths(sources, ["rowCounts.train", "rowCounts.training", "trainRowCount", "trainingRowCount", "trainRows", "summary.trainRows"]);
  const testRows = firstNumberAtPaths(sources, ["rowCounts.test", "testRowCount", "testRows", "summary.testRows"]);
  const featureCount = firstNumberAtPaths(sources, ["featureCount", "features.count", "summary.featureCount", "featureContract.featureCount"]);
  const featureList = hasValueAtPaths(sources, ["featureContract.features", "features", "featureColumns", "requiredFeatureColumns", "inputFeatures"]);
  const featureCountValue = featureCount.value ?? (Array.isArray(featureList.value) ? featureList.value.length : null);
  const missingColumns = firstArrayAtPaths(sources, ["missingColumns", "missingFeatureColumns", "requiredMissingColumns", "columns.missing", "summary.missingColumns"]);
  const target = hasValueAtPaths(sources, ["target", "target.column", "targetColumn", "targetDefinition", "target_definition"]);
  const splitInfo = hasValueAtPaths(sources, ["split", "splitInfo", "splitInformation", "datasetSplit", "trainingSplit", "manifest.split"]);
  const manifestHash = hasValueAtPaths(sources, ["trainingManifestHash", "trainingPackageReference.trainingManifestHash", "manifestHash"]);

  return {
    checks: [
      makeCheck(
        "training_package_validation_report_available",
        "Training package validation report",
        10,
        reportAvailable ? "pass" : "fail",
        reportAvailable ? "trainingPackageValidationReportJson" : "missing",
        reportAvailable,
        reportAvailable ? "Imported metadata contains a training package validation report." : "training_package_validation_report_json is missing or unreadable.",
      ),
      makeCheck(
        "validation_status_available",
        "Validation status",
        8,
        validationStatus ? validationStatus.toLowerCase() === "fail" ? "fail" : validationStatus.toLowerCase() === "warning" ? "warning" : "pass" : "fail",
        validationStatus ? "metadataImport.validationStatus" : "missing",
        validationStatus,
        validationStatus ? `Validation status is ${validationStatus}.` : "Validation status is missing from imported metadata.",
      ),
      makeCheck(
        "validation_errors_absent",
        "Validation errors absent",
        12,
        errors.length === 0 ? "pass" : "fail",
        errors.length ? "trainingPackageValidationReport.errors" : "trainingPackageValidationReport.errors",
        errors.length,
        errors.length === 0 ? "No validation errors are present in imported metadata." : "Validation errors are present and must be fixed offline before candidate comparison.",
      ),
      makeCheck(
        "training_rows_available",
        "Training rows available",
        8,
        trainRows.value && trainRows.value > 0 ? "pass" : "fail",
        trainRows.source,
        trainRows.value,
        trainRows.value && trainRows.value > 0 ? "Training row count is available and non-empty." : "Training row count is missing or zero in validation metadata.",
      ),
      makeCheck(
        "test_rows_available",
        "Test rows available",
        8,
        testRows.value && testRows.value > 0 ? "pass" : "fail",
        testRows.source,
        testRows.value,
        testRows.value && testRows.value > 0 ? "Test row count is available and non-empty." : "Test row count is missing or zero in validation metadata.",
      ),
      makeCheck(
        "feature_count_available",
        "Feature count available",
        8,
        featureCountValue && featureCountValue > 0 ? "pass" : "fail",
        featureCount.source !== "missing" ? featureCount.source : featureList.source,
        featureCountValue,
        featureCountValue && featureCountValue > 0 ? "Feature count or feature list is available." : "Feature count/list is missing from imported metadata.",
      ),
      makeCheck(
        "missing_columns_absent",
        "Missing columns absent",
        10,
        missingColumns.value.length === 0 ? "pass" : "fail",
        missingColumns.source,
        missingColumns.value.length,
        missingColumns.value.length === 0 ? "No missing required columns are reported." : "Missing required feature/target columns are reported in validation metadata.",
      ),
      makeCheck(
        "target_definition_available",
        "Target definition available",
        8,
        target.available ? "pass" : "fail",
        target.source,
        target.value,
        target.available ? "Target definition is available." : "Target definition is missing from imported metadata.",
      ),
      makeCheck(
        "feature_contract_available",
        "Feature contract available",
        8,
        featureList.available ? "pass" : "fail",
        featureList.source,
        featureList.value,
        featureList.available ? "Feature contract/list is available." : "Feature contract/list is missing from imported metadata.",
      ),
      makeCheck(
        "split_information_available",
        "Split information available",
        8,
        splitInfo.available ? "pass" : "warning",
        splitInfo.source,
        splitInfo.value,
        splitInfo.available ? "Split information is available." : "Split information is missing from imported metadata; review the offline package manifest.",
      ),
      makeCheck(
        "training_manifest_hash_available",
        "Training manifest hash available",
        7,
        manifestHash.available ? "pass" : "warning",
        manifestHash.source,
        manifestHash.value,
        manifestHash.available ? "Training manifest hash/reference is available." : "Training manifest hash/reference is missing from imported metadata.",
      ),
      makeCheck(
        "warnings_reviewable",
        "Warnings reviewable",
        5,
        warnings.length === 0 ? "pass" : "warning",
        warnings.length ? "trainingPackageValidationReport.warnings" : "trainingPackageValidationReport.warnings",
        warnings.length,
        warnings.length === 0 ? "No validation warnings are present." : "Validation warnings are present and visible for offline review.",
      ),
    ],
    trainRows,
    testRows,
    featureCountValue,
    missingColumns: missingColumns.value,
    warnings,
    errors,
    target,
    splitInfo,
    featureList,
    manifestHash,
    validationStatus,
  };
};

const chooseStatus = (
  row: RawImportRow | null,
  checks: InventoryStockoutCandidateTrainingPackageQualityCheck[],
): OfflineCandidateTrainingPackageQualitySnapshotStatus => {
  if (!row) return "candidate_not_found";
  if (checks.some((check) => check.status === "fail")) return "training_package_quality_blocked";
  if (checks.some((check) => check.status === "warning")) return "training_package_quality_warning";
  return "training_package_quality_ready";
};

const chooseRecommendation = (status: OfflineCandidateTrainingPackageQualitySnapshotStatus): OfflineCandidateTrainingPackageQualitySnapshotRecommendation => {
  if (status === "candidate_not_found") return "import_candidate_evaluation_metadata_first";
  if (status === "training_package_quality_blocked") return "fix_training_package_validation_errors";
  if (status === "training_package_quality_warning") return "review_training_package_quality_warnings";
  return "review_training_package_quality_metadata_only";
};

const buildRecommendedNextAction = (status: OfflineCandidateTrainingPackageQualitySnapshotStatus): string => {
  if (status === "candidate_not_found") return "Import candidate evaluation metadata first through Phase 9B.";
  if (status === "training_package_quality_blocked") return "Fix the offline training package validation issues in the workbench, rebuild candidate metadata, and import metadata again; backend execution remains disabled.";
  if (status === "training_package_quality_warning") return "Review training package warnings before candidate comparison; this remains metadata-only and cannot trigger production actions.";
  return "Review the training package quality snapshot as metadata only; no model execution, activation, inference, or business mutation is allowed.";
};

export const buildInventoryStockoutCandidateTrainingPackageQualitySnapshotContract = (): InventoryStockoutCandidateTrainingPackageQualitySnapshotContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Summarize imported offline training package validation metadata for Inventory Stockout candidate review visibility only.",
  snapshotScope: "offline_candidate_training_package_quality_metadata_only",
  dataSource: "ml_candidate_evaluation_metadata_imports",
  qualityCheckKeys: [...QUALITY_CHECK_KEYS],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  operationalPolicy: safetyPolicy,
});

export const buildInventoryStockoutCandidateTrainingPackageQualitySnapshot = async (
  input: { id?: unknown; metadataImportId?: unknown } = {},
): Promise<InventoryStockoutCandidateTrainingPackageQualitySnapshotResponse> => {
  const id = asNumber(input.id ?? input.metadataImportId);
  const row = id ? await getMlCandidateEvaluationMetadataImportById(id) as RawImportRow | null : null;
  const candidateManifest = parseJsonRecord(row?.candidateManifestJson);
  const modelCard = parseJsonRecord(row?.modelCardJson);
  const metrics = parseJsonRecord(row?.metricsJson);
  const evaluationReport = parseJsonRecord(row?.evaluationReportJson);
  const trainingPackageValidationReport = parseJsonRecord(row?.trainingPackageValidationReportJson);
  const checkBuild = row ? buildChecks({ row, candidateManifest, modelCard, metrics, evaluationReport, trainingPackageValidationReport }) : {
    checks: [] as InventoryStockoutCandidateTrainingPackageQualityCheck[],
    trainRows: { value: null, source: "missing" },
    testRows: { value: null, source: "missing" },
    featureCountValue: null,
    missingColumns: [] as unknown[],
    warnings: [] as string[],
    errors: [] as string[],
    target: { available: false, source: "missing", value: null },
    splitInfo: { available: false, source: "missing", value: null },
    featureList: { available: false, source: "missing", value: null },
    manifestHash: { available: false, source: "missing", value: null },
    validationStatus: null as string | null,
  };

  const checks = checkBuild.checks;
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earnedWeight = checks.reduce((sum, check) => sum + check.earned, 0);
  const qualityScorePct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const status = chooseStatus(row, checks);
  const recommendation = chooseRecommendation(status);
  const generatedAt = new Date().toISOString();
  const rowCountTrain = checkBuild.trainRows.value;
  const rowCountTest = checkBuild.testRows.value;
  const totalRows = rowCountTrain !== null && rowCountTest !== null ? rowCountTrain + rowCountTest : null;

  const summary = {
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    id: asNumber(row?.id),
    candidatePackageId: asString(row?.candidatePackageId ?? candidateManifest.candidatePackageId),
    modelKey: asString(row?.modelKey ?? candidateManifest.modelKey),
    modelVersion: asString(row?.modelVersion ?? candidateManifest.modelVersion),
    predictionType: asString(row?.predictionType ?? candidateManifest.predictionType),
    targetColumn: asString(row?.targetColumn ?? candidateManifest.targetColumn ?? getPath(candidateManifest, "target.column") ?? getPath(trainingPackageValidationReport, "target.column") ?? getPath(trainingPackageValidationReport, "targetColumn")),
    horizonDays: asNumber(row?.horizonDays ?? candidateManifest.horizonDays),
    validationStatus: checkBuild.validationStatus,
    trainingManifestHash: asString(row?.trainingManifestHash ?? checkBuild.manifestHash.value),
    qualityScorePct,
    totalWeight,
    earnedWeight,
    passCount: checks.filter((check) => check.status === "pass").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
    failCount: checks.filter((check) => check.status === "fail").length,
    rowCountTrain,
    rowCountTest,
    totalRows,
    featureCount: checkBuild.featureCountValue,
    missingColumnCount: checkBuild.missingColumns.length,
    warningMessageCount: checkBuild.warnings.length,
    errorMessageCount: checkBuild.errors.length,
    splitInfoAvailable: checkBuild.splitInfo.available,
    featureContractAvailable: checkBuild.featureList.available,
    targetDefinitionAvailable: checkBuild.target.available,
    safetyLocked: true,
    metadataReadOnlyTrainingPackageQualitySnapshot,
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
    recommendedNextAction: buildRecommendedNextAction(status),
  };

  return {
    success: true,
    contract: buildInventoryStockoutCandidateTrainingPackageQualitySnapshotContract(),
    summary,
    checks,
    validationReportPreview: {
      status: checkBuild.validationStatus,
      generatedAt: trainingPackageValidationReport.generatedAt ?? null,
      featureCount: checkBuild.featureCountValue,
      missingColumns: checkBuild.missingColumns.slice(0, 20),
      warningCount: checkBuild.warnings.length,
      errorCount: checkBuild.errors.length,
    },
    rowCountSnapshot: {
      trainRows: rowCountTrain,
      testRows: rowCountTest,
      totalRows,
      trainRowsSource: checkBuild.trainRows.source,
      testRowsSource: checkBuild.testRows.source,
    },
    featureContractSnapshot: {
      available: checkBuild.featureList.available,
      source: checkBuild.featureList.source,
      featureCount: checkBuild.featureCountValue,
      missingColumns: checkBuild.missingColumns.slice(0, 30),
    },
    targetSnapshot: {
      available: checkBuild.target.available,
      source: checkBuild.target.source,
      value: checkBuild.target.value,
    },
    splitSnapshot: {
      available: checkBuild.splitInfo.available,
      source: checkBuild.splitInfo.source,
      value: checkBuild.splitInfo.value,
    },
    warnings: checkBuild.warnings,
    errors: checkBuild.errors,
    safetyPolicy,
  };
};

export const buildMlCandidateTrainingPackageQualitySnapshotCatalogSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlCandidateTrainingPackageQualitySnapshotCatalogSummary> => {
  const imports = await listMlCandidateEvaluationMetadataImports(asNumber(input.limit) ?? 10) as RawImportRow[];
  const latest = imports[0] || null;
  const current = latest ? await buildInventoryStockoutCandidateTrainingPackageQualitySnapshot({ id: latest.id }) : null;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidateTrainingPackageQualitySnapshotContract(),
    currentCandidateTrainingPackageQualitySnapshot: current?.summary ?? null,
    recentCandidateMetadataImports: imports.slice(0, 10),
    recommendedNextAction: current?.summary.recommendedNextAction || "Import candidate evaluation metadata first through Phase 9B, then review training package quality metadata only.",
  };
};

/* Phase 9G anchors: inventory_stockout_offline_candidate_training_package_quality_snapshot_v1, metadataReadOnlyTrainingPackageQualitySnapshot, training package quality snapshot metadata-only, no backend model execution, no inference endpoint, no artifact activation. */
