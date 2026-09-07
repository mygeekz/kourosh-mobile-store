import {
  buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport,
  type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport,
} from './shadowScoreMetadataOnlyMigrationApplyEligibilityMatrix';
import {
  buildShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport,
  type ShadowScoreMetadataOnlyMigrationApplyRiskCategory,
  type ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport,
  type ShadowScoreMetadataOnlyMigrationApplyRiskSeverity,
} from './shadowScoreMetadataOnlyMigrationApplyRiskClassification';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision =
  | 'not_ready_blocked_by_phase_boundary'
  | 'not_ready_blocked_by_execution_database_or_registry_boundary'
  | 'not_ready_blocked_by_source_evidence_failure';

export type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRow = {
  readonly sourceRowName: string;
  readonly eligibilityDecision: string;
  readonly riskCategory: ShadowScoreMetadataOnlyMigrationApplyRiskCategory;
  readonly riskSeverity: ShadowScoreMetadataOnlyMigrationApplyRiskSeverity;
  readonly readinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision;
  readonly readinessReasons: string[];
  readonly blockers: string[];
  readonly missingPreconditions: string[];
  readonly allowed: false;
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly migrationRegistryMutationAllowed: false;
  readonly tableCreationApplied: false;
  readonly routeExposed: false;
  readonly businessMutationAllowed: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport = {
  readonly phase: 'Phase 13N';
  readonly snapshotKind: 'metadata_only_migration_apply_readiness_snapshot';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhases: readonly ['Phase 13L', 'Phase 13M'];
  readonly sourceMatrixKind: 'metadata_only_migration_apply_eligibility_matrix';
  readonly sourceClassificationKind: 'metadata_only_migration_apply_risk_classification';
  readonly snapshotMode: 'readiness_snapshot_only_no_migration_application';
  readonly readinessSnapshotOnly: true;
  readonly allowed: false;
  readonly ready: false;
  readonly overallReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision;
  readonly snapshotRowCount: number;
  readonly blockedSnapshotRowCount: number;
  readonly eligibleScenarioCount: 0;
  readonly highestRiskSeverity: ShadowScoreMetadataOnlyMigrationApplyRiskSeverity;
  readonly categoryCounts: Record<ShadowScoreMetadataOnlyMigrationApplyRiskCategory, number>;
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
  readonly readinessChecks: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotCheck[];
  readonly snapshotRows: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRow[];
  readonly sourceEligibilityMatrixReport: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport;
  readonly sourceRiskClassificationReport: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport;
  readonly readinessBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_BOUNDARY = {
  phase: 'Phase 13N',
  readinessSnapshotOnly: true,
  snapshotMode: 'readiness_snapshot_only_no_migration_application',
  usesPhase13LEligibilityMatrixOnly: true,
  usesPhase13MRiskClassificationOnly: true,
  summarizesEligibilityAndRiskOnly: true,
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
  allSnapshotRowsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY = {
  phase: 'Phase 13N',
  metadataOnly: true,
  readinessSnapshotOnly: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatuses: readonly ShadowScoreMetadataOnlyStorageDraftStatus[],
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatuses.includes('fail') || checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (sourceStatuses.includes('warning') || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const readinessDecisionForCategory = (
  riskCategory: ShadowScoreMetadataOnlyMigrationApplyRiskCategory,
): ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision => {
  if (
    riskCategory === 'blocked_by_execution_boundary' ||
    riskCategory === 'blocked_by_database_boundary' ||
    riskCategory === 'blocked_by_registry_boundary'
  ) {
    return 'not_ready_blocked_by_execution_database_or_registry_boundary';
  }

  if (riskCategory === 'blocked_by_evidence_boundary') {
    return 'not_ready_blocked_by_source_evidence_failure';
  }

  return 'not_ready_blocked_by_phase_boundary';
};

const readinessReasonsForDecision = (
  decision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision,
): string[] => {
  if (decision === 'not_ready_blocked_by_execution_database_or_registry_boundary') {
    return ['migration application requires explicit future authorization for execution, database, and registry boundaries'];
  }

  if (decision === 'not_ready_blocked_by_source_evidence_failure') {
    return ['source dry-run, boundary, or preflight evidence must remain passing before any future apply phase is considered'];
  }

  return ['Phase 13N is readiness-snapshot-only and does not authorize executable migrations'];
};

export const buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRows = (
  riskReport: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport,
): ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRow[] => riskReport.riskRows.map((row) => {
  const readinessDecision = readinessDecisionForCategory(row.riskCategory);

  return {
    sourceRowName: row.sourceRowName,
    eligibilityDecision: row.eligibilityDecision,
    riskCategory: row.riskCategory,
    riskSeverity: row.riskSeverity,
    readinessDecision,
    readinessReasons: readinessReasonsForDecision(readinessDecision),
    blockers: row.blockers,
    missingPreconditions: row.missingPreconditions,
    allowed: false,
    migrationApplicationAllowed: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    migrationRegistryMutationAllowed: false,
    tableCreationApplied: false,
    routeExposed: false,
    businessMutationAllowed: false,
  };
});

export const buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport => {
  const sourceEligibilityMatrixReport = buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport(generatedAt);
  const sourceRiskClassificationReport = buildShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport(generatedAt);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const snapshotRows = buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRows(sourceRiskClassificationReport);
  const overallReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision = snapshotRows.some((row) => row.readinessDecision === 'not_ready_blocked_by_execution_database_or_registry_boundary')
    ? 'not_ready_blocked_by_execution_database_or_registry_boundary'
    : snapshotRows.some((row) => row.readinessDecision === 'not_ready_blocked_by_source_evidence_failure')
    ? 'not_ready_blocked_by_source_evidence_failure'
    : 'not_ready_blocked_by_phase_boundary';

  const readinessChecks: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotCheck[] = [
    check(
      'source-eligibility-matrix-remains-blocked',
      sourceEligibilityMatrixReport.status !== 'fail' &&
        sourceEligibilityMatrixReport.allowed === false &&
        sourceEligibilityMatrixReport.migrationApplicationAllowed === false &&
        sourceEligibilityMatrixReport.matrixMode === 'eligibility_matrix_only_no_migration_application',
      'Phase 13N requires the Phase 13L eligibility matrix to remain blocked and matrix-only.',
    ),
    check(
      'source-risk-classification-remains-blocked',
      sourceRiskClassificationReport.status !== 'fail' &&
        sourceRiskClassificationReport.allowed === false &&
        sourceRiskClassificationReport.migrationApplicationAllowed === false &&
        sourceRiskClassificationReport.classificationMode === 'risk_classification_only_no_migration_application',
      'Phase 13N requires the Phase 13M risk classification to remain blocked and classification-only.',
    ),
    check(
      'snapshot-row-counts-match-risk-classification',
      snapshotRows.length === sourceRiskClassificationReport.riskRowCount &&
        sourceRiskClassificationReport.riskRowCount === sourceEligibilityMatrixReport.matrixRowCount,
      'The readiness snapshot must preserve row identity and counts from the eligibility matrix and risk classification.',
    ),
    check(
      'all-snapshot-rows-remain-blocked',
      snapshotRows.length > 0 && snapshotRows.every((row) => row.allowed === false && row.migrationApplicationAllowed === false),
      'Every readiness snapshot row must remain blocked in Phase 13N.',
    ),
    check(
      'sql-database-and-registry-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.noDatabaseWrite === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.noMigrationRegistryMutation === true,
      'SQL execution, database access, database writes, and migration registry mutation must remain disabled.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (snapshotRows.length !== sourceRiskClassificationReport.riskRows.length) {
    errors.push(issue('snapshot_row_count_mismatch', 'Snapshot row count must match risk classification row count.', 'snapshotRows'));
  }

  if (snapshotRows.some((row) => row.allowed !== false || row.sqlExecutionAllowed !== false || row.databaseWriteAllowed !== false)) {
    errors.push(issue('unsafe_snapshot_row', 'Every snapshot row must keep apply, SQL execution, and database writes disabled.', 'snapshotRows'));
  }

  const failedChecks = readinessChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_readiness_snapshot_check', entry.message, `readinessChecks.${entry.name}`)));

  const status = summarizeStatus(
    [sourceEligibilityMatrixReport.status, sourceRiskClassificationReport.status],
    readinessChecks,
    warnings,
    errors,
  );

  return {
    phase: 'Phase 13N',
    snapshotKind: 'metadata_only_migration_apply_readiness_snapshot',
    status,
    sourcePhases: ['Phase 13L', 'Phase 13M'],
    sourceMatrixKind: 'metadata_only_migration_apply_eligibility_matrix',
    sourceClassificationKind: 'metadata_only_migration_apply_risk_classification',
    snapshotMode: 'readiness_snapshot_only_no_migration_application',
    readinessSnapshotOnly: true,
    allowed: false,
    ready: false,
    overallReadinessDecision,
    snapshotRowCount: snapshotRows.length,
    blockedSnapshotRowCount: snapshotRows.length,
    eligibleScenarioCount: 0,
    highestRiskSeverity: sourceRiskClassificationReport.highestRiskSeverity,
    categoryCounts: sourceRiskClassificationReport.categoryCounts,
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
    readinessChecks,
    snapshotRows,
    sourceEligibilityMatrixReport,
    sourceRiskClassificationReport,
    readinessBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY,
    generatedAt,
  };
};
