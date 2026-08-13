import {
  buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind,
} from './shadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixture';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyRegressionFixtureCoverageKind =
  | 'stable_safe_noop_regression'
  | 'unstable_but_blocked_regression'
  | 'unsafe_boundary_drift_regression'
  | 'sql_execution_boundary'
  | 'database_connection_boundary'
  | 'database_write_boundary'
  | 'migration_registry_boundary'
  | 'route_exposure_boundary'
  | 'model_execution_boundary'
  | 'artifact_activation_boundary'
  | 'business_mutation_boundary'
  | 'workbench_output_file_runtime_read_boundary'
  | 'ui_governance_freeze_boundary';

export type ShadowScoreMetadataOnlyRegressionFixtureCoverageClass = 'regression_fixture_covered' | 'documented_only_boundary';

export type ShadowScoreMetadataOnlyRegressionFixtureCoverageRow = {
  readonly coverageId: string;
  readonly coverageKind: ShadowScoreMetadataOnlyRegressionFixtureCoverageKind;
  readonly coverageClass: ShadowScoreMetadataOnlyRegressionFixtureCoverageClass;
  readonly sourcePhase: 'Phase 13T';
  readonly sourceFixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture';
  readonly relatedScenarioKind: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind | null;
  readonly description: string;
  readonly coveredByRegressionFixture: boolean;
  readonly documentedOnly: boolean;
  readonly requiredForFutureMigrationApply: boolean;
  readonly actionable: false;
  readonly allowed: false;
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly tableCreated: false;
  readonly routeExposed: false;
  readonly modelExecutionAllowed: false;
  readonly artifactActivationAllowed: false;
  readonly canMutateBusinessRecords: false;
  readonly evidenceOnly: true;
  readonly metadataOnly: true;
};

export type ShadowScoreMetadataOnlyRegressionFixtureCoverageCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyRegressionFixtureCoverageSummaryReport = {
  readonly phase: 'Phase 13U';
  readonly summaryKind: 'metadata_only_regression_fixture_coverage_summary';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13T';
  readonly sourceFixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture';
  readonly summaryMode: 'coverage_summary_only_no_migration_application';
  readonly coverageSummaryOnly: true;
  readonly evidenceOnly: true;
  readonly metadataOnly: true;
  readonly deterministicRuleBasedOnly: true;
  readonly noMlClassifier: true;
  readonly boundaryCount: number;
  readonly regressionFixtureCoveredBoundaryCount: number;
  readonly documentedOnlyBoundaryCount: number;
  readonly uncoveredBoundaryCount: number;
  readonly actionableBoundaryCount: number;
  readonly migrationAllowedBoundaryCount: number;
  readonly sqlAllowedBoundaryCount: number;
  readonly databaseWriteAllowedBoundaryCount: number;
  readonly routeExposedBoundaryCount: number;
  readonly unsafeBoundaryCount: number;
  readonly coverageComplete: boolean;
  readonly coverageSummaryValidated: boolean;
  readonly sourceScenarioCount: number;
  readonly sourceBlockedScenarioCount: number;
  readonly sourceRegressionFixtureValidated: boolean;
  readonly sourceUnsafeMigrationAllowedScenarioCount: number;
  readonly coveredScenarioKinds: readonly ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind[];
  readonly documentedOnlyBoundaryKinds: readonly ShadowScoreMetadataOnlyRegressionFixtureCoverageKind[];
  readonly operatorApproved: false;
  readonly allowed: false;
  readonly ready: false;
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
  readonly coverageChecks: ShadowScoreMetadataOnlyRegressionFixtureCoverageCheck[];
  readonly coverageRows: ShadowScoreMetadataOnlyRegressionFixtureCoverageRow[];
  readonly coverageBoundary: typeof SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_BOUNDARY = {
  phase: 'Phase 13U',
  coverageSummaryOnly: true,
  summaryMode: 'coverage_summary_only_no_migration_application',
  usesPhase13TRegressionFixtureOnly: true,
  summarizesRegressionCoverageInMemoryOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  doesNotReadRegressionFixtureJsonFromDisk: true,
  doesNotReadStabilitySnapshotJsonFromDisk: true,
  doesNotReadDriftClassifierSnapshotFromDisk: true,
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
  allCoverageRowsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY = {
  phase: 'Phase 13U',
  metadataOnly: true,
  coverageSummaryOnly: true,
  evidenceOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  noRegressionFixtureFileRuntimeRead: true,
  noStabilitySnapshotFileRuntimeRead: true,
  noDriftClassifierSnapshotFileRuntimeRead: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyRegressionFixtureCoverageCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  checks: readonly ShadowScoreMetadataOnlyRegressionFixtureCoverageCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const blockedCoverageBase = {
  actionable: false,
  allowed: false,
  migrationApplicationAllowed: false,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  tableCreated: false,
  routeExposed: false,
  modelExecutionAllowed: false,
  artifactActivationAllowed: false,
  canMutateBusinessRecords: false,
  evidenceOnly: true,
  metadataOnly: true,
} as const;

const buildCoveredRow = (
  coverageId: string,
  coverageKind: ShadowScoreMetadataOnlyRegressionFixtureCoverageKind,
  relatedScenarioKind: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind,
  description: string,
): ShadowScoreMetadataOnlyRegressionFixtureCoverageRow => ({
  coverageId,
  coverageKind,
  coverageClass: 'regression_fixture_covered',
  sourcePhase: 'Phase 13T',
  sourceFixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture',
  relatedScenarioKind,
  description,
  coveredByRegressionFixture: true,
  documentedOnly: false,
  requiredForFutureMigrationApply: true,
  ...blockedCoverageBase,
});

const buildDocumentedOnlyRow = (
  coverageId: string,
  coverageKind: ShadowScoreMetadataOnlyRegressionFixtureCoverageKind,
  description: string,
): ShadowScoreMetadataOnlyRegressionFixtureCoverageRow => ({
  coverageId,
  coverageKind,
  coverageClass: 'documented_only_boundary',
  sourcePhase: 'Phase 13T',
  sourceFixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture',
  relatedScenarioKind: null,
  description,
  coveredByRegressionFixture: false,
  documentedOnly: true,
  requiredForFutureMigrationApply: true,
  ...blockedCoverageBase,
});

const buildCoverageRows = (
  sourceFixture: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport,
): ShadowScoreMetadataOnlyRegressionFixtureCoverageRow[] => {
  const sourceScenarioKinds = new Set(sourceFixture.regressionScenarios.map((scenario) => scenario.scenarioKind));
  return [
    buildCoveredRow(
      'coverage_stable_safe_noop_regression',
      'stable_safe_noop_regression',
      'stable_safe_noop',
      sourceScenarioKinds.has('stable_safe_noop')
        ? 'Stable safe noop regression scenario is covered by the Phase 13T fixture.'
        : 'Stable safe noop regression scenario is expected but missing.',
    ),
    buildCoveredRow(
      'coverage_unstable_but_blocked_regression',
      'unstable_but_blocked_regression',
      'unstable_but_blocked',
      sourceScenarioKinds.has('unstable_but_blocked')
        ? 'Unstable but blocked regression scenario is covered by the Phase 13T fixture.'
        : 'Unstable but blocked regression scenario is expected but missing.',
    ),
    buildCoveredRow(
      'coverage_unsafe_boundary_drift_regression',
      'unsafe_boundary_drift_regression',
      'unsafe_boundary_drift',
      sourceScenarioKinds.has('unsafe_boundary_drift')
        ? 'Unsafe boundary drift regression scenario is covered by the Phase 13T fixture and remains blocked.'
        : 'Unsafe boundary drift regression scenario is expected but missing.',
    ),
    buildDocumentedOnlyRow('coverage_sql_execution_boundary', 'sql_execution_boundary', 'SQL execution remains documented-only and is not covered by an executable regression fixture.'),
    buildDocumentedOnlyRow('coverage_database_connection_boundary', 'database_connection_boundary', 'Database connection remains documented-only and is not opened by regression fixtures.'),
    buildDocumentedOnlyRow('coverage_database_write_boundary', 'database_write_boundary', 'Database write remains documented-only and is not performed by regression fixtures.'),
    buildDocumentedOnlyRow('coverage_migration_registry_boundary', 'migration_registry_boundary', 'Migration registry mutation remains documented-only and is not performed by regression fixtures.'),
    buildDocumentedOnlyRow('coverage_route_exposure_boundary', 'route_exposure_boundary', 'Backend route exposure remains documented-only and no route fixture is added.'),
    buildDocumentedOnlyRow('coverage_model_execution_boundary', 'model_execution_boundary', 'Backend model execution remains documented-only and disconnected.'),
    buildDocumentedOnlyRow('coverage_artifact_activation_boundary', 'artifact_activation_boundary', 'Artifact activation remains documented-only and blocked.'),
    buildDocumentedOnlyRow('coverage_business_mutation_boundary', 'business_mutation_boundary', 'Business mutation remains documented-only and blocked.'),
    buildDocumentedOnlyRow('coverage_workbench_output_file_runtime_read_boundary', 'workbench_output_file_runtime_read_boundary', 'Workbench output file runtime reads remain documented-only and blocked in backend code.'),
    buildDocumentedOnlyRow('coverage_ui_governance_freeze_boundary', 'ui_governance_freeze_boundary', 'UI and governance expansion freeze remains documented-only and unchanged.'),
  ];
};

export const buildShadowScoreMetadataOnlyRegressionFixtureCoverageSummaryReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyRegressionFixtureCoverageSummaryReport => {
  const sourceFixture = buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport(generatedAt);
  const coverageRows = buildCoverageRows(sourceFixture);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const boundaryCount = coverageRows.length;
  const regressionFixtureCoveredBoundaryCount = coverageRows.filter((row) => row.coveredByRegressionFixture).length;
  const documentedOnlyBoundaryCount = coverageRows.filter((row) => row.documentedOnly).length;
  const uncoveredBoundaryCount = coverageRows.filter((row) => !row.coveredByRegressionFixture && !row.documentedOnly).length;
  const actionableBoundaryCount = coverageRows.filter((row) => (row.actionable as boolean) === true).length;
  const migrationAllowedBoundaryCount = coverageRows.filter((row) => (row.migrationApplicationAllowed as boolean) === true).length;
  const sqlAllowedBoundaryCount = coverageRows.filter((row) => (row.sqlExecutionAllowed as boolean) === true).length;
  const databaseWriteAllowedBoundaryCount = coverageRows.filter((row) => (row.databaseWriteAllowed as boolean) === true).length;
  const routeExposedBoundaryCount = coverageRows.filter((row) => (row.routeExposed as boolean) === true).length;
  const unsafeBoundaryCount = coverageRows.filter(
    (row) =>
      row.migrationApplicationAllowed ||
      row.sqlExecutionAllowed ||
      row.databaseConnectionAllowed ||
      row.databaseWriteAllowed ||
      row.routeExposed ||
      row.modelExecutionAllowed ||
      row.artifactActivationAllowed ||
      row.canMutateBusinessRecords,
  ).length;
  const coveredScenarioKinds = coverageRows
    .filter((row) => row.coveredByRegressionFixture && row.relatedScenarioKind !== null)
    .map((row) => row.relatedScenarioKind as ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind);
  const documentedOnlyBoundaryKinds = coverageRows.filter((row) => row.documentedOnly).map((row) => row.coverageKind);
  const coverageComplete =
    boundaryCount === 13 &&
    regressionFixtureCoveredBoundaryCount === 3 &&
    documentedOnlyBoundaryCount === 10 &&
    uncoveredBoundaryCount === 0 &&
    actionableBoundaryCount === 0 &&
    migrationAllowedBoundaryCount === 0 &&
    sqlAllowedBoundaryCount === 0 &&
    databaseWriteAllowedBoundaryCount === 0 &&
    routeExposedBoundaryCount === 0 &&
    unsafeBoundaryCount === 0 &&
    sourceFixture.regressionFixtureValidated === true &&
    sourceFixture.unsafeMigrationAllowedScenarioCount === 0;

  const coverageChecks: ShadowScoreMetadataOnlyRegressionFixtureCoverageCheck[] = [
    check(
      'coverage-summary-covers-required-boundaries',
      boundaryCount === 13 && regressionFixtureCoveredBoundaryCount === 3 && documentedOnlyBoundaryCount === 10 && uncoveredBoundaryCount === 0,
      'Phase 13U must account for every required regression fixture boundary as covered or documented-only.',
    ),
    check(
      'covered-boundaries-map-to-phase13t-regression-scenarios',
      coveredScenarioKinds.includes('stable_safe_noop') && coveredScenarioKinds.includes('unstable_but_blocked') && coveredScenarioKinds.includes('unsafe_boundary_drift'),
      'Coverage rows must include all Phase 13T regression scenarios.',
    ),
    check(
      'documented-only-boundaries-remain-non-executable',
      documentedOnlyBoundaryCount === 10 && migrationAllowedBoundaryCount === 0 && sqlAllowedBoundaryCount === 0 && databaseWriteAllowedBoundaryCount === 0 && routeExposedBoundaryCount === 0,
      'Documented-only boundaries must remain blocked and non-executable.',
    ),
    check(
      'source-regression-fixture-remains-valid',
      sourceFixture.regressionFixtureValidated === true && sourceFixture.allScenariosBlocked === true && sourceFixture.unsafeMigrationAllowedScenarioCount === 0,
      'The Phase 13T source regression fixture must remain valid, blocked, and unable to allow unsafe migration.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (!coverageComplete) {
    errors.push(issue('coverage_summary_not_complete', 'Phase 13U coverage summary must account for all required boundaries while keeping them blocked.', 'coverageRows'));
  }

  const failedChecks = coverageChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_coverage_summary_check', entry.message, `coverageChecks.${entry.name}`)));

  const status = summarizeStatus(coverageChecks, warnings, errors);

  return {
    phase: 'Phase 13U',
    summaryKind: 'metadata_only_regression_fixture_coverage_summary',
    status,
    sourcePhase: 'Phase 13T',
    sourceFixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture',
    summaryMode: 'coverage_summary_only_no_migration_application',
    coverageSummaryOnly: true,
    evidenceOnly: true,
    metadataOnly: true,
    deterministicRuleBasedOnly: true,
    noMlClassifier: true,
    boundaryCount,
    regressionFixtureCoveredBoundaryCount,
    documentedOnlyBoundaryCount,
    uncoveredBoundaryCount,
    actionableBoundaryCount,
    migrationAllowedBoundaryCount,
    sqlAllowedBoundaryCount,
    databaseWriteAllowedBoundaryCount,
    routeExposedBoundaryCount,
    unsafeBoundaryCount,
    coverageComplete,
    coverageSummaryValidated: coverageComplete,
    sourceScenarioCount: sourceFixture.scenarioCount,
    sourceBlockedScenarioCount: sourceFixture.blockedScenarioCount,
    sourceRegressionFixtureValidated: sourceFixture.regressionFixtureValidated,
    sourceUnsafeMigrationAllowedScenarioCount: sourceFixture.unsafeMigrationAllowedScenarioCount,
    coveredScenarioKinds,
    documentedOnlyBoundaryKinds,
    operatorApproved: false,
    allowed: false,
    ready: false,
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
    coverageChecks,
    coverageRows,
    coverageBoundary: SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_REGRESSION_FIXTURE_COVERAGE_SUMMARY_POLICY,
    generatedAt,
  };
};
