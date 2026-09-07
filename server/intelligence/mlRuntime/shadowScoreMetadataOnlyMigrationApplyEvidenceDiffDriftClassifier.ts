import {
  buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport,
  type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow,
} from './shadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshot';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClass =
  | 'safe_noop_drift'
  | 'blocked_policy_drift'
  | 'unsafe_boundary_drift';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftSeverity = 'none' | 'medium' | 'critical';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow = {
  readonly field: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow['field'];
  readonly sourceDiffStatus: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow['diffStatus'];
  readonly driftClass: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClass;
  readonly driftSeverity: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftSeverity;
  readonly valueChanged: boolean;
  readonly safetyRelevant: true;
  readonly blockedInvariantPreserved: boolean;
  readonly classificationReason: string;
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

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport = {
  readonly phase: 'Phase 13R';
  readonly classifierKind: 'metadata_only_migration_apply_evidence_diff_drift_classifier';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13Q';
  readonly sourceSnapshotKind: 'metadata_only_migration_apply_evidence_diff_snapshot';
  readonly classifierMode: 'drift_classifier_only_no_migration_application';
  readonly driftClassifierOnly: true;
  readonly evidenceOnly: true;
  readonly deterministicRuleBasedOnly: true;
  readonly noMlClassifier: true;
  readonly sourceDiffSnapshotStatus: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourceDiffRowCount: number;
  readonly classifiedRowCount: number;
  readonly safeNoopDriftCount: number;
  readonly blockedPolicyDriftCount: number;
  readonly unsafeBoundaryDriftCount: number;
  readonly safetyRelevantDriftCount: number;
  readonly unsafeDriftDetected: false;
  readonly blockedInvariantPreserved: boolean;
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
  readonly classifierChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierCheck[];
  readonly driftRows: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow[];
  readonly sourceDiffSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport;
  readonly driftClassifierBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_BOUNDARY = {
  phase: 'Phase 13R',
  driftClassifierOnly: true,
  classifierMode: 'drift_classifier_only_no_migration_application',
  usesPhase13QEvidenceDiffSnapshotOnly: true,
  classifiesDiffRowsInMemoryOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  doesNotReadBaselinePacketFromDisk: true,
  doesNotReadCurrentPacketFromDisk: true,
  doesNotReadDiffSnapshotFromDisk: true,
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
  allClassifiedRowsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY = {
  phase: 'Phase 13R',
  metadataOnly: true,
  driftClassifierOnly: true,
  evidenceOnly: true,
  deterministicRuleBasedOnly: true,
  noMlClassifier: true,
  noBaselineFileRuntimeRead: true,
  noCurrentFileRuntimeRead: true,
  noDiffSnapshotFileRuntimeRead: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const classifyDriftRow = (
  row: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow => {
  const driftClass: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClass = row.blockedInvariantPreserved
    ? row.valueChanged
      ? 'blocked_policy_drift'
      : 'safe_noop_drift'
    : 'unsafe_boundary_drift';
  const driftSeverity: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftSeverity =
    driftClass === 'unsafe_boundary_drift' ? 'critical' : driftClass === 'blocked_policy_drift' ? 'medium' : 'none';

  return {
    field: row.field,
    sourceDiffStatus: row.diffStatus,
    driftClass,
    driftSeverity,
    valueChanged: row.valueChanged,
    safetyRelevant: true,
    blockedInvariantPreserved: row.blockedInvariantPreserved,
    classificationReason:
      driftClass === 'safe_noop_drift'
        ? 'The diff row is unchanged and all blocked invariants are preserved.'
        : driftClass === 'blocked_policy_drift'
        ? 'The diff row changed but remains blocked; a future explicit migration phase must review it before any apply work.'
        : 'The diff row would violate a blocked invariant and must remain non-actionable.',
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

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRows = (
  sourceDiffSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRow[] => sourceDiffSnapshotReport.diffRows.map((row) => classifyDriftRow(row));

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierReport => {
  const sourceDiffSnapshotReport = buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport(generatedAt);
  const driftRows = buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftRows(sourceDiffSnapshotReport);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const safeNoopDriftCount = driftRows.filter((row) => row.driftClass === 'safe_noop_drift').length;
  const blockedPolicyDriftCount = driftRows.filter((row) => row.driftClass === 'blocked_policy_drift').length;
  const unsafeBoundaryDriftCount = driftRows.filter((row) => row.driftClass === 'unsafe_boundary_drift').length;
  const safetyRelevantDriftCount = driftRows.filter((row) => row.valueChanged && row.safetyRelevant).length;
  const blockedInvariantPreserved = driftRows.every((row) => row.blockedInvariantPreserved === true);

  const classifierChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffDriftClassifierCheck[] = [
    check(
      'source-diff-snapshot-remains-blocked',
      sourceDiffSnapshotReport.status !== 'fail' &&
        sourceDiffSnapshotReport.migrationApplicationAllowed === false &&
        sourceDiffSnapshotReport.sqlExecutionAllowed === false &&
        sourceDiffSnapshotReport.databaseWriteAllowed === false,
      'Phase 13R requires the source evidence diff snapshot to remain blocked and non-applying.',
    ),
    check(
      'all-current-rows-classified-as-safe-noop',
      safeNoopDriftCount === driftRows.length && blockedPolicyDriftCount === 0 && unsafeBoundaryDriftCount === 0,
      'Phase 13R baseline/current evidence is expected to classify every current diff row as safe_noop_drift.',
    ),
    check(
      'no-unsafe-boundary-drift-detected',
      unsafeBoundaryDriftCount === 0 && blockedInvariantPreserved === true,
      'The drift classifier must not detect an unsafe boundary drift in the current snapshot.',
    ),
    check(
      'drift-classifier-does-not-apply-migration',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.noMigrationApplication === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.noDatabaseWrite === true,
      'The drift classifier must not apply a migration, execute SQL, or write a database.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (!blockedInvariantPreserved) {
    errors.push(issue('blocked_invariant_not_preserved', 'Every drift classification row must preserve blocked migration invariants.', 'driftRows'));
  }

  const failedChecks = classifierChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_evidence_diff_drift_classifier_check', entry.message, `classifierChecks.${entry.name}`)));

  const status = summarizeStatus(sourceDiffSnapshotReport.status, classifierChecks, warnings, errors);

  return {
    phase: 'Phase 13R',
    classifierKind: 'metadata_only_migration_apply_evidence_diff_drift_classifier',
    status,
    sourcePhase: 'Phase 13Q',
    sourceSnapshotKind: 'metadata_only_migration_apply_evidence_diff_snapshot',
    classifierMode: 'drift_classifier_only_no_migration_application',
    driftClassifierOnly: true,
    evidenceOnly: true,
    deterministicRuleBasedOnly: true,
    noMlClassifier: true,
    sourceDiffSnapshotStatus: sourceDiffSnapshotReport.status,
    sourceDiffRowCount: sourceDiffSnapshotReport.diffRowCount,
    classifiedRowCount: driftRows.length,
    safeNoopDriftCount,
    blockedPolicyDriftCount,
    unsafeBoundaryDriftCount,
    safetyRelevantDriftCount,
    unsafeDriftDetected: false,
    blockedInvariantPreserved,
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
    classifierChecks,
    driftRows,
    sourceDiffSnapshotReport,
    driftClassifierBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_DRIFT_CLASSIFIER_POLICY,
    generatedAt,
  };
};
