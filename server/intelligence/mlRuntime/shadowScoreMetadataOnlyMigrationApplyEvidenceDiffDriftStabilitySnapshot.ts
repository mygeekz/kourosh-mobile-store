import {
  buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow,
} from './shadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifier';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityClass =
  | 'stable_safe_noop_drift'
  | 'unstable_blocked_drift'
  | 'unsafe_boundary_drift_instability';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRun = {
  readonly runIndex: number;
  readonly sourcePhase: 'Phase 13R';
  readonly sourceClassifierKind: 'metadata_only_migration_apply_evidence_diff_drift_classifier';
  readonly sourceClassifierStatus: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourceClassifierSignature: string;
  readonly classifiedRowCount: number;
  readonly safeNoopDriftCount: number;
  readonly blockedPolicyDriftCount: number;
  readonly unsafeBoundaryDriftCount: number;
  readonly unsafeDriftDetected: false;
  readonly blockedInvariantPreserved: boolean;
  readonly matchesBaselineSignature: boolean;
  readonly stabilityClass: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityClass;
  readonly actionable: false;
  readonly operatorApproved: false;
  readonly allowed: false;
  readonly ready: false;
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly routeExposed: false;
  readonly businessMutationAllowed: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport = {
  readonly phase: 'Phase 13S';
  readonly snapshotKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_snapshot';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13R';
  readonly sourceClassifierKind: 'metadata_only_migration_apply_evidence_diff_drift_classifier';
  readonly snapshotMode: 'stability_snapshot_only_no_migration_application';
  readonly stabilitySnapshotOnly: true;
  readonly evidenceOnly: true;
  readonly deterministicRuleBasedOnly: true;
  readonly noMlClassifier: true;
  readonly runCount: number;
  readonly stableRunCount: number;
  readonly unstableRunCount: number;
  readonly unsafeRunCount: number;
  readonly distinctClassifierSignatureCount: number;
  readonly baselineClassifierSignature: string;
  readonly allRunsStable: boolean;
  readonly allRunsBlocked: boolean;
  readonly allRunsSafeNoopDrift: boolean;
  readonly classifierStabilityPreserved: boolean;
  readonly sourceClassifiedRowCount: number;
  readonly safeNoopDriftCount: number;
  readonly blockedPolicyDriftCount: number;
  readonly unsafeBoundaryDriftCount: number;
  readonly unsafeDriftDetected: false;
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
  readonly stabilityChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityCheck[];
  readonly stabilityRuns: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRun[];
  readonly stabilityBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_BOUNDARY = {
  phase: 'Phase 13S',
  stabilitySnapshotOnly: true,
  snapshotMode: 'stability_snapshot_only_no_migration_application',
  usesPhase13RDriftClassifierOnly: true,
  runsClassifierInMemoryOnly: true,
  runCount: 3,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  doesNotReadBaselinePacketFromDisk: true,
  doesNotReadCurrentPacketFromDisk: true,
  doesNotReadDiffSnapshotFromDisk: true,
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
  allRunsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY = {
  phase: 'Phase 13S',
  metadataOnly: true,
  stabilitySnapshotOnly: true,
  evidenceOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  noBaselineFileRuntimeRead: true,
  noCurrentFileRuntimeRead: true,
  noDiffSnapshotFileRuntimeRead: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const buildClassifierSignature = (report: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport): string => {
  const rowSignature = report.driftRows
    .map((row: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow) =>
      `${row.field}:${row.sourceDiffStatus}:${row.driftClass}:${row.driftSeverity}:${row.blockedInvariantPreserved}`,
    )
    .join('|');

  return [
    report.classifierKind,
    report.sourceDiffRowCount,
    report.classifiedRowCount,
    report.safeNoopDriftCount,
    report.blockedPolicyDriftCount,
    report.unsafeBoundaryDriftCount,
    report.unsafeDriftDetected,
    report.blockedInvariantPreserved,
    rowSignature,
  ].join('::');
};

const toStabilityRun = (
  runIndex: number,
  report: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport,
  baselineClassifierSignature: string,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityRun => {
  const sourceClassifierSignature = buildClassifierSignature(report);
  const matchesBaselineSignature = sourceClassifierSignature === baselineClassifierSignature;
  const allSafeNoop =
    report.safeNoopDriftCount === report.classifiedRowCount && report.blockedPolicyDriftCount === 0 && report.unsafeBoundaryDriftCount === 0;
  const stabilityClass: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityClass =
    matchesBaselineSignature && allSafeNoop && report.blockedInvariantPreserved
      ? 'stable_safe_noop_drift'
      : report.blockedInvariantPreserved
      ? 'unstable_blocked_drift'
      : 'unsafe_boundary_drift_instability';

  return {
    runIndex,
    sourcePhase: 'Phase 13R',
    sourceClassifierKind: report.classifierKind,
    sourceClassifierStatus: report.status,
    sourceClassifierSignature,
    classifiedRowCount: report.classifiedRowCount,
    safeNoopDriftCount: report.safeNoopDriftCount,
    blockedPolicyDriftCount: report.blockedPolicyDriftCount,
    unsafeBoundaryDriftCount: report.unsafeBoundaryDriftCount,
    unsafeDriftDetected: false,
    blockedInvariantPreserved: report.blockedInvariantPreserved,
    matchesBaselineSignature,
    stabilityClass,
    actionable: false,
    operatorApproved: false,
    allowed: false,
    ready: false,
    migrationApplicationAllowed: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    routeExposed: false,
    businessMutationAllowed: false,
  };
};

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilitySnapshotReport => {
  const sourceReports = [
    buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport(generatedAt),
    buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport(generatedAt),
    buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport(generatedAt),
  ];
  const baselineClassifierSignature = buildClassifierSignature(sourceReports[0]);
  const stabilityRuns = sourceReports.map((report, index) => toStabilityRun(index + 1, report, baselineClassifierSignature));
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const runCount = stabilityRuns.length;
  const stableRunCount = stabilityRuns.filter((run) => run.stabilityClass === 'stable_safe_noop_drift').length;
  const unstableRunCount = stabilityRuns.filter((run) => run.stabilityClass === 'unstable_blocked_drift').length;
  const unsafeRunCount = stabilityRuns.filter((run) => run.stabilityClass === 'unsafe_boundary_drift_instability').length;
  const distinctClassifierSignatureCount = new Set(stabilityRuns.map((run) => run.sourceClassifierSignature)).size;
  const allRunsStable = stableRunCount === runCount && distinctClassifierSignatureCount === 1;
  const allRunsBlocked = stabilityRuns.every(
    (run) =>
      run.migrationApplicationAllowed === false &&
      run.sqlExecutionAllowed === false &&
      run.databaseConnectionAllowed === false &&
      run.databaseWriteAllowed === false &&
      run.routeExposed === false &&
      run.businessMutationAllowed === false,
  );
  const allRunsSafeNoopDrift = stabilityRuns.every((run) => run.stabilityClass === 'stable_safe_noop_drift');
  const classifierStabilityPreserved = allRunsStable && allRunsBlocked && allRunsSafeNoopDrift;

  const stabilityChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftStabilityCheck[] = [
    check(
      'three-in-memory-classifier-runs-produced-one-signature',
      runCount === 3 && distinctClassifierSignatureCount === 1 && allRunsStable,
      'Phase 13S expects three in-memory classifier runs to produce one stable blocked signature.',
    ),
    check(
      'all-runs-remain-safe-noop-drift',
      stableRunCount === 3 && unstableRunCount === 0 && unsafeRunCount === 0,
      'All current stability runs must remain stable_safe_noop_drift with no blocked policy or unsafe boundary drift.',
    ),
    check(
      'all-runs-remain-non-actionable',
      allRunsBlocked,
      'No stability run may allow migration application, SQL execution, database access, route exposure, or business mutation.',
    ),
    check(
      'stability-snapshot-does-not-apply-migration',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.noMigrationApplication === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.noDatabaseWrite === true,
      'The stability snapshot must not apply migrations, execute SQL, connect to a database, or write metadata.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (!classifierStabilityPreserved) {
    errors.push(issue('classifier_stability_not_preserved', 'All drift classifier stability runs must remain stable, blocked, and non-actionable.', 'stabilityRuns'));
  }

  const failedChecks = stabilityChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_drift_classifier_stability_check', entry.message, `stabilityChecks.${entry.name}`)));

  const status = summarizeStatus(stabilityChecks, warnings, errors);
  const firstSourceReport = sourceReports[0];

  return {
    phase: 'Phase 13S',
    snapshotKind: 'metadata_only_migration_apply_evidence_diff_drift_stability_snapshot',
    status,
    sourcePhase: 'Phase 13R',
    sourceClassifierKind: 'metadata_only_migration_apply_evidence_diff_drift_classifier',
    snapshotMode: 'stability_snapshot_only_no_migration_application',
    stabilitySnapshotOnly: true,
    evidenceOnly: true,
    deterministicRuleBasedOnly: true,
    noMlClassifier: true,
    runCount,
    stableRunCount,
    unstableRunCount,
    unsafeRunCount,
    distinctClassifierSignatureCount,
    baselineClassifierSignature,
    allRunsStable,
    allRunsBlocked,
    allRunsSafeNoopDrift,
    classifierStabilityPreserved,
    sourceClassifiedRowCount: firstSourceReport.classifiedRowCount,
    safeNoopDriftCount: firstSourceReport.safeNoopDriftCount,
    blockedPolicyDriftCount: firstSourceReport.blockedPolicyDriftCount,
    unsafeBoundaryDriftCount: firstSourceReport.unsafeBoundaryDriftCount,
    unsafeDriftDetected: false,
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
    stabilityChecks,
    stabilityRuns,
    stabilityBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_STABILITY_SNAPSHOT_POLICY,
    generatedAt,
  };
};
