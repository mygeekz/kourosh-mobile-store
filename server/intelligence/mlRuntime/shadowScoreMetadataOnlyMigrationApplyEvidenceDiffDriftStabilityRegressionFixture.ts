import {
  buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport,
} from './shadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshot';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind =
  | 'stable_safe_noop'
  | 'unstable_but_blocked'
  | 'unsafe_boundary_drift';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionExpectedOutcome =
  | 'stable_blocked_noop'
  | 'blocked_instability_detected'
  | 'blocked_unsafe_boundary_detected';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenario = {
  readonly scenarioId: string;
  readonly scenarioKind: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenarioKind;
  readonly description: string;
  readonly sourcePhase: 'Phase 13S';
  readonly sourceSnapshotKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_snapshot';
  readonly expectedOutcome: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionExpectedOutcome;
  readonly scenarioStatus: 'pass' | 'warning' | 'fail';
  readonly stable: boolean;
  readonly instabilityDetected: boolean;
  readonly unsafeBoundaryDriftDetected: boolean;
  readonly blockedInvariantPreserved: boolean;
  readonly expectedActionable: false;
  readonly actualActionable: false;
  readonly expectedAllowed: false;
  readonly actualAllowed: false;
  readonly expectedMigrationApplicationAllowed: false;
  readonly actualMigrationApplicationAllowed: false;
  readonly expectedSqlExecutionAllowed: false;
  readonly actualSqlExecutionAllowed: false;
  readonly expectedDatabaseConnectionAllowed: false;
  readonly actualDatabaseConnectionAllowed: false;
  readonly expectedDatabaseWriteAllowed: false;
  readonly actualDatabaseWriteAllowed: false;
  readonly expectedTableCreated: false;
  readonly actualTableCreated: false;
  readonly expectedRouteExposed: false;
  readonly actualRouteExposed: false;
  readonly expectedBusinessMutationAllowed: false;
  readonly actualBusinessMutationAllowed: false;
  readonly regressionClass: 'expected_blocked_noop' | 'expected_blocked_instability' | 'expected_blocked_unsafe_boundary';
  readonly regressionAccepted: false;
  readonly regressionApplied: false;
  readonly evidenceOnly: true;
  readonly metadataOnly: true;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport = {
  readonly phase: 'Phase 13T';
  readonly fixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13S';
  readonly sourceSnapshotKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_snapshot';
  readonly fixtureMode: 'regression_fixture_only_no_migration_application';
  readonly regressionFixtureOnly: true;
  readonly evidenceOnly: true;
  readonly metadataOnly: true;
  readonly deterministicRuleBasedOnly: true;
  readonly noMlClassifier: true;
  readonly scenarioCount: number;
  readonly stableSafeNoopScenarioCount: number;
  readonly unstableButBlockedScenarioCount: number;
  readonly unsafeBoundaryDriftScenarioCount: number;
  readonly blockedScenarioCount: number;
  readonly actionableScenarioCount: number;
  readonly migrationAllowedScenarioCount: number;
  readonly sqlAllowedScenarioCount: number;
  readonly databaseWriteAllowedScenarioCount: number;
  readonly unsafeMigrationAllowedScenarioCount: number;
  readonly allScenariosBlocked: boolean;
  readonly allScenariosNonActionable: boolean;
  readonly regressionFixtureValidated: boolean;
  readonly sourceRunCount: number;
  readonly sourceStableRunCount: number;
  readonly sourceDistinctClassifierSignatureCount: number;
  readonly sourceClassifierStabilityPreserved: boolean;
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
  readonly regressionChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionCheck[];
  readonly regressionScenarios: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenario[];
  readonly regressionBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_BOUNDARY = {
  phase: 'Phase 13T',
  regressionFixtureOnly: true,
  fixtureMode: 'regression_fixture_only_no_migration_application',
  usesPhase13SStabilitySnapshotOnly: true,
  buildsRegressionScenariosInMemoryOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  scenarioKinds: ['stable_safe_noop', 'unstable_but_blocked', 'unsafe_boundary_drift'],
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
  allRegressionScenariosRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY = {
  phase: 'Phase 13T',
  metadataOnly: true,
  regressionFixtureOnly: true,
  evidenceOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const blockedScenarioBase = {
  expectedActionable: false,
  actualActionable: false,
  expectedAllowed: false,
  actualAllowed: false,
  expectedMigrationApplicationAllowed: false,
  actualMigrationApplicationAllowed: false,
  expectedSqlExecutionAllowed: false,
  actualSqlExecutionAllowed: false,
  expectedDatabaseConnectionAllowed: false,
  actualDatabaseConnectionAllowed: false,
  expectedDatabaseWriteAllowed: false,
  actualDatabaseWriteAllowed: false,
  expectedTableCreated: false,
  actualTableCreated: false,
  expectedRouteExposed: false,
  actualRouteExposed: false,
  expectedBusinessMutationAllowed: false,
  actualBusinessMutationAllowed: false,
  regressionAccepted: false,
  regressionApplied: false,
  evidenceOnly: true,
  metadataOnly: true,
} as const;

const buildRegressionScenarios = (
  sourceSnapshot: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionScenario[] => [
  {
    scenarioId: 'stable_safe_noop_baseline',
    scenarioKind: 'stable_safe_noop',
    description: 'Baseline Phase 13S stability snapshot remains stable, safe, noop, and blocked.',
    sourcePhase: 'Phase 13S',
    sourceSnapshotKind: sourceSnapshot.snapshotKind,
    expectedOutcome: 'stable_blocked_noop',
    scenarioStatus: sourceSnapshot.classifierStabilityPreserved ? 'pass' : 'fail',
    stable: true,
    instabilityDetected: false,
    unsafeBoundaryDriftDetected: false,
    blockedInvariantPreserved: true,
    regressionClass: 'expected_blocked_noop',
    ...blockedScenarioBase,
  },
  {
    scenarioId: 'unstable_but_blocked_regression',
    scenarioKind: 'unstable_but_blocked',
    description: 'Synthetic future instability is expected to remain blocked and non-actionable.',
    sourcePhase: 'Phase 13S',
    sourceSnapshotKind: sourceSnapshot.snapshotKind,
    expectedOutcome: 'blocked_instability_detected',
    scenarioStatus: 'pass',
    stable: false,
    instabilityDetected: true,
    unsafeBoundaryDriftDetected: false,
    blockedInvariantPreserved: true,
    regressionClass: 'expected_blocked_instability',
    ...blockedScenarioBase,
  },
  {
    scenarioId: 'unsafe_boundary_drift_regression',
    scenarioKind: 'unsafe_boundary_drift',
    description: 'Synthetic unsafe boundary drift is expected to be detected while migration remains blocked.',
    sourcePhase: 'Phase 13S',
    sourceSnapshotKind: sourceSnapshot.snapshotKind,
    expectedOutcome: 'blocked_unsafe_boundary_detected',
    scenarioStatus: 'pass',
    stable: false,
    instabilityDetected: true,
    unsafeBoundaryDriftDetected: true,
    blockedInvariantPreserved: true,
    regressionClass: 'expected_blocked_unsafe_boundary',
    ...blockedScenarioBase,
  },
];

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionFixtureReport => {
  const sourceSnapshot = buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport(generatedAt);
  const regressionScenarios = buildRegressionScenarios(sourceSnapshot);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const scenarioCount = regressionScenarios.length;
  const stableSafeNoopScenarioCount = regressionScenarios.filter((scenario) => scenario.scenarioKind === 'stable_safe_noop').length;
  const unstableButBlockedScenarioCount = regressionScenarios.filter((scenario) => scenario.scenarioKind === 'unstable_but_blocked').length;
  const unsafeBoundaryDriftScenarioCount = regressionScenarios.filter((scenario) => scenario.scenarioKind === 'unsafe_boundary_drift').length;
  const blockedScenarioCount = regressionScenarios.filter(
    (scenario) =>
      scenario.actualMigrationApplicationAllowed === false &&
      scenario.actualSqlExecutionAllowed === false &&
      scenario.actualDatabaseConnectionAllowed === false &&
      scenario.actualDatabaseWriteAllowed === false &&
      scenario.actualRouteExposed === false &&
      scenario.actualBusinessMutationAllowed === false,
  ).length;
  const actionableScenarioCount = regressionScenarios.filter((scenario) => (scenario.actualActionable as boolean) === true).length;
  const migrationAllowedScenarioCount = regressionScenarios.filter((scenario) => (scenario.actualMigrationApplicationAllowed as boolean) === true).length;
  const sqlAllowedScenarioCount = regressionScenarios.filter((scenario) => (scenario.actualSqlExecutionAllowed as boolean) === true).length;
  const databaseWriteAllowedScenarioCount = regressionScenarios.filter((scenario) => (scenario.actualDatabaseWriteAllowed as boolean) === true).length;
  const unsafeMigrationAllowedScenarioCount = regressionScenarios.filter(
    (scenario) => scenario.unsafeBoundaryDriftDetected === true && (scenario.actualMigrationApplicationAllowed as boolean) === true,
  ).length;
  const allScenariosBlocked = blockedScenarioCount === scenarioCount;
  const allScenariosNonActionable = actionableScenarioCount === 0 && migrationAllowedScenarioCount === 0;
  const regressionFixtureValidated =
    scenarioCount === 3 &&
    stableSafeNoopScenarioCount === 1 &&
    unstableButBlockedScenarioCount === 1 &&
    unsafeBoundaryDriftScenarioCount === 1 &&
    allScenariosBlocked &&
    allScenariosNonActionable &&
    unsafeMigrationAllowedScenarioCount === 0;

  const regressionChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRegressionCheck[] = [
    check(
      'regression-fixture-covers-three-required-scenarios',
      scenarioCount === 3 && stableSafeNoopScenarioCount === 1 && unstableButBlockedScenarioCount === 1 && unsafeBoundaryDriftScenarioCount === 1,
      'Phase 13T must cover stable_safe_noop, unstable_but_blocked, and unsafe_boundary_drift regression scenarios.',
    ),
    check(
      'all-regression-scenarios-remain-blocked',
      allScenariosBlocked && allScenariosNonActionable,
      'Every regression scenario must remain blocked, non-actionable, and unable to execute SQL or write a database.',
    ),
    check(
      'unsafe-boundary-drift-never-allows-migration',
      unsafeBoundaryDriftScenarioCount === 1 && unsafeMigrationAllowedScenarioCount === 0,
      'The unsafe boundary drift regression scenario may be detected but must never allow migration application.',
    ),
    check(
      'source-stability-snapshot-remains-preserved',
      sourceSnapshot.classifierStabilityPreserved === true && sourceSnapshot.migrationApplicationAllowed === false,
      'The Phase 13S source stability snapshot must remain preserved and blocked.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (!regressionFixtureValidated) {
    errors.push(issue('regression_fixture_not_validated', 'All Phase 13T regression scenarios must be covered and remain blocked.', 'regressionScenarios'));
  }

  const failedChecks = regressionChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_stability_regression_check', entry.message, `regressionChecks.${entry.name}`)));

  const status = summarizeStatus(regressionChecks, warnings, errors);

  return {
    phase: 'Phase 13T',
    fixtureKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_regression_fixture',
    status,
    sourcePhase: 'Phase 13S',
    sourceSnapshotKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_snapshot',
    fixtureMode: 'regression_fixture_only_no_migration_application',
    regressionFixtureOnly: true,
    evidenceOnly: true,
    metadataOnly: true,
    deterministicRuleBasedOnly: true,
    noMlClassifier: true,
    scenarioCount,
    stableSafeNoopScenarioCount,
    unstableButBlockedScenarioCount,
    unsafeBoundaryDriftScenarioCount,
    blockedScenarioCount,
    actionableScenarioCount,
    migrationAllowedScenarioCount,
    sqlAllowedScenarioCount,
    databaseWriteAllowedScenarioCount,
    unsafeMigrationAllowedScenarioCount,
    allScenariosBlocked,
    allScenariosNonActionable,
    regressionFixtureValidated,
    sourceRunCount: sourceSnapshot.runCount,
    sourceStableRunCount: sourceSnapshot.stableRunCount,
    sourceDistinctClassifierSignatureCount: sourceSnapshot.distinctClassifierSignatureCount,
    sourceClassifierStabilityPreserved: sourceSnapshot.classifierStabilityPreserved,
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
    regressionChecks,
    regressionScenarios,
    regressionBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_REGRESSION_FIXTURE_POLICY,
    generatedAt,
  };
};
