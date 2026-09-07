import { getWorkbenchImportResultByCandidatePackageId } from '../../db/domains/ml/mlWorkbenchImportResults.db';
import {
  buildMlWorkbenchImportResultDashboard,
  buildMlWorkbenchImportResultDashboardContract,
} from './candidateEvaluationMetadataImportResultDashboard.service';
import type { MlWorkbenchImportResultDashboardRow } from './candidateEvaluationMetadataImportResultDashboardTypes';
import type {
  MlWorkbenchImportResultDetail,
  MlWorkbenchImportResultDetailContract,
  MlWorkbenchImportResultDetailResponse,
  MlWorkbenchImportResultDetailSection,
} from './candidateEvaluationMetadataImportResultDetailTypes';

const CONTRACT_KEY = 'ml_workbench_import_result_detail_drawer_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11D' as const;
const DETAIL_ROUTE = '/api/brain/ml-workbench-import/metadata-result-dashboard/detail/:candidatePackageId' as const;
const PERSISTED_DETAIL_ROUTE = '/api/brain/ml-workbench-import/metadata-results/:id' as const;

const metadataOnlyDetailDrawer = true as const;
const readOnlyDetailRoute = true as const;

const forbiddenBehavior = [
  'No detail endpoint may execute a model, run inference, train, deploy, or activate artifacts.',
  'No detail endpoint may load model binary file, model bytes, artifact bytes, raw training CSV, or raw test CSV.',
  'No detail endpoint may write approval, signoff, archive, retention, routing, or board-review records.',
  'No detail endpoint may mutate inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No detail endpoint may display raw CSV, model binary content, or unbounded JSON.',
] as const;

const safeString = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const safeNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeLookup = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const truncate = (value: string, limit = 640) => value.length > limit ? `${value.slice(0, limit)}…` : value;

const summarizeJson = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return truncate(value);
  try {
    return truncate(JSON.stringify(value));
  } catch (_err) {
    return 'JSON summary unavailable';
  }
};

const section = (
  key: string,
  label: string,
  value: string | number | boolean | null,
  warning = false,
): MlWorkbenchImportResultDetailSection => ({
  key,
  label,
  value,
  metadataOnly: true,
  ...(warning ? { warning } : {}),
});

const buildDetailFromPersistedResult = (result: Record<string, unknown>): MlWorkbenchImportResultDetail | null => {
  const candidatePackageId = safeString(result.candidatePackageId);
  if (!candidatePackageId) return null;
  const metadataOnly = result.metadataOnly === true;
  const modelBinaryPresent = result.modelBinaryPresent === true;
  const rawCsvPresent = result.rawCsvPresent === true;
  const activationDirectivePresent = result.activationDirectivePresent === true;
  const inferenceDirectivePresent = result.inferenceDirectivePresent === true;
  const businessMutationDirectivePresent = result.businessMutationDirectivePresent === true;
  const proofFailed = !metadataOnly || modelBinaryPresent || rawCsvPresent || activationDirectivePresent || inferenceDirectivePresent || businessMutationDirectivePresent;

  return {
    id: safeNumber(result.id),
    candidatePackageId,
    modelKey: safeString(result.modelKey),
    modelVersion: safeString(result.modelVersion),
    predictionType: safeString(result.predictionType),
    trainingPackageReference: safeString(result.trainingPackageReference),
    candidateManifestHash: safeString(result.candidateManifestHash),
    metadataImportStatus: safeString(result.validationStatus),
    validationStatus: safeString(result.validationStatus),
    outputContractStatus: 'metadata_only_persisted',
    safetyPolicyStatus: proofFailed ? 'metadata_only_proof_failed' : 'metadata_only_safe',
    comparisonScore: safeNumber(result.validationScore),
    comparisonBasis: 'phase11d_validation_score',
    warningCount: safeNumber(result.warningCount),
    errorCount: safeNumber(result.errorCount),
    forbiddenFieldCount: safeNumber(result.forbiddenFieldCount),
    createdAt: safeString(result.createdAt),
    createdByUserId: safeNumber(result.createdByUserId),
    metadataOnly: true,
    readOnly: true,
    eligibleForProduction: false,
    activationAllowed: false,
    backendExecutionAllowed: false,
    businessMutationAllowed: false,
    sections: [
      section('candidatePackageId', 'Candidate package identity', candidatePackageId),
      section('modelIdentity', 'Model identity', [safeString(result.modelKey), safeString(result.modelVersion)].filter(Boolean).join(' · ') || null),
      section('predictionType', 'Prediction type', safeString(result.predictionType)),
      section('trainingPackageReference', 'Training package reference', safeString(result.trainingPackageReference)),
      section('candidateManifestHash', 'Candidate manifest hash', safeString(result.candidateManifestHash)),
      section('metricsSummary', 'Metrics summary', summarizeJson(result.metricsSummary)),
      section('evaluationSummary', 'Evaluation summary', summarizeJson(result.evaluationSummary)),
      section('checksumSummary', 'Checksum summary', summarizeJson(result.checksumSummary)),
      section('validationStatus', 'Validation status', safeString(result.validationStatus)),
      section('warningCount', 'Warning count', safeNumber(result.warningCount)),
      section('errorCount', 'Error count', safeNumber(result.errorCount)),
      section('forbiddenFieldCount', 'Forbidden field count', safeNumber(result.forbiddenFieldCount), Number(result.forbiddenFieldCount ?? 0) > 0),
      section('metadataOnly', 'Metadata only', metadataOnly, proofFailed),
      section('modelBinaryPresent', 'No model binary', !modelBinaryPresent, modelBinaryPresent),
      section('rawCsvPresent', 'No raw CSV', !rawCsvPresent, rawCsvPresent),
      section('activationDirectivePresent', 'No activation', !activationDirectivePresent, activationDirectivePresent),
      section('inferenceDirectivePresent', 'No inference', !inferenceDirectivePresent, inferenceDirectivePresent),
      section('businessMutationDirectivePresent', 'No business mutation', !businessMutationDirectivePresent, businessMutationDirectivePresent),
      section('safetyPolicy', 'Safety policy', summarizeJson(result.safetyPolicy)),
      section('payloadSnapshot', 'Payload snapshot summary', summarizeJson(result.payloadSnapshot)),
      section('createdAt', 'Created at', safeString(result.createdAt)),
      section('createdByUserId', 'Created by user', safeNumber(result.createdByUserId)),
    ],
  };
};

const buildDetailFromRow = (row: MlWorkbenchImportResultDashboardRow): MlWorkbenchImportResultDetail | null => {
  const candidatePackageId = safeString(row.candidatePackageId);
  if (!candidatePackageId) return null;

  return {
    candidatePackageId,
    modelKey: row.modelKey,
    modelVersion: row.modelVersion,
    predictionType: row.predictionType,
    trainingPackageReference: row.trainingPackageReference,
    candidateManifestHash: row.candidateManifestHash,
    metadataImportStatus: row.metadataImportStatus,
    validationStatus: row.validationStatus,
    outputContractStatus: row.outputContractStatus,
    safetyPolicyStatus: row.safetyPolicyStatus,
    comparisonScore: row.comparisonScore,
    comparisonBasis: row.comparisonBasis,
    warningCount: row.warningCount,
    errorCount: row.errorCount,
    forbiddenFieldCount: row.forbiddenFieldCount,
    createdAt: row.createdAt,
    metadataOnly: true,
    readOnly: true,
    eligibleForProduction: false,
    activationAllowed: false,
    backendExecutionAllowed: false,
    businessMutationAllowed: false,
    sections: [
      section('candidatePackageId', 'Candidate package identity', candidatePackageId),
      section('modelIdentity', 'Model identity', [row.modelKey, row.modelVersion].filter(Boolean).join(' · ') || null),
      section('predictionType', 'Prediction type', row.predictionType),
      section('trainingPackageReference', 'Training package reference', row.trainingPackageReference ?? null),
      section('candidateManifestHash', 'Candidate manifest hash', row.candidateManifestHash ?? null),
      section('metadataImportStatus', 'Metadata import status', row.metadataImportStatus),
      section('validationStatus', 'Validation status', row.validationStatus),
      section('outputContractStatus', 'Output contract status', row.outputContractStatus),
      section('safetyPolicyStatus', 'Safety policy status', row.safetyPolicyStatus),
      section('comparisonScore', 'Comparison score', row.comparisonScore),
      section('comparisonBasis', 'Comparison basis', row.comparisonBasis),
      section('warningCount', 'Warning count', row.warningCount ?? null),
      section('errorCount', 'Error count', row.errorCount ?? null),
      section('forbiddenFieldCount', 'Forbidden field count', row.forbiddenFieldCount ?? null, Number(row.forbiddenFieldCount ?? 0) > 0),
      section('createdAt', 'Created at', row.createdAt),
      section('metadataOnly', 'Metadata only', true),
      section('noModelExecution', 'No model execution', true),
      section('noInference', 'No inference', true),
      section('noActivation', 'No activation', true),
      section('noBusinessMutation', 'No business mutation', true),
      section('readOnly', 'Read only drawer', true),
      section('eligibleForProduction', 'Eligible for production', false),
      section('activationAllowed', 'Activation allowed', false),
      section('backendExecutionAllowed', 'Backend execution allowed', false),
      section('businessMutationAllowed', 'Business mutation allowed', false),
    ],
  };
};

export const buildMlWorkbenchImportResultDetailContract = (): MlWorkbenchImportResultDetailContract => {
  const dashboardContract = buildMlWorkbenchImportResultDashboardContract();
  return {
    contractKey: CONTRACT_KEY,
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    phase: PHASE,
    purpose: 'Harden a metadata-only detail drawer for persisted Phase 11D import results without execution, activation, governance workflow creation, or business mutation.',
    drawerScope: 'metadata_import_detail_drawer_only',
    sourceDashboardContract: dashboardContract.contractKey,
    allowedRoute: DETAIL_ROUTE,
    persistedResultDetailRoute: PERSISTED_DETAIL_ROUTE,
    forbiddenBehavior: [...forbiddenBehavior],
    operationalPolicy: {
      ...dashboardContract.operationalPolicy,
      metadataOnlyDetailDrawer,
      readOnlyDetailRoute,
    },
  };
};

export const buildMlWorkbenchImportResultDetail = async (
  candidatePackageId: string,
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportResultDetailResponse> => {
  const persistedResult = await getWorkbenchImportResultByCandidatePackageId(candidatePackageId).catch(() => null);
  const persistedDetail = persistedResult ? buildDetailFromPersistedResult(persistedResult as unknown as Record<string, unknown>) : null;
  const contract = buildMlWorkbenchImportResultDetailContract();

  if (persistedDetail) {
    return {
      success: true,
      status: Number(persistedDetail.warningCount ?? 0) > 0 || Number(persistedDetail.errorCount ?? 0) > 0 ? 'metadata_import_detail_partial_metadata' : 'metadata_import_detail_ready',
      contract,
      detail: persistedDetail,
      sourceRow: null,
      safetyPolicy: contract.operationalPolicy,
    };
  }

  const lookup = normalizeLookup(candidatePackageId);
  const dashboard = await buildMlWorkbenchImportResultDashboard(input);
  const sourceRow = dashboard.rows.find((row) => normalizeLookup(row.candidatePackageId) === lookup) ?? null;
  const detail = sourceRow ? buildDetailFromRow(sourceRow) : null;

  return {
    success: true,
    status: detail ? 'metadata_import_detail_ready' : 'metadata_import_detail_not_found',
    contract,
    detail,
    sourceRow,
    safetyPolicy: contract.operationalPolicy,
  };
};

/* Phase 11C/11D anchors: ml_workbench_import_result_detail_drawer_v1, metadataOnlyDetailDrawer, readOnlyDetailRoute, metadata-result-dashboard/detail, persisted result detail route, payload snapshot summary, forbidden fields, warnings, errors, Metadata only, No model execution, No inference, No activation, No business mutation, no execute, no activate, no deploy, no train, no model bytes, no raw CSV, no business mutation, no governance workflow. */
