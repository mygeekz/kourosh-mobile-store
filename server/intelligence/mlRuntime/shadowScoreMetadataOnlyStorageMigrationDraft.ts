import {
  SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_COLUMNS,
  type ShadowScoreMetadataOnlyStorageColumnDraft,
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyStorageMigrationDraftColumn = ShadowScoreMetadataOnlyStorageColumnDraft & {
  readonly sqlColumnName: string;
  readonly sqlType: 'TEXT' | 'INTEGER' | 'REAL';
  readonly nullable: boolean;
  readonly defaultValue: string | null;
  readonly checkConstraint: string | null;
};

export type ShadowScoreMetadataOnlyStorageMigrationDraftIndex = {
  readonly name: string;
  readonly columns: string[];
  readonly unique: boolean;
  readonly draftOnly: true;
};

export type ShadowScoreMetadataOnlyStorageMigrationDraftReport = {
  readonly phase: 'Phase 13H';
  readonly migrationDraftKind: 'metadata_only_shadow_score_storage_migration_draft';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly tableDraftName: 'shadow_score_metadata_only_store';
  readonly migrationDraftName: 'phase13h_shadow_score_metadata_only_store_draft';
  readonly migrationDraftSqlFile: 'server/intelligence/mlRuntime/migrationDrafts/phase13h_shadow_score_metadata_only_store.draft.sql';
  readonly migrationMode: 'draft_sql_no_execution';
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly tableCreationApplied: false;
  readonly repositoryWriteAllowed: false;
  readonly routeExposed: false;
  readonly columns: ShadowScoreMetadataOnlyStorageMigrationDraftColumn[];
  readonly indexes: ShadowScoreMetadataOnlyStorageMigrationDraftIndex[];
  readonly uniqueness: string[];
  readonly checkConstraintCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly migrationBoundary: typeof SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY = {
  phase: 'Phase 13H',
  migrationDraftOnly: true,
  sqlFileIsDraftOnly: true,
  sqlFileIsNotRuntimeLoaded: true,
  sqlFileIsNotExecuted: true,
  noMigrationRunnerAdded: true,
  migrationApplicationAllowed: false,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  tableCreationApplied: false,
  tableCreated: false,
  repositoryWriteAllowed: false,
  readsWorkbenchOutputFiles: false,
  exposesRoute: false,
  loadsModelArtifact: false,
  executesModel: false,
  activatesArtifact: false,
  mutatesBusinessRecords: false,
  requiresPhase13DValidatorBeforeFutureStorage: true,
  requiresPhase13EDryRunBeforeFutureStorage: true,
  requiresPhase13FSchemaBeforeFutureStorage: true,
  requiresPhase13GRepositoryDraftBeforeFutureStorage: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY = {
  phase: 'Phase 13H',
  metadataOnly: true,
  migrationDraftOnly: true,
  schemaSqlDraftOnly: true,
  noMigrationRunnerAdded: true,
  noRuntimeSqlExecution: true,
  noDatabaseConnection: true,
  noDatabaseWrite: true,
  noTableCreated: true,
  noRepositoryWrite: true,
  noRouteExposure: true,
  readsWorkbenchOutputFiles: false,
  storesValidatedMetadata: false,
  persistsToDatabase: false,
  connectsToDatabase: false,
  exposesRoute: false,
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

const issue = (code: string, message: string, path: string): ShadowScoreMetadataOnlyStorageDraftIssue => ({
  code,
  message,
  path,
});

const toSnakeCase = (value: string): string => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toSqlType = (logicalType: ShadowScoreMetadataOnlyStorageColumnDraft['logicalType']): 'TEXT' | 'INTEGER' | 'REAL' => {
  if (logicalType === 'number' || logicalType === 'nullable_number') return 'REAL';
  if (logicalType === 'boolean') return 'INTEGER';
  return 'TEXT';
};

const toDraftColumn = (column: ShadowScoreMetadataOnlyStorageColumnDraft): ShadowScoreMetadataOnlyStorageMigrationDraftColumn => {
  const sqlColumnName = toSnakeCase(column.name);
  const isBoolean = column.logicalType === 'boolean';
  const isNullableNumber = column.logicalType === 'nullable_number';
  const checkConstraint = isBoolean ? `${sqlColumnName} in draft boolean domain` : isNullableNumber ? `${sqlColumnName} may be null or numeric` : null;

  return {
    ...column,
    sqlColumnName,
    sqlType: toSqlType(column.logicalType),
    nullable: !column.required,
    defaultValue: isBoolean ? '0 or 1 draft default only' : null,
    checkConstraint,
  };
};

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_COLUMNS: ShadowScoreMetadataOnlyStorageMigrationDraftColumn[] =
  SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_COLUMNS.map(toDraftColumn);

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_INDEXES: ShadowScoreMetadataOnlyStorageMigrationDraftIndex[] = [
  {
    name: 'ux_shadow_score_metadata_only_store_storage_record_id',
    columns: ['storage_record_id'],
    unique: true,
    draftOnly: true,
  },
  {
    name: 'ux_shadow_score_metadata_only_store_fingerprint',
    columns: ['metadata_fingerprint'],
    unique: true,
    draftOnly: true,
  },
  {
    name: 'ux_shadow_score_metadata_only_store_idempotency_key',
    columns: ['idempotency_key'],
    unique: true,
    draftOnly: true,
  },
  {
    name: 'ix_shadow_score_metadata_only_store_entity',
    columns: ['entity_type', 'entity_id'],
    unique: false,
    draftOnly: true,
  },
  {
    name: 'ix_shadow_score_metadata_only_store_model',
    columns: ['model_key', 'model_version'],
    unique: false,
    draftOnly: true,
  },
  {
    name: 'ix_shadow_score_metadata_only_store_package',
    columns: ['candidate_package_id'],
    unique: false,
    draftOnly: true,
  },
];

export const buildShadowScoreMetadataOnlyStorageMigrationDraftReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyStorageMigrationDraftReport => {
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const columnNames = new Set<string>();

  for (const [index, column] of SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_COLUMNS.entries()) {
    if (columnNames.has(column.sqlColumnName)) {
      errors.push(issue('duplicate_column_name', `${column.sqlColumnName} must be unique in the draft.`, `columns[${index}].sqlColumnName`));
    }
    columnNames.add(column.sqlColumnName);

    if (column.pii !== false || column.businessMutable !== false) {
      errors.push(issue('unsafe_column_policy', `${column.name} must remain non-PII and non-business-mutable.`, `columns[${index}]`));
    }
  }

  const checkConstraintCount = SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_COLUMNS.filter(
    (column) => column.checkConstraint !== null,
  ).length;

  if (checkConstraintCount < 2) {
    warnings.push(issue('low_check_constraint_count', 'Draft should preserve boolean/non-operational guard constraints.', 'columns'));
  }

  return {
    phase: 'Phase 13H',
    migrationDraftKind: 'metadata_only_shadow_score_storage_migration_draft',
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass',
    tableDraftName: 'shadow_score_metadata_only_store',
    migrationDraftName: 'phase13h_shadow_score_metadata_only_store_draft',
    migrationDraftSqlFile: 'server/intelligence/mlRuntime/migrationDrafts/phase13h_shadow_score_metadata_only_store.draft.sql',
    migrationMode: 'draft_sql_no_execution',
    migrationApplicationAllowed: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    tableCreationApplied: false,
    repositoryWriteAllowed: false,
    routeExposed: false,
    columns: SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_COLUMNS,
    indexes: SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_INDEXES,
    uniqueness: ['storage_record_id', 'metadata_fingerprint', 'idempotency_key'],
    checkConstraintCount,
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
    migrationBoundary: SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY,
    generatedAt,
  };
};
