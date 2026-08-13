import {
  listMlCandidateEvaluationMetadataImports,
  recordMlCandidateEvaluationMetadataImport,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidateEvaluationMetadataImportRecommendation,
  CandidateEvaluationMetadataImportStatus,
  InventoryStockoutCandidateEvaluationMetadataImportContract,
  InventoryStockoutCandidateEvaluationMetadataImportGate,
  InventoryStockoutCandidateEvaluationMetadataImportResponse,
  InventoryStockoutCandidateEvaluationMetadataImportSummary,
  MlCandidateEvaluationMetadataImportCatalogSummary,
} from "./datasetTypes";

const IMPORT_KEY = "inventory_stockout_candidate_evaluation_metadata_import_v1" as const;
const IMPORT_VERSION = "v1" as const;
const PHASE = "Phase 9B" as const;

const metadataImportOnly = true as const;
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

const ALLOWED_OUTPUT_FIELDS = [
  "entityId",
  "predictionType",
  "horizonDays",
  "score",
  "label",
  "confidence",
  "modelVersion",
  "generatedAt",
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
  "activate_artifact",
  "deploy_model",
] as const;

const REJECTED_ARTIFACT_KEYS = [
  "modelBinary",
  "modelBytes",
  "artifactBytes",
  "artifactPayload",
  "binaryPayload",
  "serializedModel",
  "base64Model",
  "picklePayload",
  "executableArtifact",
  "executableArtifactBytes",
] as const;

const REQUIRED_SAFETY_FALSE_FLAGS = [
  "backendModelExecutionAllowed",
  "backendInferenceEndpointExposed",
  "productionIntegrationAllowed",
  "decisionAutomationAllowed",
  "canChangeInventoryOrAccounting",
  "artifactActivationAllowed",
] as const;

type NormalizedCandidateEvaluationMetadata = {
  candidateManifest: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  metrics: Record<string, unknown>;
  evaluationReport: Record<string, unknown>;
  candidateOutputSample: unknown;
  checksums: Record<string, unknown>;
  trainingPackageValidationReport: Record<string, unknown> | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

const asRecord = (value: unknown): Record<string, unknown> | null => (isRecord(value) ? value : null);

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const pickRecord = (body: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null => {
  for (const key of keys) {
    const value = body[key];
    if (isRecord(value)) return value;
  }
  return null;
};

const pickUnknown = (body: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  return undefined;
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutCandidateEvaluationMetadataImportGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidateEvaluationMetadataImportGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidateEvaluationMetadataImportGate[],
  status: InventoryStockoutCandidateEvaluationMetadataImportGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidateEvaluationMetadataImportStatus,
): CandidateEvaluationMetadataImportRecommendation => {
  if (status === "metadata_import_ready") return "store_evaluation_metadata_only";
  if (status === "metadata_import_warning") return "review_metadata_warnings";
  return "reject_unsafe_or_incomplete_metadata";
};

const recursiveKeyFindings = (
  value: unknown,
  keys: readonly string[],
  path = "$",
): string[] => {
  const findings: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...recursiveKeyFindings(item, keys, `${path}[${index}]`)));
    return findings;
  }
  if (!isRecord(value)) return findings;
  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (keys.includes(key)) findings.push(nextPath);
    findings.push(...recursiveKeyFindings(item, keys, nextPath));
  }
  return findings;
};

const normalizeCandidateOutputRows = (candidateOutputSample: unknown): unknown[] => {
  if (Array.isArray(candidateOutputSample)) return candidateOutputSample;
  if (isRecord(candidateOutputSample)) {
    for (const key of ["rows", "samples", "predictions", "candidateOutputSample", "samplePredictions"]) {
      const value = candidateOutputSample[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
};

const validateOutputContract = (candidateOutputSample: unknown): { status: "pass" | "warning" | "block"; issues: string[] } => {
  const issues: string[] = [];
  const forbidden = recursiveKeyFindings(candidateOutputSample, FORBIDDEN_OUTPUT_FIELDS);
  if (forbidden.length) {
    return {
      status: "block",
      issues: [`Candidate output sample contains forbidden mutation field(s): ${forbidden.join(", ")}`],
    };
  }

  const rows = normalizeCandidateOutputRows(candidateOutputSample);
  if (!rows.length) {
    return { status: "warning", issues: ["Candidate output sample has no rows to inspect."] };
  }

  rows.slice(0, 50).forEach((row, index) => {
    if (!isRecord(row)) {
      issues.push(`Candidate output row ${index} is not an object.`);
      return;
    }
    const fields = Object.keys(row);
    const extraFields = fields.filter((field) => !ALLOWED_OUTPUT_FIELDS.includes(field as typeof ALLOWED_OUTPUT_FIELDS[number]));
    const missingFields = ALLOWED_OUTPUT_FIELDS.filter((field) => !(field in row));
    if (extraFields.length) issues.push(`Candidate output row ${index} has non-contract field(s): ${extraFields.join(", ")}`);
    if (missingFields.length) issues.push(`Candidate output row ${index} is missing required field(s): ${missingFields.join(", ")}`);
  });

  return issues.length ? { status: "block", issues } : { status: "pass", issues };
};

const readSafetyPolicy = (candidateManifest: Record<string, unknown>, modelCard: Record<string, unknown>): Record<string, unknown> => {
  const manifestSafety = asRecord(candidateManifest.safetyPolicy) || {};
  const cardSafety = asRecord(modelCard.safetyRestrictions) || {};
  return { ...cardSafety, ...manifestSafety };
};

const validateSafetyPolicy = (safetyPolicy: Record<string, unknown>) => {
  const issues = REQUIRED_SAFETY_FALSE_FLAGS
    .filter((flag) => safetyPolicy[flag] !== false)
    .map((flag) => `${flag} must be false.`);
  return {
    status: issues.length ? "block" as const : "pass" as const,
    issues,
  };
};

const normalizePayload = (input: Record<string, unknown>): NormalizedCandidateEvaluationMetadata => {
  const packagePayload = asRecord(input.package) || asRecord(input.candidatePackage) || input;
  const candidateManifest = pickRecord(packagePayload, "candidateManifest", "candidate_manifest", "candidate_manifest_json", "candidateManifestJson");
  const modelCard = pickRecord(packagePayload, "modelCard", "model_card", "model_card_json", "modelCardJson");
  const metrics = pickRecord(packagePayload, "metrics", "metrics_json", "metricsJson");
  const evaluationReport = pickRecord(packagePayload, "evaluationReport", "evaluation_report", "evaluation_report_json", "evaluationReportJson");
  const candidateOutputSample = pickUnknown(packagePayload, "candidateOutputSample", "candidate_output_sample", "candidate_output_sample_json", "candidateOutputSampleJson");
  const checksums = pickRecord(packagePayload, "checksums", "checksums_json", "checksumsJson");
  const trainingPackageValidationReport = pickRecord(
    packagePayload,
    "trainingPackageValidationReport",
    "training_package_validation_report",
    "training_package_validation_report_json",
    "trainingPackageValidationReportJson",
  );

  return {
    candidateManifest: candidateManifest || {},
    modelCard: modelCard || {},
    metrics: metrics || {},
    evaluationReport: evaluationReport || {},
    candidateOutputSample,
    checksums: checksums || {},
    trainingPackageValidationReport,
  };
};

const metricValue = (metrics: Record<string, unknown>, key: string): number | null => {
  const nested = asRecord(metrics.metrics);
  return asNumber(metrics[key] ?? nested?.[key]);
};

const targetColumn = (candidateManifest: Record<string, unknown>): string | null => {
  const target = asRecord(candidateManifest.target);
  return asString(target?.key ?? target?.column ?? target?.name ?? candidateManifest.targetColumn);
};

const validationStatusFrom = (report: Record<string, unknown> | null): string => {
  if (!report) return "missing_optional_validation_report";
  return asString(report.status) || "unknown";
};

const metricsStatusFrom = (metrics: Record<string, unknown>, evaluationReport: Record<string, unknown>): string => {
  const warnings = Array.isArray(metrics.warnings) ? metrics.warnings : Array.isArray(evaluationReport.warnings) ? evaluationReport.warnings : [];
  return warnings.length ? "warning" : "pass";
};

export const buildInventoryStockoutCandidateEvaluationMetadataImportContract = (): InventoryStockoutCandidateEvaluationMetadataImportContract => ({
  contractKey: IMPORT_KEY,
  contractVersion: IMPORT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Import offline Inventory Stockout candidate evaluation metadata from the Phase 9A workbench without importing executable artifact bytes or enabling backend inference.",
  importScope: "offline_candidate_evaluation_metadata_only",
  acceptedSections: [
    "candidate_manifest.json",
    "model_card.json",
    "metrics.json",
    "evaluation_report.json",
    "candidate_output_sample.json",
    "checksums.json",
    "training_package_validation_report.json",
  ],
  rejectedArtifactClasses: [
    "model binaries",
    "serialized model bytes",
    "Python pickle payloads",
    "executable runtime artifacts",
    "training scripts",
    "inference runtime adapters",
  ],
  forbiddenBehavior: [
    "Do not execute, load, activate, deploy, or production-score a model from this import.",
    "Do not expose backend inference, training, execution, or activation endpoints.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
    "Do not treat imported metadata as production approval.",
  ],
  allowedOutputFields: [...ALLOWED_OUTPUT_FIELDS],
  forbiddenOutputFields: [...FORBIDDEN_OUTPUT_FIELDS],
  operationalPolicy: {
    metadataImportOnly,
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
  },
});

export const validateInventoryStockoutCandidateEvaluationMetadataImport = (
  input: Record<string, unknown> = {},
): InventoryStockoutCandidateEvaluationMetadataImportResponse => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidateEvaluationMetadataImportContract();
  const normalized = normalizePayload(input);
  const candidateManifest = normalized.candidateManifest;
  const modelCard = normalized.modelCard;
  const metrics = normalized.metrics;
  const evaluationReport = normalized.evaluationReport;
  const checksums = normalized.checksums;
  const safetyPolicy = readSafetyPolicy(candidateManifest, modelCard);
  const outputContract = validateOutputContract(normalized.candidateOutputSample);
  const safetyValidation = validateSafetyPolicy(safetyPolicy);
  const rejectedArtifactKeys = recursiveKeyFindings(input, REJECTED_ARTIFACT_KEYS);

  const candidatePackageId = asString(candidateManifest.candidatePackageId);
  const modelKey = asString(candidateManifest.modelKey);
  const modelVersion = asString(candidateManifest.modelVersion);
  const modelFamily = asString(candidateManifest.modelFamily);
  const predictionType = asString(candidateManifest.predictionType);
  const horizonDays = asNumber(candidateManifest.horizonDays);
  const trainingManifestHash = asString(candidateManifest.trainingManifestHash);
  const validationStatus = validationStatusFrom(normalized.trainingPackageValidationReport);
  const metricsStatus = metricsStatusFrom(metrics, evaluationReport);

  const requiredSectionValues = {
    candidateManifest: Object.keys(candidateManifest).length > 0,
    modelCard: Object.keys(modelCard).length > 0,
    metrics: Object.keys(metrics).length > 0,
    evaluationReport: Object.keys(evaluationReport).length > 0,
    candidateOutputSample: normalized.candidateOutputSample !== undefined,
    checksums: Object.keys(checksums).length > 0,
  };
  const missingSections = Object.entries(requiredSectionValues).filter(([, present]) => !present).map(([key]) => key);

  const gates: InventoryStockoutCandidateEvaluationMetadataImportGate[] = [
    buildGate(
      "required_metadata_sections",
      "Required Metadata Sections",
      missingSections.length ? "block" : "pass",
      requiredSectionValues,
      missingSections.length ? `Required metadata section(s) missing: ${missingSections.join(", ")}.` : "All required Phase 9A candidate evaluation metadata sections are present.",
    ),
    buildGate(
      "candidate_identity_present",
      "Candidate Identity",
      candidatePackageId && modelKey && modelVersion ? "pass" : "block",
      { candidatePackageId, modelKey, modelVersion },
      candidatePackageId && modelKey && modelVersion ? "Candidate package id, model key, and model version are present." : "Candidate manifest must include candidatePackageId, modelKey, and modelVersion.",
    ),
    buildGate(
      "metrics_present",
      "Metrics Present",
      Object.keys(metrics).length ? "pass" : "block",
      { metricKeys: Object.keys(metrics), nestedMetricKeys: Object.keys(asRecord(metrics.metrics) || {}) },
      Object.keys(metrics).length ? "Metrics metadata is present for offline review." : "metrics.json metadata is required.",
    ),
    buildGate(
      "candidate_output_contract",
      "Safe Output Contract",
      outputContract.status,
      { allowedFields: ALLOWED_OUTPUT_FIELDS, forbiddenFields: FORBIDDEN_OUTPUT_FIELDS },
      outputContract.issues.length ? outputContract.issues.join(" ") : "Candidate output sample uses only safe prediction metadata fields.",
    ),
    buildGate(
      "safety_policy_disabled",
      "Safety Policy Disabled",
      safetyValidation.status,
      safetyPolicy,
      safetyValidation.issues.length ? safetyValidation.issues.join(" ") : "Candidate safety policy keeps backend execution, inference, integration, automation, mutation, and activation disabled.",
    ),
    buildGate(
      "no_executable_artifact_payload",
      "No Executable Artifact Payload",
      rejectedArtifactKeys.length ? "block" : "pass",
      rejectedArtifactKeys,
      rejectedArtifactKeys.length ? `Executable artifact payload key(s) are not allowed: ${rejectedArtifactKeys.join(", ")}.` : "Import payload contains metadata only and no model bytes or serialized model payload fields.",
    ),
    buildGate(
      "backend_runtime_disconnected",
      "Backend Runtime Disconnected",
      "pass",
      {
        backendModelExecutionAllowed,
        runtimeInvocationAllowed,
        backendInferenceEndpointExposed,
        inferenceEndpointExposed,
        productionIntegrationAllowed,
        decisionAutomationAllowed,
        canChangeInventoryOrAccounting,
        canMutateBusinessRecords,
        artifactExecutionAllowed,
        artifactActivationAllowed,
      },
      "Phase 9B import stores metadata only; backend runtime execution remains disabled.",
    ),
    buildGate(
      "training_validation_report_optional",
      "Training Validation Report",
      normalized.trainingPackageValidationReport ? "pass" : "warning",
      validationStatus,
      normalized.trainingPackageValidationReport ? "Training package validation report metadata is included." : "training_package_validation_report.json is not included; import can continue but review context is thinner.",
    ),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const status: CandidateEvaluationMetadataImportStatus = blockerCount
    ? "metadata_import_rejected"
    : warningCount
    ? "metadata_import_warning"
    : "metadata_import_ready";
  const recommendation = chooseRecommendation(status);

  const summary: InventoryStockoutCandidateEvaluationMetadataImportSummary = {
    importKey: IMPORT_KEY,
    importVersion: IMPORT_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    candidatePackageId,
    modelKey,
    modelVersion,
    modelFamily,
    predictionType,
    targetColumn: targetColumn(candidateManifest),
    horizonDays,
    trainingManifestHash,
    validationStatus,
    metricsStatus,
    outputContractStatus: outputContract.status,
    safetyPolicyStatus: safetyValidation.status,
    metadataImportOnly,
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
    blockerCount,
    warningCount,
    passCount,
    totalGateCount: gates.length,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction: recommendation,
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    normalizedMetadata: {
      candidateManifest,
      modelCard,
      metrics,
      evaluationReport,
      candidateOutputSample: normalized.candidateOutputSample,
      checksums,
      trainingPackageValidationReport: normalized.trainingPackageValidationReport,
    },
    safetyPolicy,
  };
};

export const importInventoryStockoutCandidateEvaluationMetadata = async (
  input: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidateEvaluationMetadataImportResponse> => {
  const validation = validateInventoryStockoutCandidateEvaluationMetadataImport(input);
  if (validation.summary.status === "metadata_import_rejected") {
    return validation;
  }

  const metadata = validation.normalizedMetadata as NormalizedCandidateEvaluationMetadata;
  const candidateManifest = metadata.candidateManifest;
  const metrics = metadata.metrics;

  const importRecord = await recordMlCandidateEvaluationMetadataImport({
    importKey: validation.summary.importKey,
    importVersion: validation.summary.importVersion,
    candidatePackageId: validation.summary.candidatePackageId || "unknown_candidate_package",
    modelKey: validation.summary.modelKey || "unknown_model_key",
    modelVersion: validation.summary.modelVersion || "unknown_model_version",
    modelFamily: validation.summary.modelFamily,
    predictionType: validation.summary.predictionType || "inventory_stockout",
    targetColumn: validation.summary.targetColumn,
    horizonDays: validation.summary.horizonDays,
    trainingManifestHash: validation.summary.trainingManifestHash,
    validationStatus: validation.summary.validationStatus,
    metricsStatus: validation.summary.metricsStatus,
    outputContractStatus: validation.summary.outputContractStatus,
    safetyPolicyStatus: validation.summary.safetyPolicyStatus,
    metadataImportStatus: validation.summary.status,
    accuracy: metricValue(metrics, "accuracy"),
    precisionScore: metricValue(metrics, "precision"),
    recallScore: metricValue(metrics, "recall"),
    f1: metricValue(metrics, "f1"),
    rocAuc: metricValue(metrics, "roc_auc"),
    mae: metricValue(metrics, "mae"),
    rmse: metricValue(metrics, "rmse"),
    r2: metricValue(metrics, "r2"),
    candidateManifest,
    modelCard: metadata.modelCard,
    metrics,
    evaluationReport: metadata.evaluationReport,
    candidateOutputSample: metadata.candidateOutputSample,
    checksums: metadata.checksums,
    trainingPackageValidationReport: metadata.trainingPackageValidationReport,
    importSummary: validation.summary as unknown as Record<string, unknown>,
    safetyPolicy: validation.safetyPolicy,
    userId: asNumber(input.userId),
  });

  return {
    ...validation,
    importRecord,
  };
};

export const buildMlCandidateEvaluationMetadataImportCatalogSummary = async (): Promise<MlCandidateEvaluationMetadataImportCatalogSummary> => {
  const lastCandidateEvaluationMetadataImports = await listMlCandidateEvaluationMetadataImports(10).catch(() => []);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidateEvaluationMetadataImportContract(),
    lastCandidateEvaluationMetadataImports,
    recommendedNextAction: "import_phase9a_evaluation_metadata_only",
  };
};

/* Phase 9B anchors: inventory stockout candidate evaluation metadata import, metadataImportOnly=true, backendModelExecutionAllowed=false, no artifact bytes loading. */
