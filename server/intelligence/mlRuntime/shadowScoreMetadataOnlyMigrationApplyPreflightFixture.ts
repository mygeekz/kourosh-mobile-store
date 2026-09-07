import {
  buildShadowScoreMetadataOnlyMigrationApplyBoundaryReport,
  SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_BOUNDARY_POLICY,
  type ShadowScoreMetadataOnlyMigrationApplyBoundaryReport,
} from './shadowScoreMetadataOnlyMigrationApplyBoundary';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenarioName =
  | 'allowed_false_baseline'
  | 'blocked_by_missing_explicit_migration_phase'
  | 'blocked_by_failed_dry_run'
  | 'blocked_by_apply_boundary';

export type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureDecision =
  | 'blocked_until_future_explicit_migration_phase'
  | 'blocked_by_missing_explicit_migration_phase'
  | 'blocked_by_failed_dry_run'
  | 'blocked_by_apply_boundary';

export type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenario = {
  readonly name: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenarioName;
  readonly description: string;
  readonly expectedDecision: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureDecision;
  readonly expectedAllowed: false;
  readonly expectedApplyAccepted: false;
  readonly expectedSqlExecutionAllowed: false;
  readonly expectedDatabaseConnectionAllowed: false;
  readonly expectedDatabaseWriteAllowed: false;
  readonly expectedTableCreationApplied: false;
  readonly simulatedState: {
    readonly explicitFutureMigrationPhase: 'present' | 'missing';
    readonly sourceDryRunStatus: 'pass' | 'fail_simulated_fixture_only';
    readonly applyBoundaryStatus: 'pass' | 'fail_simulated_fixture_only';
    readonly requestHandling: 'not_requested' | 'simulated_request_not_accepted';
  };
  readonly requiredBlockers: string[];
};

export type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport = {
  readonly phase: 'Phase 13K';
  readonly fixtureKind: 'metadata_only_migration_apply_preflight_fixture';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13J';
  readonly sourceBoundaryKind: 'guarded_metadata_only_migration_apply_boundary';
  readonly fixtureMode: 'preflight_fixture_only_no_migration_application';
  readonly preflightFixtureOnly: true;
  readonly allowed: false;
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
  readonly scenarioCount: number;
  readonly blockedScenarioCount: number;
  readonly allowedScenarioCount: 0;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
  readonly preflightFixtureChecks: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureCheck[];
  readonly scenarios: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenario[];
  readonly sourceMigrationApplyBoundaryReport: ShadowScoreMetadataOnlyMigrationApplyBoundaryReport;
  readonly fixtureBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY = {
  phase: 'Phase 13K',
  preflightFixtureOnly: true,
  fixtureMode: 'preflight_fixture_only_no_migration_application',
  usesPhase13JApplyBoundaryReportOnly: true,
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
  scenarioFixtureOnly: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY = {
  phase: 'Phase 13K',
  metadataOnly: true,
  preflightFixtureOnly: true,
  scenarioFixtureOnly: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureCheck[],
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail')) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

export const buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenarios = (): ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenario[] => [
  {
    name: 'allowed_false_baseline',
    description: 'Baseline fixture: migration apply remains blocked because Phase 13K only documents preflight expectations.',
    expectedDecision: 'blocked_until_future_explicit_migration_phase',
    expectedAllowed: false,
    expectedApplyAccepted: false,
    expectedSqlExecutionAllowed: false,
    expectedDatabaseConnectionAllowed: false,
    expectedDatabaseWriteAllowed: false,
    expectedTableCreationApplied: false,
    simulatedState: {
      explicitFutureMigrationPhase: 'present',
      sourceDryRunStatus: 'pass',
      applyBoundaryStatus: 'pass',
      requestHandling: 'not_requested',
    },
    requiredBlockers: ['future_explicit_migration_phase_required', 'sql_execution_disabled', 'database_write_disabled'],
  },
  {
    name: 'blocked_by_missing_explicit_migration_phase',
    description: 'Fixture scenario: a migration apply must be blocked when a future explicit migration phase is missing.',
    expectedDecision: 'blocked_by_missing_explicit_migration_phase',
    expectedAllowed: false,
    expectedApplyAccepted: false,
    expectedSqlExecutionAllowed: false,
    expectedDatabaseConnectionAllowed: false,
    expectedDatabaseWriteAllowed: false,
    expectedTableCreationApplied: false,
    simulatedState: {
      explicitFutureMigrationPhase: 'missing',
      sourceDryRunStatus: 'pass',
      applyBoundaryStatus: 'pass',
      requestHandling: 'simulated_request_not_accepted',
    },
    requiredBlockers: ['missing_explicit_migration_phase', 'migration_application_not_allowed', 'migration_request_not_accepted'],
  },
  {
    name: 'blocked_by_failed_dry_run',
    description: 'Fixture scenario: a migration apply must be blocked when the migration dry-run evidence fails.',
    expectedDecision: 'blocked_by_failed_dry_run',
    expectedAllowed: false,
    expectedApplyAccepted: false,
    expectedSqlExecutionAllowed: false,
    expectedDatabaseConnectionAllowed: false,
    expectedDatabaseWriteAllowed: false,
    expectedTableCreationApplied: false,
    simulatedState: {
      explicitFutureMigrationPhase: 'present',
      sourceDryRunStatus: 'fail_simulated_fixture_only',
      applyBoundaryStatus: 'pass',
      requestHandling: 'simulated_request_not_accepted',
    },
    requiredBlockers: ['failed_dry_run_evidence', 'sql_execution_disabled', 'table_creation_disabled'],
  },
  {
    name: 'blocked_by_apply_boundary',
    description: 'Fixture scenario: a migration apply must be blocked when an apply-boundary guard fails.',
    expectedDecision: 'blocked_by_apply_boundary',
    expectedAllowed: false,
    expectedApplyAccepted: false,
    expectedSqlExecutionAllowed: false,
    expectedDatabaseConnectionAllowed: false,
    expectedDatabaseWriteAllowed: false,
    expectedTableCreationApplied: false,
    simulatedState: {
      explicitFutureMigrationPhase: 'present',
      sourceDryRunStatus: 'pass',
      applyBoundaryStatus: 'fail_simulated_fixture_only',
      requestHandling: 'simulated_request_not_accepted',
    },
    requiredBlockers: ['failed_apply_boundary', 'migration_registry_mutation_disabled', 'database_connection_disabled'],
  },
];

export const buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport => {
  const sourceMigrationApplyBoundaryReport = buildShadowScoreMetadataOnlyMigrationApplyBoundaryReport(generatedAt);
  const scenarios = buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenarios();
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const preflightFixtureChecks: ShadowScoreMetadataOnlyMigrationApplyPreflightFixtureCheck[] = [
    check(
      'source-apply-boundary-is-safe',
      sourceMigrationApplyBoundaryReport.status !== 'fail' &&
        sourceMigrationApplyBoundaryReport.boundaryMode === 'safety_gate_only_no_migration_application' &&
        sourceMigrationApplyBoundaryReport.migrationApplicationAllowed === false,
      'Phase 13K requires the Phase 13J apply boundary to remain safe and non-applying.',
    ),
    check(
      'all-scenarios-remain-blocked',
      scenarios.every((scenario) => scenario.expectedAllowed === false && scenario.expectedApplyAccepted === false),
      'Every preflight fixture scenario must remain blocked and must not accept migration apply.',
    ),
    check(
      'sql-and-database-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.noDatabaseWrite === true,
      'SQL execution, database connection, and database writes must remain disabled.',
    ),
    check(
      'fixture-does-not-create-table',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY.tableCreationApplied === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY.tableCreated === false,
      'Phase 13K must not create the metadata-only table.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY.canMutateBusinessRecords === false,
      'Model execution, inference, artifact activation, and business mutation must stay disabled.',
    ),
  ];

  if (scenarios.length < 3) {
    errors.push(issue('missing_preflight_scenarios', 'Phase 13K requires blocked preflight fixture scenarios.', 'scenarios'));
  }

  if (!scenarios.some((scenario) => scenario.name === 'blocked_by_missing_explicit_migration_phase')) {
    errors.push(issue('missing_missing_phase_scenario', 'Preflight fixtures must include the missing explicit migration phase case.', 'scenarios'));
  }

  if (!scenarios.some((scenario) => scenario.name === 'blocked_by_failed_dry_run')) {
    errors.push(issue('missing_failed_dry_run_scenario', 'Preflight fixtures must include the failed dry-run case.', 'scenarios'));
  }

  if (sourceMigrationApplyBoundaryReport.migrationApplicationAllowed !== false || sourceMigrationApplyBoundaryReport.databaseWriteAllowed !== false) {
    errors.push(issue('unsafe_source_apply_boundary_flags', 'Source apply boundary must keep migration application and database writes disabled.', 'sourceMigrationApplyBoundaryReport'));
  }

  const failedChecks = preflightFixtureChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_preflight_fixture_check', entry.message, `preflightFixtureChecks.${entry.name}`)));

  const status = summarizeStatus(sourceMigrationApplyBoundaryReport.status, preflightFixtureChecks, warnings.concat(errors));
  const blockedScenarioCount = scenarios.filter((scenario) => scenario.expectedAllowed === false).length;

  return {
    phase: 'Phase 13K',
    fixtureKind: 'metadata_only_migration_apply_preflight_fixture',
    status,
    sourcePhase: 'Phase 13J',
    sourceBoundaryKind: 'guarded_metadata_only_migration_apply_boundary',
    fixtureMode: 'preflight_fixture_only_no_migration_application',
    preflightFixtureOnly: true,
    allowed: false,
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
    scenarioCount: scenarios.length,
    blockedScenarioCount,
    allowedScenarioCount: 0,
    warningCount: sourceMigrationApplyBoundaryReport.warningCount + warnings.length,
    errorCount: sourceMigrationApplyBoundaryReport.errorCount + errors.length,
    warnings: [...sourceMigrationApplyBoundaryReport.warnings, ...warnings],
    errors: [...sourceMigrationApplyBoundaryReport.errors, ...errors],
    preflightFixtureChecks,
    scenarios,
    sourceMigrationApplyBoundaryReport,
    fixtureBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY,
    generatedAt,
  };
};
