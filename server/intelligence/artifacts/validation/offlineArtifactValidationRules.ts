import { inventoryStockoutTrainingFeatureSchema } from "../../datasets/inventoryStockoutTrainingPackage.service";
import type {
  OfflineArtifactCompatibilityDimension,
  OfflineArtifactCompatibilitySummary,
  OfflineArtifactDriftRisk,
  OfflineArtifactMetadataEnvelope,
  OfflineArtifactValidationFinding,
} from "./offlineArtifactValidationTypes";
import { buildValidationFinding } from "./offlineArtifactValidationFindings";

const ALLOWED_METADATA_ONLY_MODEL_FAMILIES = [
  "baseline_export",
  "tree_model_candidate",
  "linear_model_candidate",
  "tabular_classifier_candidate",
  "tabular_regressor_candidate",
  "unknown_offline_candidate",
] as const;

const FORBIDDEN_OUTPUT_FIELDS = [
  "set_stock",
  "change_price",
  "approve_purchase",
  "create_invoice",
  "mutate_ledger",
  "auto_order",
  "delete_record",
  "production_action",
  "auto_decision",
] as const;

const EXPECTED_OUTPUT_FIELDS = [
  "score",
  "label",
  "confidence",
] as const;

const EXPECTED_FEATURES = inventoryStockoutTrainingFeatureSchema.map((feature) => feature.key);
const EXPECTED_FEATURE_SET = new Set<string>(EXPECTED_FEATURES);
const EXPECTED_FEATURE_TYPES = Object.fromEntries(
  inventoryStockoutTrainingFeatureSchema.map((feature) => [feature.key, feature.type]),
);

const makeDimension = (
  status: OfflineArtifactCompatibilityDimension["status"],
  expected: Record<string, unknown>,
  observed: Record<string, unknown>,
  notes: string[],
  missing: string[] = [],
  unsupported: string[] = [],
): OfflineArtifactCompatibilityDimension => ({ status, expected, observed, notes, missing, unsupported });

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);

const normalizeText = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const readNested = (record: Record<string, unknown>, path: string[]): unknown => {
  let current: unknown = record;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
};

const firstValue = (record: Record<string, unknown>, paths: string[][]): unknown => {
  for (const path of paths) {
    const value = readNested(record, path);
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
};

const textFrom = (record: Record<string, unknown>, paths: string[][]): string | null => normalizeText(firstValue(record, paths));

const arrayFrom = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (isRecord(entry)) return normalizeText(entry.key) || normalizeText(entry.name) || normalizeText(entry.field) || "";
        return "";
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (isRecord(value)) return Object.keys(value).filter(Boolean);
  if (typeof value === "string" && value.includes(",")) return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  const single = normalizeText(value);
  return single ? [single] : [];
};

const stringsFrom = (record: Record<string, unknown>, paths: string[][]): string[] => arrayFrom(firstValue(record, paths));

export const buildOfflineArtifactValidationSafetyGate = () => ({
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
  artifactExecutionAllowed: false,
  artifactActivationAllowed: false,
  artifactBytesLoadingAllowed: false,
  automaticDeletionAllowed: false,
  purgeJobAllowed: false,
} as const);

export const normalizeOfflineArtifactMetadataEnvelope = (artifact: Record<string, unknown>): OfflineArtifactMetadataEnvelope => {
  const metadata = isRecord(artifact.metadataJson) ? artifact.metadataJson : isRecord(artifact.metadata) ? artifact.metadata : {};
  const merged = { ...metadata, ...artifact };
  return {
    artifactId: normalizeText(artifact.id) || normalizeText(artifact.artifactId) || "unknown_artifact",
    artifactHash: textFrom(merged, [["artifactHash"], ["artifactSha256"], ["sha256"], ["checksumSha256"], ["artifactChecksumSha256"], ["hash"]]),
    artifactKind: textFrom(merged, [["artifactKind"], ["kind"], ["artifact_type"]]),
    schemaVersion: textFrom(merged, [["schemaVersion"], ["schema_version"], ["contract", "schemaVersion"]]),
    modelFamily: textFrom(merged, [["modelFamily"], ["model_family"], ["algorithmFamily"], ["model", "family"]]),
    declaredModelKey: textFrom(merged, [["declaredModelKey"], ["modelKey"], ["model_key"], ["model", "key"]]),
    declaredModelVersion: textFrom(merged, [["declaredModelVersion"], ["modelVersion"], ["model_version"], ["model", "version"]]),
    declaredPredictionType: textFrom(merged, [["declaredPredictionType"], ["predictionType"], ["prediction_type"], ["taskType"], ["declaredPurpose"]]),
    declaredHorizon: firstValue(merged, [["declaredHorizon"], ["horizon"], ["horizonDays"], ["predictionHorizon"]]) as string | number | null,
    runtimeFamily: textFrom(merged, [["runtimeFamily"], ["runtime_family"], ["runtime", "family"], ["execution", "runtimeFamily"]]),
    createdAt: textFrom(merged, [["createdAt"], ["created_at"]]),
    receivedAt: textFrom(merged, [["receivedAt"], ["received_at"]]),
    metadata,
    sourceRecord: artifact,
  };
};

export const readArtifactFeatureNames = (envelope: OfflineArtifactMetadataEnvelope): string[] => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return stringsFrom(merged, [
    ["featureContract", "requiredFeatures"],
    ["featureContract", "features"],
    ["feature_contract", "required_features"],
    ["featureSchema"],
    ["features"],
    ["requiredFeatures"],
    ["inputFields"],
    ["inputs"],
  ]);
};

export const readArtifactOutputFields = (envelope: OfflineArtifactMetadataEnvelope): string[] => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return stringsFrom(merged, [
    ["outputContract", "fields"],
    ["output_contract", "fields"],
    ["outputSchema"],
    ["outputs"],
    ["outputFields"],
    ["predictionFields"],
  ]);
};

export const readTrainingPackageReference = (envelope: OfflineArtifactMetadataEnvelope): Record<string, unknown> => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return {
    trainingPackageId: firstValue(merged, [["trainingPackageId"], ["training_package_id"], ["trainingPackage", "id"]]),
    trainingPackageKey: firstValue(merged, [["trainingPackageKey"], ["packageKey"], ["trainingPackage", "key"]]),
    trainingPackageVersion: firstValue(merged, [["trainingPackageVersion"], ["packageVersion"], ["trainingPackage", "version"]]),
    datasetKey: firstValue(merged, [["datasetKey"], ["dataset", "key"]]),
    datasetVersion: firstValue(merged, [["datasetVersion"], ["dataset", "version"]]),
    splitKey: firstValue(merged, [["splitKey"], ["split", "key"]]),
    targetDefinition: firstValue(merged, [["targetDefinition"], ["target"], ["labelKey"]]),
  };
};

export const readBenchmarkReference = (envelope: OfflineArtifactMetadataEnvelope): Record<string, unknown> => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return {
    benchmarkId: firstValue(merged, [["benchmarkId"], ["benchmark", "id"]]),
    benchmarkKey: firstValue(merged, [["benchmarkKey"], ["benchmark", "key"]]),
    candidateMetrics: firstValue(merged, [["candidateMetrics"], ["metrics"], ["benchmark", "candidateMetrics"]]),
    baselineSummary: firstValue(merged, [["baselineBenchmark"], ["benchmark", "baselineSummary"], ["baselineSummary"]]),
  };
};

export const readModelImportReference = (envelope: OfflineArtifactMetadataEnvelope): Record<string, unknown> => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return {
    modelImportId: firstValue(merged, [["modelImportId"], ["relatedModelImportId"], ["importId"], ["modelImport", "id"]]),
    importValidationStatus: firstValue(merged, [["importValidationStatus"], ["modelImport", "validationStatus"], ["status"]]),
    approvalStatus: firstValue(merged, [["approvalStatus"], ["modelApproval", "status"]]),
    shadowEvaluationReference: firstValue(merged, [["shadowEvaluationReference"], ["shadowEvaluationId"]]),
    stabilityGateReference: firstValue(merged, [["stabilityGateReference"], ["stabilityGateId"]]),
  };
};

export const readQuarantineReference = (envelope: OfflineArtifactMetadataEnvelope): Record<string, unknown> => {
  const merged = { ...envelope.metadata, ...envelope.sourceRecord };
  return {
    intakeStatus: firstValue(merged, [["intakeStatus"], ["intake_status"]]),
    quarantineStatus: firstValue(merged, [["quarantineStatus"], ["quarantine_status"]]),
    quarantineReason: firstValue(merged, [["quarantineReason"], ["quarantine", "reason"], ["reason"]]),
    severity: firstValue(merged, [["severity"], ["quarantine", "severity"]]),
    reviewerNotes: firstValue(merged, [["reviewerNotes"], ["review", "notes"]]),
    recommendedAction: firstValue(merged, [["recommendedAction"], ["review", "recommendedAction"]]),
    exceptionStatus: firstValue(merged, [["exceptionStatus"], ["exception", "status"]]),
  };
};

export const validateEnvelopeSchema = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observed = {
    artifactId: envelope.artifactId,
    artifactHash: envelope.artifactHash,
    artifactKind: envelope.artifactKind,
    schemaVersion: envelope.schemaVersion,
    createdAt: envelope.createdAt,
    receivedAt: envelope.receivedAt,
    declaredModelKey: envelope.declaredModelKey,
    declaredModelVersion: envelope.declaredModelVersion,
    declaredPredictionType: envelope.declaredPredictionType,
    declaredHorizon: envelope.declaredHorizon,
  };
  const missing = Object.entries(observed)
    .filter(([key, value]) => key !== "declaredHorizon" && (value == null || value === "" || value === "unknown_artifact"))
    .map(([key]) => key);
  const findings: OfflineArtifactValidationFinding[] = [];
  if (missing.length > 0) {
    findings.push(buildValidationFinding(
      "envelope_schema.required_identity",
      missing.some((field) => ["artifactId", "artifactHash", "artifactKind", "schemaVersion"].includes(field)) ? "high" : "warning",
      missing.some((field) => ["artifactId", "artifactHash", "artifactKind", "schemaVersion"].includes(field)) ? "fail" : "warning",
      "Offline artifact envelope is missing required identity or declaration metadata.",
      { missing, observed },
      "Complete schemaVersion, artifact kind, artifact hash, created/received timestamp, and model declaration metadata before any future shadow-only review.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "envelope_schema.complete",
      "info",
      "pass",
      "Offline artifact envelope identity fields are present.",
      { observed },
      "Keep the envelope immutable and metadata-only.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(missing.length ? "missing" : "compatible", { requiredFields: Object.keys(observed) }, observed, missing.length ? ["Required envelope metadata is incomplete."] : ["Required envelope metadata is present."], missing),
  };
};

export const validateModelFamily = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const runtimeFamily = envelope.runtimeFamily || "metadata_only";
  const modelFamily = envelope.modelFamily || "";
  const unsupported = modelFamily && !ALLOWED_METADATA_ONLY_MODEL_FAMILIES.includes(modelFamily as typeof ALLOWED_METADATA_ONLY_MODEL_FAMILIES[number]) ? [modelFamily] : [];
  const activeRuntime = /production|live|runtime|serving|infer/i.test(runtimeFamily) && !/metadata|offline|disabled|none/i.test(runtimeFamily);
  const findings: OfflineArtifactValidationFinding[] = [];
  if (!modelFamily) {
    findings.push(buildValidationFinding(
      "model_family.missing",
      "warning",
      "warning",
      "Artifact does not declare a metadata-only model family.",
      { modelFamily, allowedFamilies: ALLOWED_METADATA_ONLY_MODEL_FAMILIES },
      "Declare a conservative metadata-only family such as tabular_classifier_candidate or unknown_offline_candidate.",
    ));
  } else if (unsupported.length > 0 || activeRuntime) {
    findings.push(buildValidationFinding(
      "model_family.unsupported",
      "high",
      "fail",
      "Artifact model family or runtime family is not compatible with offline metadata-only review.",
      { modelFamily, runtimeFamily, allowedFamilies: ALLOWED_METADATA_ONLY_MODEL_FAMILIES, activeRuntime },
      "Remove active runtime bindings and relabel the candidate with an approved metadata-only family before review.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "model_family.compatible",
      "info",
      "pass",
      "Artifact declares an allowed metadata-only model family with no active production runtime binding.",
      { modelFamily, runtimeFamily },
      "Keep model family labels advisory only; do not use them to execute artifacts.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(unsupported.length || activeRuntime ? "incompatible" : modelFamily ? "compatible" : "missing", { allowedFamilies: ALLOWED_METADATA_ONLY_MODEL_FAMILIES }, { modelFamily, runtimeFamily, activeRuntime }, findings.map((finding) => finding.message), modelFamily ? [] : ["modelFamily"], unsupported),
  };
};

export const validateFeatureContract = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observedFeatures = readArtifactFeatureNames(envelope);
  const missingFeatures = EXPECTED_FEATURES.filter((feature) => !observedFeatures.includes(feature));
  const unsupported = observedFeatures.filter((feature) => !EXPECTED_FEATURE_SET.has(feature));
  const findings: OfflineArtifactValidationFinding[] = [];
  if (observedFeatures.length === 0) {
    findings.push(buildValidationFinding(
      "feature_contract.missing",
      "high",
      "fail",
      "Artifact does not declare a feature contract.",
      { expectedFeatures: EXPECTED_FEATURES, observedFeatures },
      "Attach the inventory stockout training feature contract to the artifact metadata envelope.",
    ));
  } else if (missingFeatures.length > 0 || unsupported.length > 0) {
    findings.push(buildValidationFinding(
      "feature_contract.drift",
      missingFeatures.length > 0 ? "high" : "warning",
      missingFeatures.length > 0 ? "fail" : "warning",
      "Artifact feature contract differs from the inventory stockout training package contract.",
      { expectedFeatures: EXPECTED_FEATURES, observedFeatures, missingFeatures, unsupported, expectedTypes: EXPECTED_FEATURE_TYPES },
      "Align feature names/count/type hints with the stored training package manifest before future shadow-only use.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "feature_contract.compatible",
      "info",
      "pass",
      "Artifact feature contract matches the expected inventory stockout feature set.",
      { expectedFeatures: EXPECTED_FEATURES, observedFeatures, expectedTypes: EXPECTED_FEATURE_TYPES },
      "Keep feature ordering and type hints stable across future artifact imports.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(observedFeatures.length === 0 ? "missing" : missingFeatures.length ? "incompatible" : unsupported.length ? "warning" : "compatible", { featureNames: EXPECTED_FEATURES, featureCount: EXPECTED_FEATURES.length, typeHints: EXPECTED_FEATURE_TYPES }, { featureNames: observedFeatures, featureCount: observedFeatures.length }, findings.map((finding) => finding.message), missingFeatures, unsupported),
  };
};

export const validateOutputContract = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const outputFields = readArtifactOutputFields(envelope);
  const missing = EXPECTED_OUTPUT_FIELDS.filter((field) => !outputFields.includes(field));
  const forbidden = outputFields.filter((field) => FORBIDDEN_OUTPUT_FIELDS.includes(field as typeof FORBIDDEN_OUTPUT_FIELDS[number]));
  const findings: OfflineArtifactValidationFinding[] = [];
  if (forbidden.length > 0) {
    findings.push(buildValidationFinding(
      "output_contract.forbidden_mutation_field",
      "critical",
      "fail",
      "Artifact output contract declares mutation or production-action fields.",
      { forbidden, outputFields, forbiddenOutputFields: FORBIDDEN_OUTPUT_FIELDS },
      "Reject or quarantine this artifact metadata until mutation/action outputs are removed and re-reviewed.",
    ));
  }
  if (outputFields.length === 0) {
    findings.push(buildValidationFinding(
      "output_contract.missing",
      "high",
      "fail",
      "Artifact does not declare output contract fields.",
      { expectedOutputFields: EXPECTED_OUTPUT_FIELDS, outputFields },
      "Declare score, label/risk class, confidence, and horizon metadata before future shadow-only review.",
    ));
  } else if (missing.length > 0 && forbidden.length === 0) {
    findings.push(buildValidationFinding(
      "output_contract.incomplete",
      "warning",
      "warning",
      "Artifact output contract is missing expected advisory score fields.",
      { expectedOutputFields: EXPECTED_OUTPUT_FIELDS, outputFields, missing },
      "Complete advisory score, label/risk class, confidence, and horizon fields.",
    ));
  } else if (forbidden.length === 0) {
    findings.push(buildValidationFinding(
      "output_contract.compatible",
      "info",
      "pass",
      "Artifact output contract is advisory and does not declare mutation directives.",
      { outputFields, forbiddenOutputFields: FORBIDDEN_OUTPUT_FIELDS },
      "Keep output contract advisory-only; never add production action fields.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(forbidden.length ? "incompatible" : outputFields.length === 0 ? "missing" : missing.length ? "warning" : "compatible", { expectedOutputFields: EXPECTED_OUTPUT_FIELDS, forbiddenOutputFields: FORBIDDEN_OUTPUT_FIELDS }, { outputFields }, findings.map((finding) => finding.message), missing, forbidden),
  };
};

export const validateTrainingPackageReference = (
  envelope: OfflineArtifactMetadataEnvelope,
  latestTrainingPackage: Record<string, unknown> | null,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observed = readTrainingPackageReference(envelope);
  const missing = ["trainingPackageKey", "trainingPackageVersion", "datasetKey", "splitKey", "targetDefinition"].filter((field) => observed[field] == null || String(observed[field]).trim() === "");
  const latest = latestTrainingPackage || {};
  const keyMatches = !observed.trainingPackageKey || !latest.packageKey || String(observed.trainingPackageKey) === String(latest.packageKey);
  const featureCountMatches = latest.featureCount == null || readArtifactFeatureNames(envelope).length === Number(latest.featureCount) || readArtifactFeatureNames(envelope).length === 0;
  const findings: OfflineArtifactValidationFinding[] = [];
  if (missing.length > 0) {
    findings.push(buildValidationFinding(
      "training_package_reference.missing",
      "warning",
      "warning",
      "Artifact does not fully reference the offline training package manifest.",
      { observed, missing, latestTrainingPackage: latest },
      "Attach training package key/version, split key, dataset reference, and target definition evidence.",
    ));
  } else if (!keyMatches || !featureCountMatches) {
    findings.push(buildValidationFinding(
      "training_package_reference.mismatch",
      "high",
      "fail",
      "Artifact training package reference does not match available training package evidence.",
      { observed, latestTrainingPackage: latest, keyMatches, featureCountMatches },
      "Reconcile package key/version and feature count with the stored training manifest.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "training_package_reference.compatible",
      "info",
      "pass",
      "Artifact training package reference is present and consistent with available metadata.",
      { observed, latestTrainingPackage: latest },
      "Preserve package and split identifiers in future imports.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(missing.length ? "missing" : !keyMatches || !featureCountMatches ? "incompatible" : "compatible", { required: ["trainingPackageKey", "trainingPackageVersion", "datasetKey", "splitKey", "targetDefinition"], latestTrainingPackage: latest }, observed, findings.map((finding) => finding.message), missing),
  };
};

export const validateBenchmarkReference = (
  envelope: OfflineArtifactMetadataEnvelope,
  latestBenchmark: Record<string, unknown> | null,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observed = readBenchmarkReference(envelope);
  const hasReference = Boolean(observed.benchmarkId || observed.benchmarkKey);
  const hasMetrics = isRecord(observed.candidateMetrics) || Boolean(observed.baselineSummary);
  const metricClaimWithoutEvidence = Boolean(observed.candidateMetrics) && !hasReference && !latestBenchmark;
  const findings: OfflineArtifactValidationFinding[] = [];
  if (!hasReference || !hasMetrics) {
    findings.push(buildValidationFinding(
      "benchmark_reference.incomplete",
      "warning",
      "warning",
      "Artifact benchmark evidence is incomplete.",
      { observed, latestBenchmark, hasReference, hasMetrics },
      "Attach baseline benchmark summary and candidate metric evidence before review acceptance.",
    ));
  }
  if (metricClaimWithoutEvidence) {
    findings.push(buildValidationFinding(
      "benchmark_reference.metric_claim_without_evidence",
      "high",
      "fail",
      "Artifact declares metric claims without benchmark reference evidence.",
      { observed, latestBenchmark },
      "Do not accept candidate metric claims without traceable benchmark evidence.",
    ));
  }
  if (hasReference && hasMetrics && !metricClaimWithoutEvidence) {
    findings.push(buildValidationFinding(
      "benchmark_reference.compatible",
      "info",
      "pass",
      "Artifact benchmark reference and metric evidence are present.",
      { observed, latestBenchmark },
      "Keep metrics tied to immutable benchmark references.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(metricClaimWithoutEvidence ? "incompatible" : !hasReference || !hasMetrics ? "missing" : "compatible", { required: ["benchmark reference", "baseline summary", "candidate metrics"] }, observed, findings.map((finding) => finding.message), !hasReference ? ["benchmarkReference"] : !hasMetrics ? ["candidateMetricsOrBaselineSummary"] : []),
  };
};

export const validateModelImportReference = (
  envelope: OfflineArtifactMetadataEnvelope,
  modelImport: Record<string, unknown> | null,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observed = readModelImportReference(envelope);
  const modelImportId = observed.modelImportId;
  const missing = modelImportId ? [] : ["modelImportId"];
  const hasImportRecord = Boolean(modelImport?.id);
  const findings: OfflineArtifactValidationFinding[] = [];
  if (missing.length > 0) {
    findings.push(buildValidationFinding(
      "model_import_reference.missing",
      "warning",
      "warning",
      "Artifact does not reference a model import audit record.",
      { observed, modelImport },
      "Attach modelImportId/import validation evidence where this artifact came from an import.",
    ));
  } else if (!hasImportRecord) {
    findings.push(buildValidationFinding(
      "model_import_reference.not_found",
      "warning",
      "warning",
      "Artifact references a model import, but the import record was not found in local metadata.",
      { observed, modelImport },
      "Verify the import audit record exists before final review.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "model_import_reference.compatible",
      "info",
      "pass",
      "Artifact model import reference is traceable.",
      { observed, modelImport },
      "Keep import, approval, shadow-evaluation, and stability references immutable.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(missing.length ? "missing" : hasImportRecord ? "compatible" : "warning", { required: ["modelImportId", "importValidationStatus", "approvalStatus"] }, { ...observed, modelImport }, findings.map((finding) => finding.message), missing),
  };
};

export const validateHashSignature = (
  envelope: OfflineArtifactMetadataEnvelope,
  signedMetadataEnvelopeHash: string,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const metadataHash = textFrom(envelope.metadata, [["artifactHash"], ["artifactSha256"], ["sha256"], ["checksumSha256"], ["artifactChecksumSha256"], ["hash"]]);
  const hashPlausible = Boolean(envelope.artifactHash && /^[a-f0-9]{64}$/i.test(envelope.artifactHash));
  const metadataMatches = !metadataHash || !envelope.artifactHash || metadataHash === envelope.artifactHash;
  const findings: OfflineArtifactValidationFinding[] = [];
  if (!hashPlausible) {
    findings.push(buildValidationFinding(
      "hash_signature.invalid_or_missing",
      "high",
      "fail",
      "Artifact hash is missing or not a plausible SHA-256 value.",
      { artifactHash: envelope.artifactHash, metadataHash, signedMetadataEnvelopeHash },
      "Provide a 64-character metadata checksum reference; do not load binary bytes to repair this.",
    ));
  } else if (!metadataMatches) {
    findings.push(buildValidationFinding(
      "hash_signature.metadata_mismatch",
      "high",
      "fail",
      "Metadata hash reference does not match artifact hash reference.",
      { artifactHash: envelope.artifactHash, metadataHash, signedMetadataEnvelopeHash },
      "Reconcile metadata-only hash references before review.",
    ));
  } else {
    findings.push(buildValidationFinding(
      "hash_signature.compatible",
      "info",
      "pass",
      "Artifact hash reference is plausible and metadata hash references are consistent.",
      { artifactHash: envelope.artifactHash, metadataHash, signedMetadataEnvelopeHash },
      "Use signed metadata envelope hash as audit evidence only; do not read artifact bytes.",
    ));
  }
  return {
    findings,
    compatibility: makeDimension(!hashPlausible || !metadataMatches ? "incompatible" : "compatible", { artifactHash: "64 hex SHA-256", signedMetadataEnvelopeHash: "metadata-only canonical envelope hash" }, { artifactHash: envelope.artifactHash, metadataHash, signedMetadataEnvelopeHash }, findings.map((finding) => finding.message), hashPlausible ? [] : ["artifactHash"]),
  };
};

export const validateMetadataCompleteness = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension; missingEvidenceCount: number } => {
  const featureNames = readArtifactFeatureNames(envelope);
  const outputFields = readArtifactOutputFields(envelope);
  const training = readTrainingPackageReference(envelope);
  const benchmark = readBenchmarkReference(envelope);
  const modelImport = readModelImportReference(envelope);
  const quarantine = readQuarantineReference(envelope);
  const buckets: Record<string, boolean> = {
    artifactIdentity: Boolean(envelope.artifactId && envelope.artifactHash && envelope.artifactKind && envelope.schemaVersion),
    modelIdentity: Boolean(envelope.declaredModelKey && envelope.declaredModelVersion && envelope.modelFamily),
    datasetTrainingReference: Boolean(training.trainingPackageKey && training.datasetKey && training.splitKey),
    featureContract: featureNames.length > 0,
    outputContract: outputFields.length > 0,
    benchmarkEvidence: Boolean(benchmark.benchmarkKey || benchmark.benchmarkId || benchmark.baselineSummary),
    approvalEvidence: Boolean(modelImport.approvalStatus || modelImport.modelImportId),
    shadowEvidence: Boolean(modelImport.shadowEvaluationReference || modelImport.stabilityGateReference),
    quarantineStatus: Boolean(quarantine.quarantineStatus || quarantine.intakeStatus),
    archiveReadiness: Boolean(envelope.metadata.archiveReadiness || envelope.metadata.signedAuditGovernanceArchiveHash),
    reviewNotes: Boolean(quarantine.reviewerNotes || envelope.metadata.reviewNotes),
  };
  const missing = Object.entries(buckets).filter(([, present]) => !present).map(([key]) => key);
  const findings = [buildValidationFinding(
    "metadata_completeness.score",
    missing.length > 3 ? "warning" : "info",
    missing.length > 3 ? "warning" : "pass",
    missing.length > 3 ? "Artifact metadata completeness is below review-ready quality." : "Artifact metadata completeness is sufficient for advisory review.",
    { buckets, missing, completenessPct: Math.round(((Object.keys(buckets).length - missing.length) / Object.keys(buckets).length) * 100) },
    "Complete missing evidence buckets before any future shadow-only acceptance.",
  )];
  return {
    findings,
    compatibility: makeDimension(missing.length > 3 ? "warning" : "compatible", { requiredEvidenceBuckets: Object.keys(buckets) }, { buckets }, findings.map((finding) => finding.message), missing),
    missingEvidenceCount: missing.length,
  };
};

export const validateQuarantineReasonQuality = (
  envelope: OfflineArtifactMetadataEnvelope,
): { findings: OfflineArtifactValidationFinding[]; compatibility: OfflineArtifactCompatibilityDimension } => {
  const observed = readQuarantineReference(envelope);
  const statusText = String(observed.quarantineStatus || observed.intakeStatus || "").toLowerCase();
  const reviewExpected = /quarantine|warning|needs_review|rejected/.test(statusText);
  const missing = reviewExpected
    ? ["quarantineReason", "severity", "reviewerNotes", "recommendedAction", "exceptionStatus"].filter((field) => observed[field] == null || String(observed[field]).trim() === "")
    : [];
  const findings = [buildValidationFinding(
    "quarantine_reason_quality",
    missing.length ? "warning" : "info",
    missing.length ? "warning" : "pass",
    missing.length ? "Quarantine or warning record does not include enough reason-quality evidence." : "Quarantine reason quality is clear or not applicable.",
    { observed, reviewExpected, missing },
    "For quarantined or warning artifacts, record reason, severity, reviewer notes, recommended action, and exception status.",
  )];
  return {
    findings,
    compatibility: makeDimension(missing.length ? "missing" : "compatible", { requiredWhenQuarantinedOrWarning: ["quarantineReason", "severity", "reviewerNotes", "recommendedAction", "exceptionStatus"] }, observed, findings.map((finding) => finding.message), missing),
  };
};

export const calculateDriftRisk = (compatibility: Omit<OfflineArtifactCompatibilitySummary, "contractDriftRisk">): OfflineArtifactDriftRisk => {
  const statuses = Object.values(compatibility).map((dimension) => dimension.status);
  const incompatibleCount = statuses.filter((status) => status === "incompatible").length;
  const missingCount = statuses.filter((status) => status === "missing").length;
  const warningCount = statuses.filter((status) => status === "warning").length;
  if (incompatibleCount >= 2 || (incompatibleCount >= 1 && missingCount >= 2)) return "critical";
  if (incompatibleCount >= 1 || missingCount >= 3) return "high";
  if (missingCount >= 1 || warningCount >= 1) return "medium";
  return "low";
};

export const buildCompatibilitySummary = (
  dimensions: Omit<OfflineArtifactCompatibilitySummary, "contractDriftRisk">,
): OfflineArtifactCompatibilitySummary => ({
  ...dimensions,
  contractDriftRisk: calculateDriftRisk(dimensions),
});
