import {
  buildShadowScoreImportMetadataOnlyPersistenceDryRun,
  type ShadowScoreImportPersistenceDryRunRecord,
  type ShadowScoreImportPersistenceDryRunReport,
} from './shadowScoreImportMetadataOnlyPersistenceDryRun';
import {
  type ShadowScoreImportMetadataOnlyPayload,
  type ShadowScoreImportValidationIssue,
  type ShadowScoreImportValidatorStatus,
} from './shadowScoreImportMetadataOnlyValidator';
import {
  buildShadowScoreMetadataOnlyStorageSchemaDraftReport,
  type ShadowScoreMetadataOnlyStorageRowDraft,
  type ShadowScoreMetadataOnlyStorageSchemaDraftReport,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyRepositoryImplementationDraftStatus = ShadowScoreImportValidatorStatus;

export type ShadowScoreMetadataOnlyRepositoryImplementationDraftReport = {
  phase: 'Phase 13G';
  repositoryKind: 'guarded_metadata_only_shadow_score_repository_implementation_draft';
  status: ShadowScoreMetadataOnlyRepositoryImplementationDraftStatus;
  inputRecordCount: number;
  validatedRecordCount: number;
  dryRunRecordCount: number;
  stagedRecordCount: number;
  skippedRecordCount: number;
  duplicateIdempotencyKeyCount: number;
  warningCount: number;
  errorCount: number;
  forbiddenFieldCount: number;
  warnings: ShadowScoreImportValidationIssue[];
  errors: ShadowScoreImportValidationIssue[];
  dryRunStatus: ShadowScoreImportValidatorStatus;
  storageDraftStatus: ShadowScoreImportValidatorStatus;
  stageMode: 'guarded_in_memory_draft_no_database_write';
  stageApplied: boolean;
  stagedRows: ShadowScoreMetadataOnlyStorageRowDraft[];
  storageDraftReport: ShadowScoreMetadataOnlyStorageSchemaDraftReport;
  repositoryBoundary: typeof SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_BOUNDARY;
  safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_POLICY;
  generatedAt: string;
};

export type ShadowScoreMetadataOnlyRepositoryImplementationDraft = {
  readonly repositoryKind: 'guarded_metadata_only_shadow_score_repository_implementation_draft';
  readonly stageMode: 'guarded_in_memory_draft_no_database_write';
  readonly databaseWriteAllowed: false;
  readonly routeExposed: false;
  readonly modelExecutionAllowed: false;
  readonly artifactActivationAllowed: false;
  readonly businessMutationAllowed: false;
  previewValidatedMetadataOnlyRows(
    payload: ShadowScoreImportMetadataOnlyPayload | unknown,
    generatedAt?: string,
  ): ShadowScoreMetadataOnlyRepositoryImplementationDraftReport;
  stageValidatedMetadataOnlyRows(
    payload: ShadowScoreImportMetadataOnlyPayload | unknown,
    generatedAt?: string,
  ): ShadowScoreMetadataOnlyRepositoryImplementationDraftReport;
  listStagedMetadataOnlyRows(): ShadowScoreMetadataOnlyStorageRowDraft[];
  clearInMemoryDraftStage(): void;
};

export const SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_BOUNDARY = {
  phase: 'Phase 13G',
  repositoryImplementationDraft: true,
  guardedInMemoryDraftOnly: true,
  acceptsPayloadObjectOnly: true,
  requiresPhase13DValidator: true,
  requiresPhase13EDryRun: true,
  usesPhase13FStorageSchemaDraft: true,
  migrationAdded: false,
  tableCreated: false,
  connectsToDatabase: false,
  databaseWriteAllowed: false,
  writesToDatabase: false,
  readsWorkbenchOutputFiles: false,
  exposesRoute: false,
  loadsModelArtifact: false,
  executesModel: false,
  activatesArtifact: false,
  mutatesBusinessRecords: false,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_POLICY = {
  phase: 'Phase 13G',
  metadataOnly: true,
  repositoryImplementationDraft: true,
  guardedInMemoryDraftOnly: true,
  acceptsPayloadObjectOnly: true,
  validationRequiredBeforeStage: true,
  dryRunRequiredBeforeStage: true,
  storageSchemaDraftRequired: true,
  readsWorkbenchOutputFiles: false,
  storesValidatedMetadataInMemoryOnly: true,
  storesValidatedMetadataInDatabase: false,
  persistsToDatabase: false,
  connectsToDatabase: false,
  migrationAdded: false,
  tableCreated: false,
  exposesRoute: false,
  callsExternalApi: false,
  loadsModelArtifact: false,
  importsJoblibOrSklearn: false,
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

const asMetadataString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

const toStorageDraftRow = (
  payload: ShadowScoreImportMetadataOnlyPayload,
  record: ShadowScoreImportMetadataOnlyPayload['records'][number],
  dryRunRecord: ShadowScoreImportPersistenceDryRunRecord,
  index: number,
  generatedAt: string,
): ShadowScoreMetadataOnlyStorageRowDraft => {
  const extendedRecord = record as Record<string, unknown>;
  const extendedPayload = payload as Record<string, unknown>;
  const payloadGeneratedAt = asMetadataString(extendedPayload.generatedAt, generatedAt);

  return {
    storageRecordId: `phase13g:${dryRunRecord.idempotencyKey}`,
    importRecordId: record.importRecordId,
    shadowScoreId: record.shadowScoreId,
    entityType: record.entityType,
    entityId: record.entityId,
    predictionType: record.predictionType,
    horizonDays: record.horizonDays,
    candidateScore: record.candidateScore,
    candidateLabel: record.candidateLabel,
    candidateConfidence: record.candidateConfidence,
    scoreQuality: asMetadataString(extendedRecord.scoreQuality, 'metadata_only_score'),
    modelKey: record.modelKey,
    modelVersion: record.modelVersion,
    candidatePackageId: record.candidatePackageId,
    sourceImportFixtureId: asMetadataString(extendedPayload.fixtureId, `metadata-only-fixture:${payload.candidatePackageId}`),
    sourceShadowExportId: asMetadataString(extendedPayload.shadowExportId, `offline-shadow-export:${payload.candidatePackageId}`),
    sourceExportRecordHash: asMetadataString(extendedRecord.sourceExportRecordHash, `missing-source-hash-${index}`),
    scoreGeneratedAt: asMetadataString(extendedRecord.scoreGeneratedAt, payloadGeneratedAt),
    exportGeneratedAt: asMetadataString(extendedRecord.exportGeneratedAt, payloadGeneratedAt),
    importFixtureGeneratedAt: asMetadataString(extendedRecord.importFixtureGeneratedAt, payloadGeneratedAt),
    metadataFingerprint: dryRunRecord.metadataFingerprint,
    idempotencyKey: dryRunRecord.idempotencyKey,
    storageClass: 'metadata_only_shadow_score_storage_schema_draft',
    storageMode: 'schema_draft_no_write',
    evidenceOnly: true,
    metadataOnly: true,
    schemaDraftOnly: true,
    repositoryWriteMethodAvailable: false,
    databaseWriteAllowed: false,
    routeExposed: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
  };
};

const buildRowsFromValidatedPayload = (
  payload: ShadowScoreImportMetadataOnlyPayload | unknown,
  dryRunReport: ShadowScoreImportPersistenceDryRunReport,
  generatedAt: string,
): ShadowScoreMetadataOnlyStorageRowDraft[] => {
  if (dryRunReport.status === 'fail') return [];
  if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as ShadowScoreImportMetadataOnlyPayload).records)) return [];

  const typedPayload = payload as ShadowScoreImportMetadataOnlyPayload;
  const dryRunByImportRecordId = new Map(dryRunReport.dryRunRecords.map((record) => [record.importRecordId, record] as const));

  return typedPayload.records.flatMap((record, index) => {
    const dryRunRecord = dryRunByImportRecordId.get(record.importRecordId);
    return dryRunRecord ? [toStorageDraftRow(typedPayload, record, dryRunRecord, index, generatedAt)] : [];
  });
};

const summarizeStatus = (
  dryRunStatus: ShadowScoreImportValidatorStatus,
  storageDraftStatus: ShadowScoreImportValidatorStatus,
): ShadowScoreMetadataOnlyRepositoryImplementationDraftStatus => {
  if (dryRunStatus === 'fail' || storageDraftStatus === 'fail') return 'fail';
  if (dryRunStatus === 'warning' || storageDraftStatus === 'warning') return 'warning';
  return 'pass';
};

export const buildShadowScoreMetadataOnlyRepositoryImplementationDraftPreview = (
  payload: ShadowScoreImportMetadataOnlyPayload | unknown,
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyRepositoryImplementationDraftReport => {
  const dryRunReport = buildShadowScoreImportMetadataOnlyPersistenceDryRun(payload, generatedAt);
  const stagedRows = buildRowsFromValidatedPayload(payload, dryRunReport, generatedAt);
  const storageDraftReport = buildShadowScoreMetadataOnlyStorageSchemaDraftReport({ records: stagedRows });
  const status = summarizeStatus(dryRunReport.status, storageDraftReport.status);

  return {
    phase: 'Phase 13G',
    repositoryKind: 'guarded_metadata_only_shadow_score_repository_implementation_draft',
    status,
    inputRecordCount: dryRunReport.recordCount,
    validatedRecordCount: status === 'fail' ? 0 : dryRunReport.eligibleRecordCount,
    dryRunRecordCount: dryRunReport.dryRunRecordCount,
    stagedRecordCount: status === 'fail' ? 0 : stagedRows.length,
    skippedRecordCount: status === 'fail' ? dryRunReport.recordCount : 0,
    duplicateIdempotencyKeyCount: storageDraftReport.errors.filter((entry) => entry.code === 'duplicate_unique_value' && entry.path.includes('idempotencyKey')).length,
    warningCount: dryRunReport.warningCount + storageDraftReport.warningCount,
    errorCount: dryRunReport.errorCount + storageDraftReport.errorCount,
    forbiddenFieldCount: dryRunReport.forbiddenFieldCount,
    warnings: [...dryRunReport.warnings, ...storageDraftReport.warnings],
    errors: [...dryRunReport.errors, ...storageDraftReport.errors],
    dryRunStatus: dryRunReport.status,
    storageDraftStatus: storageDraftReport.status,
    stageMode: 'guarded_in_memory_draft_no_database_write',
    stageApplied: false,
    stagedRows: status === 'fail' ? [] : stagedRows,
    storageDraftReport,
    repositoryBoundary: SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_POLICY,
    generatedAt,
  };
};

export const createShadowScoreMetadataOnlyRepositoryImplementationDraft = (): ShadowScoreMetadataOnlyRepositoryImplementationDraft => {
  const stagedByIdempotencyKey = new Map<string, ShadowScoreMetadataOnlyStorageRowDraft>();

  return {
    repositoryKind: 'guarded_metadata_only_shadow_score_repository_implementation_draft',
    stageMode: 'guarded_in_memory_draft_no_database_write',
    databaseWriteAllowed: false,
    routeExposed: false,
    modelExecutionAllowed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    previewValidatedMetadataOnlyRows(payload, generatedAt) {
      return buildShadowScoreMetadataOnlyRepositoryImplementationDraftPreview(payload, generatedAt);
    },
    stageValidatedMetadataOnlyRows(payload, generatedAt) {
      const report = buildShadowScoreMetadataOnlyRepositoryImplementationDraftPreview(payload, generatedAt);
      if (report.status === 'fail') return report;

      for (const row of report.stagedRows) {
        stagedByIdempotencyKey.set(row.idempotencyKey, row);
      }

      return {
        ...report,
        stageApplied: true,
        stagedRows: Array.from(stagedByIdempotencyKey.values()),
        stagedRecordCount: stagedByIdempotencyKey.size,
      };
    },
    listStagedMetadataOnlyRows() {
      return Array.from(stagedByIdempotencyKey.values());
    },
    clearInMemoryDraftStage() {
      stagedByIdempotencyKey.clear();
    },
  };
};
