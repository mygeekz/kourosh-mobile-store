import {
  SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY,
  type ShadowScoreImportMetadataOnlyPayload,
  type ShadowScoreImportValidationIssue,
  type ShadowScoreImportValidatorStatus,
  validateShadowScoreImportMetadataOnlyPayload,
} from './shadowScoreImportMetadataOnlyValidator';

export type ShadowScoreImportPersistenceDryRunRecord = {
  dryRunRecordId: string;
  importRecordId: string;
  shadowScoreId: string;
  entityType: string;
  entityId: string;
  predictionType: string;
  horizonDays: number | null;
  candidateScore: number | null;
  candidateLabel: string;
  candidateConfidence: number | null;
  modelKey: string;
  modelVersion: string;
  candidatePackageId: string;
  storageClass: 'metadata_only_shadow_score_import_fixture';
  metadataOnly: true;
  dryRunOnly: true;
  persistenceMode: 'dry_run_no_write';
  validationStatus: 'validated_metadata_only';
  wouldPersistTo: 'future_shadow_score_metadata_store';
  idempotencyKey: string;
  metadataFingerprint: string;
};

export type ShadowScoreImportPersistenceDryRunReport = {
  phase: 'Phase 13E';
  dryRunKind: 'metadata_only_shadow_score_persistence_dry_run';
  status: ShadowScoreImportValidatorStatus;
  importValidatorStatus: ShadowScoreImportValidatorStatus;
  recordCount: number;
  eligibleRecordCount: number;
  skippedRecordCount: number;
  dryRunRecordCount: number;
  duplicateRecordCount: number;
  warningCount: number;
  errorCount: number;
  forbiddenFieldCount: number;
  warnings: ShadowScoreImportValidationIssue[];
  errors: ShadowScoreImportValidationIssue[];
  dryRunRecords: ShadowScoreImportPersistenceDryRunRecord[];
  dryRunSummary: {
    acceptsPayloadObjectOnly: true;
    validationRequiredBeforeDryRun: true;
    persistenceMode: 'dry_run_no_write';
    databaseWritePerformed: false;
    routeExposed: false;
    modelExecutionPerformed: false;
    artifactActivationPerformed: false;
    businessMutationPerformed: false;
  };
  safetyPolicy: typeof SHADOW_SCORE_IMPORT_METADATA_ONLY_PERSISTENCE_DRY_RUN_POLICY;
  generatedAt: string;
};

export const SHADOW_SCORE_IMPORT_METADATA_ONLY_PERSISTENCE_DRY_RUN_POLICY = {
  phase: 'Phase 13E',
  dryRunOnly: true,
  metadataOnly: true,
  acceptsPayloadObjectOnly: true,
  validationRequiredBeforeDryRun: true,
  readsWorkbenchOutputFiles: false,
  storesValidatedMetadata: false,
  persistsToDatabase: false,
  exposesRoute: false,
  connectsToDatabase: false,
  importsBackendRepository: false,
  callsExternalApi: false,
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
  automaticDeletionAllowed: false,
  purgeJobAllowed: false,
} as const;

const fingerprint = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `dryrun_${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const toDryRunRecord = (
  record: ShadowScoreImportMetadataOnlyPayload['records'][number],
): ShadowScoreImportPersistenceDryRunRecord => {
  const idempotencySource = [
    record.importRecordId,
    record.shadowScoreId,
    record.candidatePackageId,
    record.modelKey,
    record.modelVersion,
    record.entityType,
    record.entityId,
    record.predictionType,
    record.horizonDays ?? 'null',
  ].join('|');
  const idempotencyKey = fingerprint(idempotencySource);
  const metadataFingerprint = fingerprint([
    idempotencySource,
    record.candidateScore ?? 'null',
    record.candidateLabel,
    record.candidateConfidence ?? 'null',
  ].join('|'));

  return {
    dryRunRecordId: `phase13e:${idempotencyKey}`,
    importRecordId: record.importRecordId,
    shadowScoreId: record.shadowScoreId,
    entityType: record.entityType,
    entityId: record.entityId,
    predictionType: record.predictionType,
    horizonDays: record.horizonDays,
    candidateScore: record.candidateScore,
    candidateLabel: record.candidateLabel,
    candidateConfidence: record.candidateConfidence,
    modelKey: record.modelKey,
    modelVersion: record.modelVersion,
    candidatePackageId: record.candidatePackageId,
    storageClass: record.storageClass,
    metadataOnly: true,
    dryRunOnly: true,
    persistenceMode: 'dry_run_no_write',
    validationStatus: 'validated_metadata_only',
    wouldPersistTo: 'future_shadow_score_metadata_store',
    idempotencyKey,
    metadataFingerprint,
  };
};

export const buildShadowScoreImportMetadataOnlyPersistenceDryRun = (
  payload: ShadowScoreImportMetadataOnlyPayload | unknown,
  generatedAt = new Date().toISOString(),
): ShadowScoreImportPersistenceDryRunReport => {
  const validationReport = validateShadowScoreImportMetadataOnlyPayload(payload, generatedAt);
  const canBuildDryRun = validationReport.status !== 'fail';
  const records = canBuildDryRun && typeof payload === 'object' && payload !== null && Array.isArray((payload as ShadowScoreImportMetadataOnlyPayload).records)
    ? (payload as ShadowScoreImportMetadataOnlyPayload).records.map(toDryRunRecord)
    : [];

  return {
    phase: 'Phase 13E',
    dryRunKind: 'metadata_only_shadow_score_persistence_dry_run',
    status: validationReport.status,
    importValidatorStatus: validationReport.status,
    recordCount: validationReport.recordCount,
    eligibleRecordCount: validationReport.status === 'fail' ? 0 : validationReport.validatedRecordCount,
    skippedRecordCount: validationReport.status === 'fail' ? validationReport.recordCount : 0,
    dryRunRecordCount: records.length,
    duplicateRecordCount: validationReport.duplicateRecordCount,
    warningCount: validationReport.warningCount,
    errorCount: validationReport.errorCount,
    forbiddenFieldCount: validationReport.forbiddenFieldCount,
    warnings: validationReport.warnings,
    errors: validationReport.errors,
    dryRunRecords: records,
    dryRunSummary: {
      acceptsPayloadObjectOnly: true,
      validationRequiredBeforeDryRun: true,
      persistenceMode: 'dry_run_no_write',
      databaseWritePerformed: false,
      routeExposed: false,
      modelExecutionPerformed: false,
      artifactActivationPerformed: false,
      businessMutationPerformed: false,
    },
    safetyPolicy: SHADOW_SCORE_IMPORT_METADATA_ONLY_PERSISTENCE_DRY_RUN_POLICY,
    generatedAt,
  };
};
