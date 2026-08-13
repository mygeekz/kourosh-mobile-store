import {
  buildShadowScoreMetadataOnlyMigrationRunnerDryRunReport,
  SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY,
  SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY,
  type ShadowScoreMetadataOnlyMigrationRunnerDryRunReport,
} from './shadowScoreMetadataOnlyMigrationRunnerDryRun';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyBoundaryDecision =
  | 'blocked_until_future_explicit_migration_phase'
  | 'blocked_by_failed_preflight'
  | 'blocked_by_safety_boundary';

export type ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyBoundaryPlan = {
  readonly tableDraftName: 'shadow_score_metadata_only_store';
  readonly sourcePhase: 'Phase 13I';
  readonly sourceDryRunKind: 'guarded_metadata_only_migration_runner_dry_run';
  readonly boundaryMode: 'safety_gate_only_no_migration_application';
  readonly plannedColumnCount: number;
  readonly plannedIndexCount: number;
  readonly plannedUniqueConstraintCount: number;
  readonly plannedCheckConstraintCount: number;
  readonly preflightCheckCount: number;
  readonly applyGateCheckCount: number;
  readonly futureApplyPrerequisites: string[];
  readonly migrationApplicationAllowed: false;
  readonly migrationApplyDecision: ShadowScoreMetadataOnlyMigrationApplyBoundaryDecision;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly tableCreationApplied: false;
  readonly migrationRunnerRegistered: false;
  readonly migrationRunnerOperational: false;
  readonly migrationRegistryMutated: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyBoundaryReport = {
  readonly phase: 'Phase 13J';
  readonly boundaryKind: 'guarded_metadata_only_migration_apply_boundary';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13I';
  readonly sourceDryRunKind: 'guarded_metadata_only_migration_runner_dry_run';
  readonly boundaryMode: 'safety_gate_only_no_migration_application';
  readonly applyBoundaryOnly: true;
  readonly migrationApplyRequested: false;
  readonly migrationApplyAccepted: false;
  readonly migrationApplyDecision: ShadowScoreMetadataOnlyMigrationApplyBoundaryDecision;
  readonly migrationApplicationAllowed: false;
  readonly migrationApplicationPerformed: false;
  readonly migrationRunnerRegistered: false;
  readonly migrationRunnerOperational: false;
  readonly migrationRegistryMutated: false;
  readonly sqlTextLoadedFromDisk: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly tableCreationApplied: false;
  readonly tableCreated: false;
  readonly repositoryWriteAllowed: false;
  readonly routeExposed: false;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly applyBoundaryChecks: ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck[];
  readonly applyBoundaryPlan: ShadowScoreMetadataOnlyMigrationApplyBoundaryPlan;
  readonly sourceMigrationRunnerDryRunReport: ShadowScoreMetadataOnlyMigrationRunnerDryRunReport;
  readonly applyBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY = {
  phase: 'Phase 13J',
  applyBoundaryOnly: true,
  safetyGateOnly: true,
  boundaryMode: 'safety_gate_only_no_migration_application',
  requiresPhase13HDraft: true,
  requiresPhase13IDryRun: true,
  migrationApplyRequested: false,
  migrationApplyAccepted: false,
  migrationApplyDecision: 'blocked_until_future_explicit_migration_phase',
  migrationApplicationAllowed: false,
  migrationApplicationPerformed: false,
  migrationRunnerRegistered: false,
  migrationRunnerOperational: false,
  migrationRegistryMutated: false,
  migrationRegistryWriteAllowed: false,
  sqlTextLoadedFromDisk: false,
  sqlFileIsNotReadFromDisk: true,
  sqlFileIsNotExecuted: true,
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
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY = {
  phase: 'Phase 13J',
  metadataOnly: true,
  applyBoundaryOnly: true,
  safetyGateOnly: true,
  noSqlFileRuntimeRead: true,
  noRuntimeSqlExecution: true,
  noDatabaseConnection: true,
  noDatabaseWrite: true,
  noTableCreated: true,
  noMigrationRegistryMutation: true,
  noMigrationApplication: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck[],
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail')) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const resolveApplyDecision = (
  sourceReport: ShadowScoreMetadataOnlyMigrationRunnerDryRunReport,
  boundaryChecks: ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck[],
): ShadowScoreMetadataOnlyMigrationApplyBoundaryDecision => {
  if (sourceReport.status === 'fail') return 'blocked_by_failed_preflight';
  if (boundaryChecks.some((entry) => entry.status === 'fail')) return 'blocked_by_safety_boundary';
  return 'blocked_until_future_explicit_migration_phase';
};

export const buildShadowScoreMetadataOnlyMigrationApplyBoundaryReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyBoundaryReport => {
  const sourceMigrationRunnerDryRunReport = buildShadowScoreMetadataOnlyMigrationRunnerDryRunReport(generatedAt);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const applyBoundaryChecks: ShadowScoreMetadataOnlyMigrationApplyBoundaryCheck[] = [
    check(
      'source-dry-run-is-safe',
      sourceMigrationRunnerDryRunReport.status !== 'fail' &&
        sourceMigrationRunnerDryRunReport.dryRunMode === 'preflight_only_no_sql_execution' &&
        sourceMigrationRunnerDryRunReport.migrationRunnerRegistered === false,
      'Phase 13J requires the Phase 13I dry-run to remain safe, preflight-only, and unregistered.',
    ),
    check(
      'apply-request-is-not-accepted',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.migrationApplyRequested === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.migrationApplyAccepted === false,
      'Phase 13J defines the apply gate boundary but does not accept a migration application request.',
    ),
    check(
      'sql-and-database-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.noDatabaseWrite === true,
      'SQL execution, database connection, and database writes must remain disabled.',
    ),
    check(
      'migration-registry-not-mutated',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.migrationRunnerRegistered === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.migrationRegistryMutated === false,
      'No migration runner registration or migration registry mutation is allowed in Phase 13J.',
    ),
    check(
      'table-creation-not-applied',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.tableCreationApplied === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY.tableCreated === false,
      'The metadata-only table is not created in Phase 13J.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY.canMutateBusinessRecords === false,
      'Model execution, inference, artifact activation, and business mutation must stay disabled.',
    ),
  ];

  if (sourceMigrationRunnerDryRunReport.plannedColumnCount === 0) {
    errors.push(issue('missing_source_columns', 'Apply boundary requires a non-empty Phase 13I dry-run plan.', 'sourceMigrationRunnerDryRunReport.plannedColumnCount'));
  }

  if (sourceMigrationRunnerDryRunReport.migrationApplicationAllowed !== false || sourceMigrationRunnerDryRunReport.databaseWriteAllowed !== false) {
    errors.push(issue('unsafe_source_dry_run_flags', 'Source dry-run must keep migration application and database writes disabled.', 'sourceMigrationRunnerDryRunReport'));
  }

  const failedChecks = applyBoundaryChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_apply_boundary_check', entry.message, `applyBoundaryChecks.${entry.name}`)));

  const migrationApplyDecision = resolveApplyDecision(sourceMigrationRunnerDryRunReport, applyBoundaryChecks);
  const status = summarizeStatus(sourceMigrationRunnerDryRunReport.status, applyBoundaryChecks, warnings.concat(errors));

  const applyBoundaryPlan: ShadowScoreMetadataOnlyMigrationApplyBoundaryPlan = {
    tableDraftName: 'shadow_score_metadata_only_store',
    sourcePhase: 'Phase 13I',
    sourceDryRunKind: 'guarded_metadata_only_migration_runner_dry_run',
    boundaryMode: 'safety_gate_only_no_migration_application',
    plannedColumnCount: sourceMigrationRunnerDryRunReport.plannedColumnCount,
    plannedIndexCount: sourceMigrationRunnerDryRunReport.plannedIndexCount,
    plannedUniqueConstraintCount: sourceMigrationRunnerDryRunReport.plannedUniqueConstraintCount,
    plannedCheckConstraintCount: sourceMigrationRunnerDryRunReport.plannedCheckConstraintCount,
    preflightCheckCount: sourceMigrationRunnerDryRunReport.preflightCheckCount,
    applyGateCheckCount: applyBoundaryChecks.length,
    futureApplyPrerequisites: [
      'explicit_future_phase_authorization',
      'separate_migration_runner_implementation',
      'separate_database_connection_boundary',
      'separate_no_inference_no_mutation_guard',
      'separate_rollback_and_idempotency_review',
    ],
    migrationApplicationAllowed: false,
    migrationApplyDecision,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    tableCreationApplied: false,
    migrationRunnerRegistered: false,
    migrationRunnerOperational: false,
    migrationRegistryMutated: false,
  };

  return {
    phase: 'Phase 13J',
    boundaryKind: 'guarded_metadata_only_migration_apply_boundary',
    status,
    sourcePhase: 'Phase 13I',
    sourceDryRunKind: 'guarded_metadata_only_migration_runner_dry_run',
    boundaryMode: 'safety_gate_only_no_migration_application',
    applyBoundaryOnly: true,
    migrationApplyRequested: false,
    migrationApplyAccepted: false,
    migrationApplyDecision,
    migrationApplicationAllowed: false,
    migrationApplicationPerformed: false,
    migrationRunnerRegistered: false,
    migrationRunnerOperational: false,
    migrationRegistryMutated: false,
    sqlTextLoadedFromDisk: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    tableCreationApplied: false,
    tableCreated: false,
    repositoryWriteAllowed: false,
    routeExposed: false,
    warningCount: sourceMigrationRunnerDryRunReport.warningCount + warnings.length,
    errorCount: sourceMigrationRunnerDryRunReport.errorCount + errors.length,
    warnings: [...sourceMigrationRunnerDryRunReport.warnings, ...warnings],
    errors: [...sourceMigrationRunnerDryRunReport.errors, ...errors],
    applyBoundaryChecks,
    applyBoundaryPlan,
    sourceMigrationRunnerDryRunReport,
    applyBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY,
    generatedAt,
  };
};
