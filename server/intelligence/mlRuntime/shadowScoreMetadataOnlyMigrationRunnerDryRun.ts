import {
  buildShadowScoreMetadataOnlyStorageMigrationDraftReport,
  SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY,
  SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_INDEXES,
  SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY,
  type ShadowScoreMetadataOnlyStorageMigrationDraftColumn,
  type ShadowScoreMetadataOnlyStorageMigrationDraftIndex,
  type ShadowScoreMetadataOnlyStorageMigrationDraftReport,
} from './shadowScoreMetadataOnlyStorageMigrationDraft';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationRunnerDryRunCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationRunnerDryRunPlan = {
  readonly tableDraftName: 'shadow_score_metadata_only_store';
  readonly sourceMigrationDraftName: 'phase13h_shadow_score_metadata_only_store_draft';
  readonly sourceSqlDraftFile: 'server/intelligence/mlRuntime/migrationDrafts/phase13h_shadow_score_metadata_only_store.draft.sql';
  readonly plannedColumns: ShadowScoreMetadataOnlyStorageMigrationDraftColumn[];
  readonly plannedIndexes: ShadowScoreMetadataOnlyStorageMigrationDraftIndex[];
  readonly plannedUniqueConstraints: string[];
  readonly plannedCheckConstraintCount: number;
  readonly preflightOnly: true;
  readonly sqlTextLoadedFromDisk: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly tableCreationApplied: false;
};

export type ShadowScoreMetadataOnlyMigrationRunnerDryRunReport = {
  readonly phase: 'Phase 13I';
  readonly dryRunKind: 'guarded_metadata_only_migration_runner_dry_run';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13H';
  readonly sourceMigrationDraftKind: 'metadata_only_shadow_score_storage_migration_draft';
  readonly dryRunMode: 'preflight_only_no_sql_execution';
  readonly migrationRunnerDryRunOnly: true;
  readonly migrationRunnerRegistered: false;
  readonly migrationRunnerOperational: false;
  readonly sqlTextLoadedFromDisk: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly migrationApplicationAllowed: false;
  readonly tableCreationApplied: false;
  readonly routeExposed: false;
  readonly plannedColumnCount: number;
  readonly plannedIndexCount: number;
  readonly plannedUniqueConstraintCount: number;
  readonly plannedCheckConstraintCount: number;
  readonly preflightCheckCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly preflightChecks: ShadowScoreMetadataOnlyMigrationRunnerDryRunCheck[];
  readonly plan: ShadowScoreMetadataOnlyMigrationRunnerDryRunPlan;
  readonly sourceMigrationDraftReport: ShadowScoreMetadataOnlyStorageMigrationDraftReport;
  readonly migrationRunnerBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY = {
  phase: 'Phase 13I',
  migrationRunnerDryRunOnly: true,
  preflightOnly: true,
  usesPhase13HMigrationDraftReportOnly: true,
  sourceSqlFileIsNotReadFromDisk: true,
  sqlTextLoadedFromDisk: false,
  sqlFileIsNotExecuted: true,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  migrationApplicationAllowed: false,
  migrationRunnerRegistered: false,
  migrationRunnerOperational: false,
  migrationRegistryMutated: false,
  tableCreationApplied: false,
  tableCreated: false,
  repositoryWriteAllowed: false,
  readsWorkbenchOutputFiles: false,
  exposesRoute: false,
  loadsModelArtifact: false,
  executesModel: false,
  activatesArtifact: false,
  mutatesBusinessRecords: false,
  requiresPhase13HMigrationDraft: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY = {
  phase: 'Phase 13I',
  metadataOnly: true,
  migrationRunnerDryRunOnly: true,
  preflightOnly: true,
  noSqlFileRuntimeRead: true,
  noRuntimeSqlExecution: true,
  noDatabaseConnection: true,
  noDatabaseWrite: true,
  noTableCreated: true,
  noMigrationRegistryMutation: true,
  noRepositoryWrite: true,
  noRouteExposure: true,
  readsWorkbenchOutputFiles: false,
  storesValidatedMetadata: false,
  persistsToDatabase: false,
  connectsToDatabase: false,
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

const issue = (code: string, message: string, path: string): ShadowScoreMetadataOnlyStorageDraftIssue => ({
  code,
  message,
  path,
});

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationRunnerDryRunCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: ShadowScoreMetadataOnlyMigrationRunnerDryRunCheck[],
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail')) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

export const buildShadowScoreMetadataOnlyMigrationRunnerDryRunReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationRunnerDryRunReport => {
  const sourceMigrationDraftReport = buildShadowScoreMetadataOnlyStorageMigrationDraftReport(generatedAt);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const uniqueIndexes = SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_INDEXES.filter((index: ShadowScoreMetadataOnlyStorageMigrationDraftIndex) => index.unique);
  const plannedCheckConstraintCount = sourceMigrationDraftReport.checkConstraintCount;

  const preflightChecks: ShadowScoreMetadataOnlyMigrationRunnerDryRunCheck[] = [
    check(
      'source-migration-draft-is-safe',
      sourceMigrationDraftReport.status !== 'fail' && sourceMigrationDraftReport.migrationMode === 'draft_sql_no_execution',
      'Phase 13H migration draft report must remain draft-only and valid before a dry-run can describe it.',
    ),
    check(
      'sql-file-not-loaded-from-disk',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY.sourceSqlFileIsNotReadFromDisk === true,
      'Phase 13I does not read the .draft.sql file at runtime; it only uses the Phase 13H TypeScript draft report.',
    ),
    check(
      'sql-execution-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY.noDatabaseConnection === true,
      'SQL execution and database connection must remain disabled.',
    ),
    check(
      'table-creation-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY.tableCreationApplied === false &&
        SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY.tableCreated === false,
      'No table creation is applied in the dry-run boundary.',
    ),
    check(
      'metadata-only-constraints-present',
      plannedCheckConstraintCount >= 2 && uniqueIndexes.length >= 3,
      'The future table plan must still include guard/check constraints and idempotency uniqueness design.',
    ),
    check(
      'source-policy-disconnected',
      SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY.canMutateBusinessRecords === false,
      'The source migration draft policy must remain disconnected from model execution, inference, and business mutation.',
    ),
  ];

  if (sourceMigrationDraftReport.columns.length === 0) {
    errors.push(issue('missing_planned_columns', 'Dry-run requires at least one planned metadata-only column.', 'plan.plannedColumns'));
  }

  if (sourceMigrationDraftReport.indexes.length === 0) {
    warnings.push(issue('missing_planned_indexes', 'Dry-run should include index design evidence for future review.', 'plan.plannedIndexes'));
  }

  if (sourceMigrationDraftReport.databaseWriteAllowed !== false || sourceMigrationDraftReport.sqlExecutionAllowed !== false) {
    errors.push(issue('unsafe_source_migration_flags', 'Source migration draft must keep SQL execution and database writes disabled.', 'sourceMigrationDraftReport'));
  }

  const failedChecks = preflightChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_preflight_check', entry.message, `preflightChecks.${entry.name}`)));

  const status = summarizeStatus(sourceMigrationDraftReport.status, preflightChecks, warnings.concat(errors));

  const plan: ShadowScoreMetadataOnlyMigrationRunnerDryRunPlan = {
    tableDraftName: 'shadow_score_metadata_only_store',
    sourceMigrationDraftName: 'phase13h_shadow_score_metadata_only_store_draft',
    sourceSqlDraftFile: 'server/intelligence/mlRuntime/migrationDrafts/phase13h_shadow_score_metadata_only_store.draft.sql',
    plannedColumns: sourceMigrationDraftReport.columns,
    plannedIndexes: sourceMigrationDraftReport.indexes,
    plannedUniqueConstraints: sourceMigrationDraftReport.uniqueness,
    plannedCheckConstraintCount,
    preflightOnly: true,
    sqlTextLoadedFromDisk: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    tableCreationApplied: false,
  };

  return {
    phase: 'Phase 13I',
    dryRunKind: 'guarded_metadata_only_migration_runner_dry_run',
    status,
    sourcePhase: 'Phase 13H',
    sourceMigrationDraftKind: 'metadata_only_shadow_score_storage_migration_draft',
    dryRunMode: 'preflight_only_no_sql_execution',
    migrationRunnerDryRunOnly: true,
    migrationRunnerRegistered: false,
    migrationRunnerOperational: false,
    sqlTextLoadedFromDisk: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    migrationApplicationAllowed: false,
    tableCreationApplied: false,
    routeExposed: false,
    plannedColumnCount: plan.plannedColumns.length,
    plannedIndexCount: plan.plannedIndexes.length,
    plannedUniqueConstraintCount: plan.plannedUniqueConstraints.length,
    plannedCheckConstraintCount,
    preflightCheckCount: preflightChecks.length,
    warningCount: sourceMigrationDraftReport.warningCount + warnings.length,
    errorCount: sourceMigrationDraftReport.errorCount + errors.length,
    warnings: [...sourceMigrationDraftReport.warnings, ...warnings],
    errors: [...sourceMigrationDraftReport.errors, ...errors],
    preflightChecks,
    plan,
    sourceMigrationDraftReport,
    migrationRunnerBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY,
    generatedAt,
  };
};
