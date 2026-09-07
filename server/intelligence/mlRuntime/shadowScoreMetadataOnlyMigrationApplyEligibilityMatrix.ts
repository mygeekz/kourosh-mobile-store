import {
  buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport,
  SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY,
  SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY,
  type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport,
} from './shadowScoreMetadataOnlyMigrationApplyPreflightFixture';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRowName =
  | 'current_phase_design_only'
  | 'missing_explicit_migration_phase'
  | 'failed_migration_runner_dry_run'
  | 'failed_apply_boundary'
  | 'failed_preflight_fixture'
  | 'missing_sql_execution_authorization'
  | 'missing_database_connection_authorization'
  | 'missing_database_write_authorization'
  | 'missing_migration_registry_authorization'
  | 'all_documented_preconditions_but_apply_still_disabled';

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityDecision =
  | 'blocked_phase_design_only'
  | 'blocked_missing_explicit_migration_phase'
  | 'blocked_failed_migration_runner_dry_run'
  | 'blocked_failed_apply_boundary'
  | 'blocked_failed_preflight_fixture'
  | 'blocked_sql_execution_not_authorized'
  | 'blocked_database_connection_not_authorized'
  | 'blocked_database_write_not_authorized'
  | 'blocked_migration_registry_not_authorized'
  | 'blocked_until_future_explicit_migration_apply_phase';

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityStatus = 'blocked';

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow = {
  readonly name: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRowName;
  readonly description: string;
  readonly eligibilityStatus: ShadowScoreMetadataOnlyMigrationApplyEligibilityStatus;
  readonly eligibilityDecision: ShadowScoreMetadataOnlyMigrationApplyEligibilityDecision;
  readonly requiredPreconditions: string[];
  readonly satisfiedPreconditions: string[];
  readonly missingPreconditions: string[];
  readonly blockers: string[];
  readonly migrationApplyAccepted: false;
  readonly migrationApplicationAllowed: false;
  readonly migrationApplicationPerformed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly migrationRunnerRegistered: false;
  readonly migrationRegistryMutated: false;
  readonly tableCreationApplied: false;
  readonly repositoryWriteAllowed: false;
  readonly routeExposed: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport = {
  readonly phase: 'Phase 13L';
  readonly matrixKind: 'metadata_only_migration_apply_eligibility_matrix';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13K';
  readonly sourceFixtureKind: 'metadata_only_migration_apply_preflight_fixture';
  readonly matrixMode: 'eligibility_matrix_only_no_migration_application';
  readonly eligibilityMatrixOnly: true;
  readonly allowed: false;
  readonly eligibleScenarioCount: 0;
  readonly blockedScenarioCount: number;
  readonly matrixRowCount: number;
  readonly migrationApplyAccepted: false;
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
  readonly eligibilityChecks: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixCheck[];
  readonly matrixRows: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow[];
  readonly sourcePreflightFixtureReport: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport;
  readonly eligibilityBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY = {
  phase: 'Phase 13L',
  eligibilityMatrixOnly: true,
  matrixMode: 'eligibility_matrix_only_no_migration_application',
  usesPhase13KPreflightFixtureOnly: true,
  doesNotReadSqlDraftFileFromDisk: true,
  sqlTextLoadedFromDisk: false,
  doesNotExecuteSql: true,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  migrationApplyAccepted: false,
  migrationApplicationAllowed: false,
  migrationApplicationPerformed: false,
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
  allRowsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY = {
  phase: 'Phase 13L',
  metadataOnly: true,
  eligibilityMatrixOnly: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixCheck[],
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail')) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const REQUIRED_PRECONDITIONS = [
  'explicit_future_migration_apply_phase_declared',
  'phase13h_migration_draft_available',
  'phase13i_migration_runner_dry_run_passed',
  'phase13j_apply_boundary_passed',
  'phase13k_preflight_fixture_passed',
  'sql_execution_authorization_present',
  'database_connection_authorization_present',
  'database_write_authorization_present',
  'migration_registry_authorization_present',
  'business_mutation_boundary_confirmed_false',
] as const;

const blockedRow = (
  name: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRowName,
  description: string,
  eligibilityDecision: ShadowScoreMetadataOnlyMigrationApplyEligibilityDecision,
  satisfiedPreconditions: string[],
  missingPreconditions: string[],
  blockers: string[],
): ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow => ({
  name,
  description,
  eligibilityStatus: 'blocked',
  eligibilityDecision,
  requiredPreconditions: [...REQUIRED_PRECONDITIONS],
  satisfiedPreconditions,
  missingPreconditions,
  blockers,
  migrationApplyAccepted: false,
  migrationApplicationAllowed: false,
  migrationApplicationPerformed: false,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  migrationRunnerRegistered: false,
  migrationRegistryMutated: false,
  tableCreationApplied: false,
  repositoryWriteAllowed: false,
  routeExposed: false,
});

export const buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRows = (): ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow[] => {
  const baseSatisfied = [
    'phase13h_migration_draft_available',
    'phase13i_migration_runner_dry_run_passed',
    'phase13j_apply_boundary_passed',
    'phase13k_preflight_fixture_passed',
    'business_mutation_boundary_confirmed_false',
  ];

  return [
    blockedRow(
      'current_phase_design_only',
      'Current phase is an eligibility matrix only. It documents the future apply gate and remains blocked.',
      'blocked_phase_design_only',
      baseSatisfied,
      [
        'explicit_future_migration_apply_phase_declared',
        'sql_execution_authorization_present',
        'database_connection_authorization_present',
        'database_write_authorization_present',
        'migration_registry_authorization_present',
      ],
      ['phase13l_is_matrix_only', 'migration_application_not_allowed', 'sql_execution_disabled'],
    ),
    blockedRow(
      'missing_explicit_migration_phase',
      'Migration apply is blocked when a future explicit migration phase has not been declared.',
      'blocked_missing_explicit_migration_phase',
      baseSatisfied,
      ['explicit_future_migration_apply_phase_declared'],
      ['missing_explicit_migration_phase', 'migration_request_not_accepted'],
    ),
    blockedRow(
      'failed_migration_runner_dry_run',
      'Migration apply is blocked when the Phase 13I runner dry-run evidence is not passing.',
      'blocked_failed_migration_runner_dry_run',
      ['phase13h_migration_draft_available', 'phase13j_apply_boundary_passed', 'phase13k_preflight_fixture_passed'],
      ['phase13i_migration_runner_dry_run_passed'],
      ['failed_migration_runner_dry_run', 'table_creation_disabled'],
    ),
    blockedRow(
      'failed_apply_boundary',
      'Migration apply is blocked when the Phase 13J apply-boundary evidence is not passing.',
      'blocked_failed_apply_boundary',
      ['phase13h_migration_draft_available', 'phase13i_migration_runner_dry_run_passed', 'phase13k_preflight_fixture_passed'],
      ['phase13j_apply_boundary_passed'],
      ['failed_apply_boundary', 'migration_application_not_allowed'],
    ),
    blockedRow(
      'failed_preflight_fixture',
      'Migration apply is blocked when Phase 13K preflight fixture evidence is not passing.',
      'blocked_failed_preflight_fixture',
      ['phase13h_migration_draft_available', 'phase13i_migration_runner_dry_run_passed', 'phase13j_apply_boundary_passed'],
      ['phase13k_preflight_fixture_passed'],
      ['failed_preflight_fixture', 'eligibility_evidence_incomplete'],
    ),
    blockedRow(
      'missing_sql_execution_authorization',
      'Migration apply remains blocked unless a future explicit phase authorizes SQL execution.',
      'blocked_sql_execution_not_authorized',
      baseSatisfied.concat(['explicit_future_migration_apply_phase_declared']),
      ['sql_execution_authorization_present'],
      ['sql_execution_disabled', 'sql_execution_authorization_absent'],
    ),
    blockedRow(
      'missing_database_connection_authorization',
      'Migration apply remains blocked unless a future explicit phase authorizes a database connection.',
      'blocked_database_connection_not_authorized',
      baseSatisfied.concat(['explicit_future_migration_apply_phase_declared', 'sql_execution_authorization_present']),
      ['database_connection_authorization_present'],
      ['database_connection_disabled', 'database_connection_authorization_absent'],
    ),
    blockedRow(
      'missing_database_write_authorization',
      'Migration apply remains blocked unless a future explicit phase authorizes database writes.',
      'blocked_database_write_not_authorized',
      baseSatisfied.concat([
        'explicit_future_migration_apply_phase_declared',
        'sql_execution_authorization_present',
        'database_connection_authorization_present',
      ]),
      ['database_write_authorization_present'],
      ['database_write_disabled', 'database_write_authorization_absent'],
    ),
    blockedRow(
      'missing_migration_registry_authorization',
      'Migration apply remains blocked unless a future explicit phase authorizes migration registry mutation.',
      'blocked_migration_registry_not_authorized',
      baseSatisfied.concat([
        'explicit_future_migration_apply_phase_declared',
        'sql_execution_authorization_present',
        'database_connection_authorization_present',
        'database_write_authorization_present',
      ]),
      ['migration_registry_authorization_present'],
      ['migration_registry_mutation_disabled', 'migration_registry_authorization_absent'],
    ),
    blockedRow(
      'all_documented_preconditions_but_apply_still_disabled',
      'Even when all documented evidence is present in this matrix, apply remains blocked because Phase 13L does not authorize execution.',
      'blocked_until_future_explicit_migration_apply_phase',
      [...REQUIRED_PRECONDITIONS],
      [],
      ['phase13l_never_applies_migration', 'migration_application_allowed_false', 'table_creation_disabled'],
    ),
  ];
};

export const buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport => {
  const sourcePreflightFixtureReport = buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport(generatedAt);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const matrixRows = buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRows();

  const eligibilityChecks: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixCheck[] = [
    check(
      'source-preflight-fixture-is-safe',
      sourcePreflightFixtureReport.status !== 'fail' &&
        sourcePreflightFixtureReport.fixtureMode === 'preflight_fixture_only_no_migration_application' &&
        sourcePreflightFixtureReport.allowed === false,
      'Phase 13L requires the Phase 13K preflight fixture to remain safe, blocked, and fixture-only.',
    ),
    check(
      'matrix-rows-remain-blocked',
      matrixRows.length > 0 && matrixRows.every((row) => row.eligibilityStatus === 'blocked' && row.migrationApplicationAllowed === false),
      'Every eligibility matrix row must remain blocked in Phase 13L.',
    ),
    check(
      'sql-and-database-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.noDatabaseWrite === true,
      'SQL execution, database connection, and database writes must remain disabled.',
    ),
    check(
      'migration-registry-not-mutated',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY.migrationRunnerRegistered === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY.migrationRegistryMutated === false,
      'No migration runner registration or migration registry mutation is allowed in Phase 13L.',
    ),
    check(
      'table-creation-not-applied',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY.tableCreationApplied === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY.tableCreated === false,
      'The metadata-only table is not created in Phase 13L.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (matrixRows.length < 5) {
    errors.push(issue('insufficient_matrix_rows', 'Eligibility matrix must include multiple blocked precondition rows.', 'matrixRows'));
  }

  if (matrixRows.some((row) => row.migrationApplicationAllowed !== false || row.sqlExecutionAllowed !== false || row.databaseWriteAllowed !== false)) {
    errors.push(issue('unsafe_matrix_row', 'Every matrix row must keep apply, SQL execution, and database writes disabled.', 'matrixRows'));
  }

  const failedChecks = eligibilityChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_eligibility_check', entry.message, `eligibilityChecks.${entry.name}`)));

  const status = summarizeStatus(sourcePreflightFixtureReport.status, eligibilityChecks, warnings.concat(errors));

  return {
    phase: 'Phase 13L',
    matrixKind: 'metadata_only_migration_apply_eligibility_matrix',
    status,
    sourcePhase: 'Phase 13K',
    sourceFixtureKind: 'metadata_only_migration_apply_preflight_fixture',
    matrixMode: 'eligibility_matrix_only_no_migration_application',
    eligibilityMatrixOnly: true,
    allowed: false,
    eligibleScenarioCount: 0,
    blockedScenarioCount: matrixRows.length,
    matrixRowCount: matrixRows.length,
    migrationApplyAccepted: false,
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
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
    eligibilityChecks,
    matrixRows,
    sourcePreflightFixtureReport,
    eligibilityBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY,
    generatedAt,
  };
};
