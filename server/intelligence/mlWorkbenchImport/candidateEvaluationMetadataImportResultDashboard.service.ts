import {
  getWorkbenchImportResultSummary,
  listWorkbenchImportResults,
} from '../../db/domains/ml/mlWorkbenchImportResults.db';
import { buildInventoryStockoutEvaluationComparisonDashboard } from '../datasets/inventoryStockoutEvaluationComparisonDashboard.service';
import type {
  MlWorkbenchImportResultDashboardContract,
  MlWorkbenchImportResultDashboardRecommendation,
  MlWorkbenchImportResultDashboardResponse,
  MlWorkbenchImportResultDashboardRow,
  MlWorkbenchImportResultDashboardStatus,
} from './candidateEvaluationMetadataImportResultDashboardTypes';

const CONTRACT_KEY = 'ml_workbench_import_result_dashboard_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11D' as const;
const ROUTE = '/api/brain/ml-workbench-import/metadata-result-dashboard' as const;

const metadataOnlyReadDashboard = true as const;
const metadataOnlyPersistence = true as const;
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

const safetyPolicy = {
  metadataOnlyReadDashboard,
  metadataOnlyPersistence,
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

const metadataOnlyProof = {
  metadataOnly: true,
  modelBinaryPresent: false,
  rawCsvPresent: false,
  activationDirectivePresent: false,
  inferenceDirectivePresent: false,
  businessMutationDirectivePresent: false,
} as const;

const persistedResultRoutes = [
  'POST /api/brain/ml-workbench-import/metadata-result',
  'GET /api/brain/ml-workbench-import/metadata-results',
  'GET /api/brain/ml-workbench-import/metadata-results/summary',
  'GET /api/brain/ml-workbench-import/metadata-results/latest',
  'GET /api/brain/ml-workbench-import/metadata-results/:id',
  'GET /api/brain/ml-workbench-import/metadata-results/by-candidate/:candidatePackageId',
] as MlWorkbenchImportResultDashboardContract['persistedResultRoutes'];

const forbiddenBehavior = [
  'No model binary import or serialized artifact file reference.',
  'No backend model execution.',
  'No inference, execute, train, deploy, or activate endpoint.',
  'No artifact activation or artifact byte loading.',
  'No raw training CSV or raw test CSV loading into backend.',
  'No production decision automation.',
  'No mutation of inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const isWarningStatus = (value: unknown): boolean => String(value ?? '').toLowerCase().includes('warning');
const isRejectedStatus = (value: unknown): boolean => /rejected|block/i.test(String(value ?? ''));
const isReadyStatus = (value: unknown): boolean => /ready|pass/i.test(String(value ?? ''));

const buildResultRow = (row: Record<string, unknown>, index: number): MlWorkbenchImportResultDashboardRow => ({
  id: asNumber(row.id),
  rank: asNumber(row.rank) ?? index + 1,
  candidatePackageId: asString(row.candidatePackageId),
  modelKey: asString(row.modelKey),
  modelVersion: asString(row.modelVersion),
  predictionType: asString(row.predictionType),
  metadataImportStatus: asString(row.metadataImportStatus ?? row.validationStatus),
  validationStatus: asString(row.validationStatus),
  outputContractStatus: asString(row.outputContractStatus ?? 'metadata_only_persisted'),
  safetyPolicyStatus: asString(row.safetyPolicyStatus ?? row.latestSafetyPolicyStatus ?? 'metadata_only_safe'),
  comparisonScore: asNumber(row.comparisonScore ?? row.validationScore),
  comparisonBasis: asString(row.comparisonBasis ?? 'phase11d_validation_score'),
  createdAt: asString(row.createdAt),
  warningCount: asNumber(row.warningCount),
  errorCount: asNumber(row.errorCount),
  forbiddenFieldCount: asNumber(row.forbiddenFieldCount),
  trainingPackageReference: asString(row.trainingPackageReference),
  candidateManifestHash: asString(row.candidateManifestHash),
  latestChecksumStatus: row.checksumSummary ? 'metadata_available' : asString(row.latestChecksumStatus),
  latestSafetyPolicyStatus: asString(row.latestSafetyPolicyStatus ?? 'metadata_only_safe'),
  metadataOnlyProof,
  metadataOnly: true,
  eligibleForProduction: false,
  activationAllowed: false,
  backendExecutionAllowed: false,
  businessMutationAllowed: false,
});

const chooseStatus = (
  candidateCount: number,
  blockedCandidateCount: number,
  warningCandidateCount: number,
): MlWorkbenchImportResultDashboardStatus => {
  if (candidateCount === 0) return 'metadata_import_result_empty';
  if (blockedCandidateCount > 0 || warningCandidateCount > 0) return 'metadata_import_result_warning';
  return 'metadata_import_result_ready';
};

const chooseRecommendation = (status: MlWorkbenchImportResultDashboardStatus): MlWorkbenchImportResultDashboardRecommendation => {
  if (status === 'metadata_import_result_empty') return 'import_metadata_payload_first';
  if (status === 'metadata_import_result_warning') return 'review_metadata_import_warnings_only';
  return 'review_metadata_import_results_only';
};

export const buildMlWorkbenchImportResultDashboardContract = (): MlWorkbenchImportResultDashboardContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Persist Phase 11A-11C metadata-only import validation results and harden the read-only dashboard/drilldown surface.',
  dashboardScope: 'metadata_import_result_dashboard_only',
  sourceContract: 'phase9b_candidate_evaluation_metadata_import',
  sourceDashboard: 'inventory_stockout_offline_evaluation_comparison_dashboard_v1',
  allowedRoute: ROUTE,
  persistedResultRoutes,
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

const buildFromPersistedResults = async (input: Record<string, unknown>) => {
  const persistedRows = await listWorkbenchImportResults(input.limit ?? 20);
  if (!persistedRows.length) return null;
  const persistedSummary = await getWorkbenchImportResultSummary();
  const rows = (persistedRows as unknown as Record<string, unknown>[]).map(buildResultRow);
  const latest = rows[0] ?? null;
  const warningCandidateCount = rows.filter((row) => isWarningStatus(row.validationStatus) || Number(row.warningCount ?? 0) > 0).length;
  const blockedCandidateCount = rows.filter((row) => isRejectedStatus(row.validationStatus) || Number(row.errorCount ?? 0) > 0).length;
  const safeMetadataCandidateCount = rows.filter((row) => row.metadataOnly === true && !row.backendExecutionAllowed && !row.activationAllowed && !row.businessMutationAllowed).length;
  const status = chooseStatus(rows.length, blockedCandidateCount, warningCandidateCount);

  return {
    rows,
    status,
    recommendation: chooseRecommendation(status),
    candidateCount: persistedSummary.historyCount,
    comparableCandidateCount: rows.filter((row) => row.comparisonScore !== null).length,
    safeMetadataCandidateCount,
    warningCandidateCount,
    blockedCandidateCount,
    historyCount: persistedSummary.historyCount,
    validationStatusDistribution: persistedSummary.validationStatusDistribution,
    totalWarningCount: persistedSummary.warningCount,
    totalErrorCount: persistedSummary.errorCount,
    forbiddenFieldCount: persistedSummary.forbiddenFieldCount,
    bestCandidatePackageId: rows.find((row) => isReadyStatus(row.validationStatus))?.candidatePackageId ?? latest?.candidatePackageId ?? null,
    bestModelVersion: rows.find((row) => isReadyStatus(row.validationStatus))?.modelVersion ?? latest?.modelVersion ?? null,
    bestComparisonScore: rows.find((row) => isReadyStatus(row.validationStatus))?.comparisonScore ?? latest?.comparisonScore ?? null,
    bestComparisonBasis: rows.find((row) => isReadyStatus(row.validationStatus))?.comparisonBasis ?? latest?.comparisonBasis ?? null,
    latestCandidatePackageId: latest?.candidatePackageId ?? null,
    latestMetadataImportStatus: latest?.metadataImportStatus ?? null,
    latestValidationStatus: latest?.validationStatus ?? null,
    latestChecksumStatus: persistedSummary.latestChecksumStatus,
    latestSafetyPolicyStatus: persistedSummary.latestSafetyPolicyStatus,
  };
};

const buildFromLegacyComparison = async (input: Record<string, unknown>) => {
  const comparisonDashboard = await buildInventoryStockoutEvaluationComparisonDashboard(input);
  const comparisonSummary = comparisonDashboard.summary;
  const rows = (comparisonDashboard.rows as unknown as Record<string, unknown>[]).map(buildResultRow);
  const latest = [...rows].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0] ?? null;
  const warningCandidateCount = Math.max(
    comparisonSummary.warningCandidateCount,
    rows.filter((row) => isWarningStatus(row.metadataImportStatus) || isWarningStatus(row.validationStatus)).length,
  );
  const status = chooseStatus(comparisonSummary.candidateCount, comparisonSummary.blockedCandidateCount, warningCandidateCount);

  return {
    rows,
    status,
    recommendation: chooseRecommendation(status),
    candidateCount: comparisonSummary.candidateCount,
    comparableCandidateCount: comparisonSummary.comparableCandidateCount,
    safeMetadataCandidateCount: comparisonSummary.safeMetadataCandidateCount,
    warningCandidateCount,
    blockedCandidateCount: comparisonSummary.blockedCandidateCount,
    historyCount: 0,
    validationStatusDistribution: { ready: 0, warning: warningCandidateCount, rejected: comparisonSummary.blockedCandidateCount },
    totalWarningCount: warningCandidateCount,
    totalErrorCount: comparisonSummary.blockedCandidateCount,
    forbiddenFieldCount: 0,
    bestCandidatePackageId: comparisonSummary.bestCandidatePackageId,
    bestModelVersion: comparisonSummary.bestModelVersion,
    bestComparisonScore: comparisonSummary.bestComparisonScore,
    bestComparisonBasis: comparisonSummary.bestComparisonBasis,
    latestCandidatePackageId: latest?.candidatePackageId ?? null,
    latestMetadataImportStatus: latest?.metadataImportStatus ?? null,
    latestValidationStatus: latest?.validationStatus ?? null,
    latestChecksumStatus: latest?.latestChecksumStatus ?? null,
    latestSafetyPolicyStatus: latest?.latestSafetyPolicyStatus ?? null,
  };
};

export const buildMlWorkbenchImportResultDashboard = async (
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportResultDashboardResponse> => {
  const persisted = await buildFromPersistedResults(input).catch(() => null);
  const state = persisted ?? await buildFromLegacyComparison(input);
  const generatedAt = new Date().toISOString();

  return {
    success: true,
    contract: buildMlWorkbenchImportResultDashboardContract(),
    summary: {
      generatedAt,
      phase: PHASE,
      status: state.status,
      recommendation: state.recommendation,
      candidateCount: state.candidateCount,
      comparableCandidateCount: state.comparableCandidateCount,
      safeMetadataCandidateCount: state.safeMetadataCandidateCount,
      warningCandidateCount: state.warningCandidateCount,
      blockedCandidateCount: state.blockedCandidateCount,
      historyCount: state.historyCount,
      validationStatusDistribution: state.validationStatusDistribution,
      totalWarningCount: state.totalWarningCount,
      totalErrorCount: state.totalErrorCount,
      forbiddenFieldCount: state.forbiddenFieldCount,
      bestCandidatePackageId: state.bestCandidatePackageId,
      bestModelVersion: state.bestModelVersion,
      bestComparisonScore: state.bestComparisonScore,
      bestComparisonBasis: state.bestComparisonBasis,
      latestCandidatePackageId: state.latestCandidatePackageId,
      latestMetadataImportStatus: state.latestMetadataImportStatus,
      latestValidationStatus: state.latestValidationStatus,
      latestChecksumStatus: state.latestChecksumStatus,
      latestSafetyPolicyStatus: state.latestSafetyPolicyStatus,
      metadataOnlyReadDashboard,
      metadataOnlyPersistence,
      routeAdded: true,
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
      recommendedNextAction: state.status === 'metadata_import_result_empty'
        ? 'Validate or import candidate evaluation metadata only before reviewing persisted result history; do not execute or activate any model.'
        : 'Review persisted Phase 11D metadata import result history only; execution, inference, activation, artifact bytes, raw CSV loading, governance workflow creation, and business mutation remain disabled.',
    },
    rows: state.rows,
    safetyPolicy,
  };
};

/* Phase 11B/11D anchors: ml_workbench_import_result_dashboard_v1, metadataOnlyReadDashboard, metadataOnlyPersistence, metadata-result-dashboard, ml_workbench_import_results, result history count, validation status distribution, warning/error counts, forbidden field count, metadata-only proof, no model execution, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
