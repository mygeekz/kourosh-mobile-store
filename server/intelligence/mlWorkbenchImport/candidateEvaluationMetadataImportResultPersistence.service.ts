import {
  getLatestWorkbenchImportResult,
  getWorkbenchImportResultByCandidatePackageId,
  getWorkbenchImportResultById,
  getWorkbenchImportResultSummary,
  listWorkbenchImportResults,
  recordWorkbenchImportResult,
} from '../../db/domains/ml/mlWorkbenchImportResults.db';
import {
  asMlWorkbenchImportRecord,
  readCandidatePackagePayload,
  readMetadataRecord,
  readString,
} from './candidateEvaluationMetadataImportMapper';
import { validateMlWorkbenchCandidateEvaluationMetadataImport } from './candidateEvaluationMetadataImportValidator';

const PHASE = 'Phase 11D' as const;

const modelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
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
const artifactBytesLoadingAllowed = false as const;
const rawTrainingCsvLoadingAllowed = false as const;

const metadataOnlyProof = {
  metadataOnly: true,
  modelBinaryPresent: false,
  rawCsvPresent: false,
  activationDirectivePresent: false,
  inferenceDirectivePresent: false,
  businessMutationDirectivePresent: false,
  modelExecutionAllowed,
  runtimeInvocationAllowed,
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
  artifactBytesLoadingAllowed,
  rawTrainingCsvLoadingAllowed,
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const stringFromReference = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (!isRecord(value)) return null;
  const path = readString(value.path ?? value.manifestPath ?? value.packageId ?? value.reference ?? value.uri);
  const sha = readString(value.sha256 ?? value.manifestSha256 ?? value.hash);
  return [path, sha].filter(Boolean).join(' · ') || null;
};

const hashFromReference = (candidateManifest: Record<string, unknown>, candidateManifestReference: Record<string, unknown>): string | null => (
  readString(candidateManifest.candidateManifestHash)
  || readString(candidateManifest.candidateManifestSha256)
  || readString(candidateManifest.trainingManifestHash)
  || readString(candidateManifestReference.sha256)
  || readString(candidateManifestReference.hash)
  || null
);

const compactSnapshot = (packagePayload: Record<string, unknown>, validation: ReturnType<typeof validateMlWorkbenchCandidateEvaluationMetadataImport>) => {
  const candidateManifest = readMetadataRecord(packagePayload, 'candidateManifest', 'candidate_manifest', 'candidateManifestJson');
  const modelCard = readMetadataRecord(packagePayload, 'modelCard', 'model_card', 'modelCardJson');
  const metrics = readMetadataRecord(packagePayload, 'metrics', 'metrics_json', 'metricsJson');
  const evaluationReport = readMetadataRecord(packagePayload, 'evaluationReport', 'evaluation_report', 'evaluationReportJson');
  const checksums = readMetadataRecord(packagePayload, 'checksums', 'checksums_json', 'checksumsJson');

  return {
    phase: PHASE,
    metadataOnly: true,
    sectionKeys: Object.keys(packagePayload),
    candidateManifest,
    modelCard: {
      modelKey: modelCard.modelKey,
      modelVersion: modelCard.modelVersion,
      modelCardPath: modelCard.modelCardPath,
      modelCardSha256: modelCard.modelCardSha256,
      modelCardReference: modelCard.modelCardReference,
    },
    metricsSummary: isRecord(metrics.summary) ? metrics.summary : metrics,
    evaluationSummary: {
      status: evaluationReport.status,
      evaluatedRows: evaluationReport.evaluatedRows,
      evaluationReportPath: evaluationReport.evaluationReportPath,
      evaluationReportSha256: evaluationReport.evaluationReportSha256,
      evaluationReportReference: evaluationReport.evaluationReportReference,
    },
    checksumSummary: checksums,
    gateCount: validation.gates.length,
    warningCount: validation.gates.filter((gate) => gate.status === 'warning').length,
    errorCount: validation.gates.filter((gate) => gate.status === 'block').length,
  };
};

export const normalizeWorkbenchMetadataImportResultForPersistence = (payload: unknown, createdByUserId?: number | null) => {
  const input = asMlWorkbenchImportRecord(payload);
  const packagePayload = readCandidatePackagePayload(input);
  const validation = validateMlWorkbenchCandidateEvaluationMetadataImport(input);
  const candidateManifest = readMetadataRecord(packagePayload, 'candidateManifest', 'candidate_manifest', 'candidateManifestJson');
  const modelCard = readMetadataRecord(packagePayload, 'modelCard', 'model_card', 'modelCardJson');
  const metrics = readMetadataRecord(packagePayload, 'metrics', 'metrics_json', 'metricsJson');
  const evaluationReport = readMetadataRecord(packagePayload, 'evaluationReport', 'evaluation_report', 'evaluationReportJson');
  const checksums = readMetadataRecord(packagePayload, 'checksums', 'checksums_json', 'checksumsJson');
  const summary = validation.summary as Record<string, unknown>;
  const trainingPackageReference = isRecord(summary.trainingPackageReference) ? summary.trainingPackageReference : readMetadataRecord(candidateManifest, 'trainingPackageReference', 'training_package_reference');
  const candidateManifestReference = isRecord(summary.candidateManifestReference) ? summary.candidateManifestReference : readMetadataRecord(candidateManifest, 'candidateManifestReference', 'candidate_manifest_reference');
  const modelCardReference = isRecord(summary.modelCardReference) ? summary.modelCardReference : readMetadataRecord(modelCard, 'modelCardReference', 'model_card_reference');
  const warnings = validation.gates.filter((gate) => gate.status === 'warning');
  const errors = validation.gates.filter((gate) => gate.status === 'block');
  const forbiddenFieldCount = validation.gates.filter((gate) => (
    gate.key === 'no_model_binary_or_artifact_bytes'
    || gate.key === 'no_raw_training_or_test_csv'
    || gate.key === 'no_activation_or_production_directive'
  ) && gate.status === 'block').length;
  const passEquivalent = validation.gates.reduce((score, gate) => score + (gate.status === 'pass' ? 1 : gate.status === 'warning' ? 0.5 : 0), 0);
  const validationScore = validation.gates.length ? Number((passEquivalent / validation.gates.length).toFixed(4)) : 0;
  const metricsSummary = isRecord(metrics.summary) ? metrics.summary : metrics;
  const evaluationSummary = {
    status: evaluationReport.status ?? validation.status,
    evaluatedRows: evaluationReport.evaluatedRows ?? null,
    evaluationReportPath: evaluationReport.evaluationReportPath ?? null,
    evaluationReportSha256: evaluationReport.evaluationReportSha256 ?? null,
    evaluationReportReference: evaluationReport.evaluationReportReference ?? null,
  };
  const payloadSnapshot = compactSnapshot(packagePayload, validation);
  const resultSnapshot = {
    phase: PHASE,
    validationStatus: validation.status,
    warningMessages: warnings.map((gate) => gate.message),
    errorMessages: errors.map((gate) => gate.message),
    metadataOnlyProof,
    gates: validation.gates,
  };

  return {
    candidatePackageId: validation.candidatePackageId || readString(candidateManifest.candidatePackageId) || 'unknown-candidate-package',
    modelKey: validation.modelKey || readString(candidateManifest.modelKey) || 'unknown-model',
    modelVersion: validation.modelVersion || readString(candidateManifest.modelVersion) || 'unknown-version',
    predictionType: validation.predictionType || readString(candidateManifest.predictionType) || 'unknown_prediction_type',
    trainingPackageReference: stringFromReference(trainingPackageReference),
    candidateManifestHash: hashFromReference(candidateManifest, candidateManifestReference),
    metricsSummary,
    evaluationSummary,
    modelCardReference: stringFromReference(modelCardReference) || readString(modelCard.modelCardPath) || null,
    checksumSummary: checksums,
    safetyPolicy: validation.safetyPolicy,
    validationStatus: validation.status,
    validationScore,
    warningCount: warnings.length,
    errorCount: errors.length,
    forbiddenFieldCount,
    payloadSnapshot,
    resultSnapshot,
    createdByUserId: createdByUserId || null,
  };
};

export const recordMlWorkbenchMetadataImportResult = async (payload: unknown, createdByUserId?: number | null) => {
  const normalized = normalizeWorkbenchMetadataImportResultForPersistence(payload, createdByUserId);
  const result = await recordWorkbenchImportResult(normalized);
  return {
    success: true,
    phase: PHASE,
    result,
    metadataOnlyProof,
  };
};

export const listMlWorkbenchMetadataImportResults = async (limitInput?: unknown) => ({
  success: true,
  phase: PHASE,
  results: await listWorkbenchImportResults(limitInput),
  metadataOnlyProof,
});

export const getMlWorkbenchMetadataImportResultById = async (id: unknown) => ({
  success: true,
  phase: PHASE,
  result: await getWorkbenchImportResultById(id),
  metadataOnlyProof,
});

export const getMlWorkbenchMetadataImportResultByCandidatePackageId = async (candidatePackageId: unknown) => ({
  success: true,
  phase: PHASE,
  result: await getWorkbenchImportResultByCandidatePackageId(candidatePackageId),
  metadataOnlyProof,
});

export const getLatestMlWorkbenchMetadataImportResult = async () => ({
  success: true,
  phase: PHASE,
  result: await getLatestWorkbenchImportResult(),
  metadataOnlyProof,
});

export const getMlWorkbenchMetadataImportResultSummary = async () => ({
  success: true,
  phase: PHASE,
  summary: await getWorkbenchImportResultSummary(),
  metadataOnlyProof,
});

/* Phase 11D anchors: normalizeWorkbenchMetadataImportResultForPersistence, recordMlWorkbenchMetadataImportResult, listMlWorkbenchMetadataImportResults, getMlWorkbenchMetadataImportResultSummary, latest result selection, history ordering, metadata-only proof summary, no model execution, no inference, no activation, no artifact bytes, no raw CSV, no business mutation. */
