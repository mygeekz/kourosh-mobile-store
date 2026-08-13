import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateFeatureContractDriftMetadataCheck,
  InventoryStockoutCandidateFeatureContractDriftMetadataContract,
  InventoryStockoutCandidateFeatureContractDriftMetadataResponse,
  InventoryStockoutCandidateFeatureContractDriftMetadataSummary,
  InventoryStockoutCandidateFeatureContractDriftSignal,
  MlCandidateFeatureContractDriftMetadataCatalogSummary,
  OfflineCandidateFeatureContractDriftMetadataRecommendation,
  OfflineCandidateFeatureContractDriftMetadataStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_feature_contract_drift_metadata_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9I" as const;

const metadataReadOnlyFeatureContractDrift = true as const;
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
const backendFeatureContractMutationAllowed = false as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training file loading in backend.",
  "No baseline training data loading in backend.",
  "No feature-contract mutation in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, invoice, or training records.",
] as const;

const FEATURE_CONTRACT_CHECK_KEYS = [
  "feature_contract_drift_metadata_available",
  "baseline_feature_contract_available",
  "candidate_feature_contract_available",
  "added_features_reviewable",
  "removed_features_reviewable",
  "changed_features_reviewable",
  "type_drift_reviewable",
  "nullable_drift_reviewable",
  "target_contract_drift_reviewable",
] as const;

type RawImportRow = Record<string, unknown>;
type MetadataSource = { name: string; record: Record<string, unknown> };
type FeatureMap = Record<string, Record<string, unknown>>;

const safetyPolicy = {
  metadataReadOnlyFeatureContractDrift,
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
  backendFeatureContractMutationAllowed,
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

const previewRecord = (value: unknown, limit = 12): Record<string, unknown> => {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).slice(0, limit));
};

const normalizeFeatureContract = (value: unknown): FeatureMap => {
  const result: FeatureMap = {};
  const addFeature = (name: string, spec: unknown) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    const specRecord = asRecord(spec);
    result[cleanName] = specRecord ? specRecord : { name: cleanName, type: typeof spec === "string" ? spec : "unknown" };
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") addFeature(item, { name: item, type: "unknown" });
      else {
        const record = asRecord(item);
        const name = String(record?.name ?? record?.feature ?? record?.column ?? record?.key ?? "").trim();
        if (name) addFeature(name, record || item);
      }
    }
    return result;
  }

  const record = asRecord(value);
  if (!record) return result;

  const nested = record.features || record.featureContract || record.columns || record.schema || record.requiredFeatures;
  if (nested && nested !== value) return normalizeFeatureContract(nested);

  for (const [key, entry] of Object.entries(record)) {
    if (["target", "targetColumn", "targetDefinition", "metadata", "version"].includes(key)) continue;
    addFeature(key, entry);
  }
  return result;
};

const featureType = (spec: Record<string, unknown> | undefined): string | null => {
  if (!spec) return null;
  const value = spec.type ?? spec.dtype ?? spec.dataType ?? spec.kind ?? spec.featureType;
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
};

const featureNullable = (spec: Record<string, unknown> | undefined): boolean | null => {
  if (!spec) return null;
  const value = spec.nullable ?? spec.allowNull ?? spec.required ?? spec.optional ?? spec.missingAllowed;
  if (typeof value === "boolean") {
    if ("required" in spec) return !value;
    return value;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "nullable", "optional"].includes(text)) return true;
    if (["false", "no", "required", "not_null"].includes(text)) return false;
  }
  return null;
};

const deriveContractDelta = (baselineValue: unknown, candidateValue: unknown) => {
  const baseline = normalizeFeatureContract(baselineValue);
  const candidate = normalizeFeatureContract(candidateValue);
  const baselineNames = new Set(Object.keys(baseline));
  const candidateNames = new Set(Object.keys(candidate));
  const addedFeatures = [...candidateNames].filter((name) => !baselineNames.has(name)).sort();
  const removedFeatures = [...baselineNames].filter((name) => !candidateNames.has(name)).sort();
  const sharedFeatures = [...candidateNames].filter((name) => baselineNames.has(name)).sort();
  const typeDrift = sharedFeatures
    .filter((name) => featureType(baseline[name]) !== featureType(candidate[name]) && (featureType(baseline[name]) || featureType(candidate[name])))
    .map((name) => ({ feature: name, baselineType: featureType(baseline[name]), candidateType: featureType(candidate[name]) }));
  const nullableDrift = sharedFeatures
    .filter((name) => featureNullable(baseline[name]) !== featureNullable(candidate[name]) && (featureNullable(baseline[name]) !== null || featureNullable(candidate[name]) !== null))
    .map((name) => ({ feature: name, baselineNullable: featureNullable(baseline[name]), candidateNullable: featureNullable(candidate[name]) }));
  const changedFeatures = [...new Set([...typeDrift.map((item) => item.feature), ...nullableDrift.map((item) => item.feature)])].sort();
  return { baseline, candidate, addedFeatures, removedFeatures, changedFeatures, typeDrift, nullableDrift };
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  status: "pass" | "warning" | "fail",
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateFeatureContractDriftMetadataCheck => ({
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
  family: InventoryStockoutCandidateFeatureContractDriftSignal["family"],
  label: string,
  source: string,
  value: unknown,
  message: string,
): InventoryStockoutCandidateFeatureContractDriftSignal => ({
  key,
  family,
  label,
  status: hasContent(value) ? "available" : "missing",
  source,
  value: value ?? null,
  count: countEntries(value),
  message,
});

export const buildInventoryStockoutCandidateFeatureContractDriftMetadataContract = (): InventoryStockoutCandidateFeatureContractDriftMetadataContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  phase: PHASE,
  generatedAt: new Date().toISOString(),
  purpose: "Read imported offline candidate metadata and display feature contract drift metadata only. This does not load raw datasets, baseline files, models, artifacts, or runtime ML packages.",
  metadataSource: "ml_candidate_evaluation_metadata_imports",
  readOnly: true,
  allowedMetadataFamilies: [
    "baseline feature contract metadata",
    "candidate feature contract metadata",
    "added feature metadata",
    "removed feature metadata",
    "changed feature metadata",
    "type drift metadata",
    "nullable drift metadata",
    "target contract drift metadata",
  ],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  safetyPolicy,
});

const buildFeatureContractView = (row: RawImportRow): InventoryStockoutCandidateFeatureContractDriftMetadataResponse => {
  const candidateManifest = parseJsonRecord(row.candidateManifestJson);
  const modelCard = parseJsonRecord(row.modelCardJson);
  const metrics = parseJsonRecord(row.metricsJson);
  const evaluationReport = parseJsonRecord(row.evaluationReportJson);
  const trainingPackageValidationReport = parseJsonRecord(row.trainingPackageValidationReportJson);
  const importSummary = parseJsonRecord(row.importSummaryJson);
  const checksums = parseJsonRecord(row.checksumsJson);

  const sources: MetadataSource[] = [
    { name: "evaluationReport", record: evaluationReport },
    { name: "metrics", record: metrics },
    { name: "candidateManifest", record: candidateManifest },
    { name: "modelCard", record: modelCard },
    { name: "trainingPackageValidationReport", record: trainingPackageValidationReport },
    { name: "importSummary", record: importSummary },
    { name: "checksums", record: checksums },
    { name: "metadataImport", record: row },
  ];

  const driftMetadata = findAtPaths(sources, [
    "featureContractDrift",
    "feature_contract_drift",
    "dataDrift.featureContractDrift",
    "driftBaseline.featureContractDrift",
    "driftBaselineMetadata.featureContractDrift",
    "datasetDrift.featureContractDrift",
    "contractDrift",
    "schemaDrift",
  ]);
  const baselineFeatureContract = findAtPaths(sources, [
    "featureContractDrift.baselineFeatureContract",
    "dataDrift.featureContract.baseline",
    "driftBaseline.featureContract.baseline",
    "baselineFeatureContract",
    "baselineFeatureSchema",
    "featureContracts.baseline",
    "trainingPackageReference.baselineFeatureContract",
  ]);
  const candidateFeatureContract = findAtPaths(sources, [
    "featureContractDrift.candidateFeatureContract",
    "dataDrift.featureContract.candidate",
    "driftBaseline.featureContract.candidate",
    "candidateFeatureContract",
    "candidateFeatureSchema",
    "featureContracts.candidate",
    "featureContract",
    "feature_contract",
    "features",
    "featureList",
  ]);
  const addedMetadata = findAtPaths(sources, [
    "featureContractDrift.addedFeatures",
    "dataDrift.featureContract.addedFeatures",
    "contractDrift.addedFeatures",
    "schemaDrift.addedFeatures",
    "addedFeatures",
  ]);
  const removedMetadata = findAtPaths(sources, [
    "featureContractDrift.removedFeatures",
    "dataDrift.featureContract.removedFeatures",
    "contractDrift.removedFeatures",
    "schemaDrift.removedFeatures",
    "removedFeatures",
  ]);
  const changedMetadata = findAtPaths(sources, [
    "featureContractDrift.changedFeatures",
    "dataDrift.featureContract.changedFeatures",
    "contractDrift.changedFeatures",
    "schemaDrift.changedFeatures",
    "changedFeatures",
  ]);
  const typeDriftMetadata = findAtPaths(sources, [
    "featureContractDrift.typeDrift",
    "featureContractDrift.typeChanges",
    "dataDrift.featureContract.typeDrift",
    "contractDrift.typeDrift",
    "schemaDrift.typeDrift",
    "typeDrift",
  ]);
  const nullableDriftMetadata = findAtPaths(sources, [
    "featureContractDrift.nullableDrift",
    "featureContractDrift.nullabilityChanges",
    "dataDrift.featureContract.nullableDrift",
    "contractDrift.nullableDrift",
    "schemaDrift.nullableDrift",
    "nullableDrift",
  ]);
  const targetContractDrift = findAtPaths(sources, [
    "featureContractDrift.targetContractDrift",
    "targetContractDrift",
    "targetDefinition.drift",
    "dataDrift.targetContractDrift",
    "contractDrift.targetContractDrift",
    "candidateManifest.target",
    "targetDefinition",
  ]);

  const derivedDelta = deriveContractDelta(baselineFeatureContract.value, candidateFeatureContract.value);
  const addedFeatures = addedMetadata.available ? asStringArray(addedMetadata.value) : derivedDelta.addedFeatures;
  const removedFeatures = removedMetadata.available ? asStringArray(removedMetadata.value) : derivedDelta.removedFeatures;
  const changedFeatures = changedMetadata.available ? asStringArray(changedMetadata.value) : derivedDelta.changedFeatures;
  const typeDrift = typeDriftMetadata.available ? typeDriftMetadata.value : derivedDelta.typeDrift;
  const nullableDrift = nullableDriftMetadata.available ? nullableDriftMetadata.value : derivedDelta.nullableDrift;
  const baselineFeatureCount = Object.keys(derivedDelta.baseline).length || asNumber(getPath(candidateManifest, "baselineFeatureCount")) || countEntries(baselineFeatureContract.value);
  const candidateFeatureCount = Object.keys(derivedDelta.candidate).length || asNumber(row.featureCount) || countEntries(candidateFeatureContract.value);
  const warnings = [
    ...asStringArray(getPath(evaluationReport, "featureContractDrift.warnings")),
    ...asStringArray(getPath(metrics, "featureContractWarnings")),
    ...asStringArray(getPath(importSummary, "featureContractWarnings")),
  ];

  const checks = [
    makeCheck(
      "feature_contract_drift_metadata_available",
      "Feature contract drift metadata",
      14,
      driftMetadata.available ? "pass" : "warning",
      driftMetadata.source,
      driftMetadata.value,
      driftMetadata.available ? "Imported metadata contains a feature-contract drift section." : "No dedicated feature-contract drift section was found.",
    ),
    makeCheck(
      "baseline_feature_contract_available",
      "Baseline feature contract",
      14,
      baselineFeatureContract.available ? "pass" : "warning",
      baselineFeatureContract.source,
      baselineFeatureContract.value,
      baselineFeatureContract.available ? "Baseline feature contract metadata is available." : "Baseline feature contract metadata is missing; contract drift context is limited.",
    ),
    makeCheck(
      "candidate_feature_contract_available",
      "Candidate feature contract",
      14,
      candidateFeatureContract.available || candidateFeatureCount > 0 ? "pass" : "warning",
      candidateFeatureContract.source !== "missing" ? candidateFeatureContract.source : "metadataImport.featureCount",
      candidateFeatureContract.value ?? candidateFeatureCount,
      candidateFeatureContract.available || candidateFeatureCount > 0 ? "Candidate feature contract metadata is available." : "Candidate feature contract metadata is missing.",
    ),
    makeCheck(
      "added_features_reviewable",
      "Added features",
      10,
      addedMetadata.available || addedFeatures.length > 0 ? "warning" : "pass",
      addedMetadata.source,
      addedFeatures,
      addedFeatures.length > 0 ? "Added feature metadata is reviewable." : "No added feature metadata was found.",
    ),
    makeCheck(
      "removed_features_reviewable",
      "Removed features",
      12,
      removedMetadata.available || removedFeatures.length > 0 ? "warning" : "pass",
      removedMetadata.source,
      removedFeatures,
      removedFeatures.length > 0 ? "Removed feature metadata is reviewable and should be checked." : "No removed feature metadata was found.",
    ),
    makeCheck(
      "changed_features_reviewable",
      "Changed features",
      10,
      changedMetadata.available || changedFeatures.length > 0 ? "warning" : "pass",
      changedMetadata.source,
      changedFeatures,
      changedFeatures.length > 0 ? "Changed feature metadata is reviewable." : "No changed feature metadata was found.",
    ),
    makeCheck(
      "type_drift_reviewable",
      "Type drift",
      12,
      typeDriftMetadata.available || countEntries(typeDrift) > 0 ? "warning" : "pass",
      typeDriftMetadata.source,
      typeDrift,
      countEntries(typeDrift) > 0 ? "Feature type drift metadata is reviewable." : "No feature type drift metadata was found.",
    ),
    makeCheck(
      "nullable_drift_reviewable",
      "Nullable drift",
      10,
      nullableDriftMetadata.available || countEntries(nullableDrift) > 0 ? "warning" : "pass",
      nullableDriftMetadata.source,
      nullableDrift,
      countEntries(nullableDrift) > 0 ? "Feature nullable drift metadata is reviewable." : "No nullable drift metadata was found.",
    ),
    makeCheck(
      "target_contract_drift_reviewable",
      "Target contract drift",
      14,
      targetContractDrift.available ? "pass" : "warning",
      targetContractDrift.source,
      targetContractDrift.value,
      targetContractDrift.available ? "Target contract metadata is available for review." : "Target contract drift metadata is missing.",
    ),
  ] as InventoryStockoutCandidateFeatureContractDriftMetadataCheck[];

  const featureContractDriftSignals = [
    makeSignal("baseline_feature_contract", "baseline_contract", "Baseline feature contract", baselineFeatureContract.source, baselineFeatureContract.value, "Baseline contract is read from imported metadata only."),
    makeSignal("candidate_feature_contract", "candidate_contract", "Candidate feature contract", candidateFeatureContract.source, candidateFeatureContract.value ?? candidateFeatureCount, "Candidate contract is read from imported metadata only."),
    makeSignal("added_features", "added_features", "Added features", addedMetadata.source, addedFeatures, "Added features are metadata signals, not backend schema changes."),
    makeSignal("removed_features", "removed_features", "Removed features", removedMetadata.source, removedFeatures, "Removed features are metadata signals, not backend schema changes."),
    makeSignal("changed_features", "changed_features", "Changed features", changedMetadata.source, changedFeatures, "Changed features are metadata signals, not backend schema changes."),
    makeSignal("type_drift", "type_drift", "Type drift", typeDriftMetadata.source, typeDrift, "Type drift is review-only metadata."),
    makeSignal("nullable_drift", "nullable_drift", "Nullable drift", nullableDriftMetadata.source, nullableDrift, "Nullable drift is review-only metadata."),
    makeSignal("target_contract_drift", "target_contract", "Target contract drift", targetContractDrift.source, targetContractDrift.value, "Target contract drift is read-only metadata."),
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earnedWeight = checks.reduce((sum, check) => sum + check.earned, 0);
  const featureContractDriftScorePct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const missingSignalCount = featureContractDriftSignals.filter((signal) => signal.status === "missing").length;
  const availableSignalCount = featureContractDriftSignals.length - missingSignalCount;
  const status: OfflineCandidateFeatureContractDriftMetadataStatus = !row.id
    ? "candidate_not_found"
    : baselineFeatureContract.available || candidateFeatureContract.available || driftMetadata.available
    ? warningCount > 0
      ? "feature_contract_drift_warning"
      : "feature_contract_drift_ready"
    : "feature_contract_drift_missing";
  const recommendation: OfflineCandidateFeatureContractDriftMetadataRecommendation = status === "candidate_not_found"
    ? "import_candidate_evaluation_metadata_first"
    : status === "feature_contract_drift_missing"
    ? "add_offline_feature_contract_drift_metadata_to_candidate_package"
    : "review_feature_contract_drift_metadata";

  const summary: InventoryStockoutCandidateFeatureContractDriftMetadataSummary = {
    generatedAt: new Date().toISOString(),
    metadataImportId: asNumber(row.id),
    candidatePackageId: String(row.candidatePackageId || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    predictionType: String(row.predictionType || ""),
    targetColumn: String(row.targetColumn || ""),
    status,
    recommendation,
    featureContractDriftScorePct,
    passCount,
    warningCount,
    failCount,
    totalCheckCount: checks.length,
    featureContractDriftSignalCount: featureContractDriftSignals.length,
    availableSignalCount,
    missingSignalCount,
    baselineFeatureContractAvailable: baselineFeatureContract.available,
    candidateFeatureContractAvailable: candidateFeatureContract.available || candidateFeatureCount > 0,
    targetContractDriftAvailable: targetContractDrift.available,
    baselineFeatureCount,
    candidateFeatureCount,
    addedFeatureCount: addedFeatures.length,
    removedFeatureCount: removedFeatures.length,
    changedFeatureCount: changedFeatures.length,
    typeDriftCount: countEntries(typeDrift),
    nullableDriftCount: countEntries(nullableDrift),
    warnings,
    backendModelExecutionAllowed,
    backendInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    artifactActivationAllowed,
    rawTrainingCsvLoadingAllowedInBackend,
    baselineTrainingDataLoadingAllowedInBackend,
    backendFeatureContractMutationAllowed,
    recommendedNextAction: "Review feature-contract drift metadata as offline evidence only; do not execute, activate, or mutate business data.",
  };

  return {
    success: true,
    contract: buildInventoryStockoutCandidateFeatureContractDriftMetadataContract(),
    summary,
    checks,
    featureContractDriftSignals,
    featureContractDriftMetadataPreview: previewRecord(driftMetadata.value),
    baselineFeatureContractPreview: previewRecord(baselineFeatureContract.value),
    candidateFeatureContractPreview: previewRecord(candidateFeatureContract.value),
    addedFeatures,
    removedFeatures,
    changedFeatures,
    typeDriftPreview: Array.isArray(typeDrift) ? typeDrift.slice(0, 20) : previewRecord(typeDrift),
    nullableDriftPreview: Array.isArray(nullableDrift) ? nullableDrift.slice(0, 20) : previewRecord(nullableDrift),
    targetContractDriftPreview: previewRecord(targetContractDrift.value),
    safetyPolicy,
  };
};

export const buildInventoryStockoutCandidateFeatureContractDriftMetadata = async (input: { id?: unknown } = {}) => {
  const row = await getMlCandidateEvaluationMetadataImportById(input.id);
  if (!row) {
    const now = new Date().toISOString();
    const summary: InventoryStockoutCandidateFeatureContractDriftMetadataSummary = {
      generatedAt: now,
      metadataImportId: null,
      candidatePackageId: "",
      modelKey: "",
      modelVersion: "",
      predictionType: "",
      targetColumn: "",
      status: "candidate_not_found",
      recommendation: "import_candidate_evaluation_metadata_first",
      featureContractDriftScorePct: 0,
      passCount: 0,
      warningCount: 0,
      failCount: 1,
      totalCheckCount: 0,
      featureContractDriftSignalCount: 0,
      availableSignalCount: 0,
      missingSignalCount: 0,
      baselineFeatureContractAvailable: false,
      candidateFeatureContractAvailable: false,
      targetContractDriftAvailable: false,
      baselineFeatureCount: 0,
      candidateFeatureCount: 0,
      addedFeatureCount: 0,
      removedFeatureCount: 0,
      changedFeatureCount: 0,
      typeDriftCount: 0,
      nullableDriftCount: 0,
      warnings: [],
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      baselineTrainingDataLoadingAllowedInBackend,
      backendFeatureContractMutationAllowed,
      recommendedNextAction: "Import candidate evaluation metadata first.",
    };
    return {
      success: true,
      contract: buildInventoryStockoutCandidateFeatureContractDriftMetadataContract(),
      summary,
      checks: [],
      featureContractDriftSignals: [],
      featureContractDriftMetadataPreview: {},
      baselineFeatureContractPreview: {},
      candidateFeatureContractPreview: {},
      addedFeatures: [],
      removedFeatures: [],
      changedFeatures: [],
      typeDriftPreview: [],
      nullableDriftPreview: [],
      targetContractDriftPreview: {},
      safetyPolicy,
    } satisfies InventoryStockoutCandidateFeatureContractDriftMetadataResponse;
  }
  return buildFeatureContractView(row as RawImportRow);
};

export const buildMlCandidateFeatureContractDriftMetadataCatalogSummary = async (input: { limit?: unknown } = {}): Promise<MlCandidateFeatureContractDriftMetadataCatalogSummary> => {
  const rows = await listMlCandidateEvaluationMetadataImports(input.limit || 20);
  const generatedAt = new Date().toISOString();
  const candidateCount = rows.length;
  return {
    generatedAt,
    contract: buildInventoryStockoutCandidateFeatureContractDriftMetadataContract(),
    currentCandidateFeatureContractDriftMetadata: {
      generatedAt,
      status: candidateCount > 0 ? "feature_contract_drift_ready" : "feature_contract_drift_missing",
      recommendation: candidateCount > 0 ? "review_feature_contract_drift_metadata" : "import_candidate_evaluation_metadata_first",
      candidateCount,
      metadataSource: "ml_candidate_evaluation_metadata_imports",
      metadataReadOnlyFeatureContractDrift,
      backendModelExecutionAllowed,
      backendInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      artifactActivationAllowed,
      rawTrainingCsvLoadingAllowedInBackend,
      baselineTrainingDataLoadingAllowedInBackend,
      backendFeatureContractMutationAllowed,
    },
    recentCandidateImports: rows,
    recommendedNextAction: candidateCount > 0
      ? "Open a candidate feature-contract drift panel from the offline comparison dashboard."
      : "Import offline candidate evaluation metadata before reviewing feature-contract drift.",
  };
};

/* Phase 9I anchors: inventory_stockout_offline_candidate_feature_contract_drift_metadata_v1, ml_candidate_evaluation_metadata_imports, metadataReadOnlyFeatureContractDrift, added_features_reviewable, removed_features_reviewable, changed_features_reviewable, type_drift_reviewable, nullable_drift_reviewable, target_contract_drift_reviewable. */
