import { listWorkbenchImportResults } from '../../db/domains/ml/mlWorkbenchImportResults.db';
import type {
  MlMetadataToShadowCandidateReadiness,
  MlMetadataToShadowReadinessBridgeContract,
  MlMetadataToShadowReadinessBridgeResponse,
  MlMetadataToShadowReadinessBridgeRow,
  MlMetadataToShadowReadinessStatus,
} from './candidateEvaluationMetadataToShadowReadinessBridgeTypes';

const CONTRACT_KEY = 'ml_metadata_to_shadow_readiness_bridge_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 12A' as const;
const ROUTE = '/api/brain/ml-workbench-import/metadata-results/shadow-readiness-bridge' as const;

const safetyPolicy = {
  metadataOnlyBridge: true,
  readOnlyBridge: true,
  readinessOnly: true,
  createsShadowRuntimeRecord: false,
  createsShadowObservation: false,
  createsGovernanceWorkflow: false,
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
  rawTrainingCsvLoadingAllowed: false,
} as const;

const forbiddenRoutes = [
  'infer',
  'execute',
  'activate',
  'deploy',
  'production-score',
  'train-model',
  'fit',
  'execute-model',
  'activate-model',
] as const;

const forbiddenBehavior = [
  'No model execution or runtime invocation.',
  'No inference endpoint and no production scoring endpoint.',
  'No artifact activation, deployment, or model byte loading.',
  'No raw training CSV loading in backend.',
  'No shadow runtime record creation and no shadow observation creation.',
  'No inventory, accounting, pricing, report, ledger, customer, partner, sale, repair, invoice, or phone mutation.',
  'No new binder, signoff workflow, archive pack, retention policy, approval workflow, evidence review pack, routing matrix, board packet, governance review, or finalization summary.',
] as const;

const asNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const asStringOrNull = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const asBoolean = (value: unknown): boolean => value === true || Number(value) === 1;

const isReadyStatus = (value: unknown): boolean => /ready|pass/i.test(String(value ?? ''));
const isWarningStatus = (value: unknown): boolean => /warning|watch|review/i.test(String(value ?? ''));
const isBlockedStatus = (value: unknown): boolean => /reject|block|fail/i.test(String(value ?? ''));

const classifyReadiness = (row: Record<string, unknown>): MlMetadataToShadowCandidateReadiness => {
  const warningCount = asNumber(row.warningCount);
  const errorCount = asNumber(row.errorCount);
  const forbiddenFieldCount = asNumber(row.forbiddenFieldCount);
  const metadataOnly = asBoolean(row.metadataOnly);
  const unsafeDirectivePresent = [
    row.modelBinaryPresent,
    row.rawCsvPresent,
    row.activationDirectivePresent,
    row.inferenceDirectivePresent,
    row.businessMutationDirectivePresent,
  ].some(asBoolean);
  const validationStatus = row.validationStatus;

  if (!metadataOnly || unsafeDirectivePresent || errorCount > 0 || forbiddenFieldCount > 0 || isBlockedStatus(validationStatus)) {
    return 'blocked_from_shadow_observation_metadata_only';
  }
  if (warningCount > 0 || isWarningStatus(validationStatus) || !isReadyStatus(validationStatus)) {
    return 'needs_metadata_review_before_shadow_observation';
  }
  return 'ready_for_shadow_observation_metadata_only';
};

const buildBlockingReasons = (row: Record<string, unknown>): string[] => {
  const reasons: string[] = [];
  if (!asBoolean(row.metadataOnly)) reasons.push('metadata_only_proof_missing');
  if (asBoolean(row.modelBinaryPresent)) reasons.push('model_binary_present');
  if (asBoolean(row.rawCsvPresent)) reasons.push('raw_csv_present');
  if (asBoolean(row.activationDirectivePresent)) reasons.push('activation_directive_present');
  if (asBoolean(row.inferenceDirectivePresent)) reasons.push('inference_directive_present');
  if (asBoolean(row.businessMutationDirectivePresent)) reasons.push('business_mutation_directive_present');
  if (asNumber(row.errorCount) > 0) reasons.push('metadata_import_errors_present');
  if (asNumber(row.forbiddenFieldCount) > 0) reasons.push('forbidden_fields_present');
  if (isBlockedStatus(row.validationStatus)) reasons.push('validation_status_blocked');
  return reasons;
};

const buildReadinessSignals = (row: Record<string, unknown>, readiness: MlMetadataToShadowCandidateReadiness): string[] => {
  const signals = [
    'metadata_only_import_result_available',
    'backend_readiness_bridge_is_read_only',
    'no_inference_endpoint_exposed',
    'no_model_execution_allowed',
    'no_artifact_activation_allowed',
    'no_business_mutation_allowed',
  ];
  if (asStringOrNull(row.trainingPackageReference)) signals.push('training_package_reference_available');
  if (asStringOrNull(row.candidateManifestHash)) signals.push('candidate_manifest_hash_available');
  if (readiness === 'ready_for_shadow_observation_metadata_only') signals.push('validation_ready_for_metadata_only_shadow_review');
  if (readiness === 'needs_metadata_review_before_shadow_observation') signals.push('manual_metadata_review_needed_before_shadow_observation');
  if (readiness === 'blocked_from_shadow_observation_metadata_only') signals.push('blocked_until_metadata_import_issues_are_resolved');
  return signals;
};

const buildRow = (row: Record<string, unknown>): MlMetadataToShadowReadinessBridgeRow => {
  const shadowCandidateReadiness = classifyReadiness(row);
  return {
    candidatePackageId: asStringOrNull(row.candidatePackageId),
    modelKey: asStringOrNull(row.modelKey),
    modelVersion: asStringOrNull(row.modelVersion),
    predictionType: asStringOrNull(row.predictionType),
    validationStatus: asStringOrNull(row.validationStatus),
    validationScore: asNumber(row.validationScore, 0),
    warningCount: asNumber(row.warningCount),
    errorCount: asNumber(row.errorCount),
    forbiddenFieldCount: asNumber(row.forbiddenFieldCount),
    metadataOnly: asBoolean(row.metadataOnly),
    modelBinaryPresent: asBoolean(row.modelBinaryPresent),
    rawCsvPresent: asBoolean(row.rawCsvPresent),
    activationDirectivePresent: asBoolean(row.activationDirectivePresent),
    inferenceDirectivePresent: asBoolean(row.inferenceDirectivePresent),
    businessMutationDirectivePresent: asBoolean(row.businessMutationDirectivePresent),
    trainingPackageReference: asStringOrNull(row.trainingPackageReference),
    candidateManifestHash: asStringOrNull(row.candidateManifestHash),
    createdAt: asStringOrNull(row.createdAt),
    shadowCandidateReadiness,
    readinessSignals: buildReadinessSignals(row, shadowCandidateReadiness),
    blockingReasons: buildBlockingReasons(row),
    metadataToShadowBridgeOnly: true,
    readOnlyBridge: true,
    createsShadowRuntimeRecord: false,
    createsShadowObservation: false,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canMutateBusinessRecords: false,
  };
};

const chooseStatus = (
  candidateCount: number,
  readyCandidateCount: number,
  blockedCandidateCount: number,
): MlMetadataToShadowReadinessStatus => {
  if (candidateCount === 0) return 'metadata_to_shadow_readiness_empty';
  if (blockedCandidateCount > 0) return 'metadata_to_shadow_readiness_blocked';
  if (readyCandidateCount === candidateCount) return 'metadata_to_shadow_readiness_ready';
  return 'metadata_to_shadow_readiness_watch';
};

const chooseRecommendation = (status: MlMetadataToShadowReadinessStatus): string => {
  if (status === 'metadata_to_shadow_readiness_empty') return 'Import metadata-only candidate results before assessing shadow readiness.';
  if (status === 'metadata_to_shadow_readiness_blocked') return 'Resolve blocked metadata import results before any future shadow observation planning.';
  if (status === 'metadata_to_shadow_readiness_watch') return 'Review warning metadata before marking candidates ready for future shadow observation planning.';
  return 'Candidate metadata is ready for a future metadata-only shadow observation planning step; this bridge still creates no runtime or observation records.';
};

export const buildMlMetadataToShadowReadinessBridgeContract = (): MlMetadataToShadowReadinessBridgeContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Bridge imported metadata results to future shadow candidate readiness labels without executing models, exposing inference, activating artifacts, or mutating business records.',
  bridgeScope: 'metadata_to_shadow_candidate_readiness_only',
  sourceContract: 'ml_workbench_import_result_dashboard_v1',
  allowedRoute: ROUTE,
  forbiddenRoutes: [...forbiddenRoutes],
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const buildMlMetadataToShadowReadinessBridge = async (input: Record<string, unknown> = {}): Promise<MlMetadataToShadowReadinessBridgeResponse> => {
  const rows = ((await listWorkbenchImportResults(input.limit ?? 12)) as unknown as Record<string, unknown>[]).map(buildRow);
  const readyCandidateCount = rows.filter((row) => row.shadowCandidateReadiness === 'ready_for_shadow_observation_metadata_only').length;
  const watchCandidateCount = rows.filter((row) => row.shadowCandidateReadiness === 'needs_metadata_review_before_shadow_observation').length;
  const blockedCandidateCount = rows.filter((row) => row.shadowCandidateReadiness === 'blocked_from_shadow_observation_metadata_only').length;
  const status = chooseStatus(rows.length, readyCandidateCount, blockedCandidateCount);

  return {
    success: true,
    contract: buildMlMetadataToShadowReadinessBridgeContract(),
    summary: {
      generatedAt: new Date().toISOString(),
      phase: PHASE,
      status,
      candidateCount: rows.length,
      readyCandidateCount,
      watchCandidateCount,
      blockedCandidateCount,
      latestCandidatePackageId: rows[0]?.candidatePackageId ?? null,
      recommendedNextAction: chooseRecommendation(status),
      ...safetyPolicy,
    },
    rows,
    safetyPolicy,
  };
};

/* Phase 12A anchors: metadata-to-shadow candidate readiness bridge, metadata-only, readiness-only, read-only, no shadow runtime record creation, no shadow observation creation, no model execution, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance bloat. */
