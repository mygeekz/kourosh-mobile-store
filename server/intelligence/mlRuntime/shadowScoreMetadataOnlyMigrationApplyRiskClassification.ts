import {
  buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport,
  type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport,
  type ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow,
} from './shadowScoreMetadataOnlyMigrationApplyEligibilityMatrix';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyRiskCategory =
  | 'blocked_by_phase_boundary'
  | 'blocked_by_evidence_boundary'
  | 'blocked_by_apply_boundary'
  | 'blocked_by_execution_boundary'
  | 'blocked_by_database_boundary'
  | 'blocked_by_registry_boundary';

export type ShadowScoreMetadataOnlyMigrationApplyRiskSeverity = 'medium' | 'high' | 'critical';

export type ShadowScoreMetadataOnlyMigrationApplyRiskDisposition =
  | 'keep_blocked_phase_design_only'
  | 'keep_blocked_until_evidence_passes'
  | 'keep_blocked_until_apply_boundary_changes'
  | 'keep_blocked_until_sql_execution_is_explicitly_authorized'
  | 'keep_blocked_until_database_boundary_is_explicitly_authorized'
  | 'keep_blocked_until_registry_mutation_is_explicitly_authorized';

export type ShadowScoreMetadataOnlyMigrationApplyRiskClassificationRow = {
  readonly sourceRowName: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow['name'];
  readonly eligibilityDecision: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow['eligibilityDecision'];
  readonly riskCategory: ShadowScoreMetadataOnlyMigrationApplyRiskCategory;
  readonly riskSeverity: ShadowScoreMetadataOnlyMigrationApplyRiskSeverity;
  readonly riskDisposition: ShadowScoreMetadataOnlyMigrationApplyRiskDisposition;
  readonly riskReasons: string[];
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

export type ShadowScoreMetadataOnlyMigrationApplyRiskClassificationCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport = {
  readonly phase: 'Phase 13M';
  readonly classificationKind: 'metadata_only_migration_apply_risk_classification';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13L';
  readonly sourceMatrixKind: 'metadata_only_migration_apply_eligibility_matrix';
  readonly classificationMode: 'risk_classification_only_no_migration_application';
  readonly riskClassificationOnly: true;
  readonly allowed: false;
  readonly riskRowCount: number;
  readonly classifiedScenarioCount: number;
  readonly blockedScenarioCount: number;
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
  readonly classificationChecks: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationCheck[];
  readonly riskRows: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationRow[];
  readonly sourceEligibilityMatrixReport: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport;
  readonly riskBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_BOUNDARY = {
  phase: 'Phase 13M',
  riskClassificationOnly: true,
  classificationMode: 'risk_classification_only_no_migration_application',
  usesPhase13LEligibilityMatrixOnly: true,
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
  allClassificationsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY = {
  phase: 'Phase 13M',
  metadataOnly: true,
  riskClassificationOnly: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyRiskClassificationCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationCheck[],
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail')) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const severityRank: Record<ShadowScoreMetadataOnlyMigrationApplyRiskSeverity, number> = {
  medium: 1,
  high: 2,
  critical: 3,
};

const emptyCategoryCounts = (): Record<ShadowScoreMetadataOnlyMigrationApplyRiskCategory, number> => ({
  blocked_by_phase_boundary: 0,
  blocked_by_evidence_boundary: 0,
  blocked_by_apply_boundary: 0,
  blocked_by_execution_boundary: 0,
  blocked_by_database_boundary: 0,
  blocked_by_registry_boundary: 0,
});

const classifyRowCategory = (
  row: ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow,
): {
  readonly riskCategory: ShadowScoreMetadataOnlyMigrationApplyRiskCategory;
  readonly riskSeverity: ShadowScoreMetadataOnlyMigrationApplyRiskSeverity;
  readonly riskDisposition: ShadowScoreMetadataOnlyMigrationApplyRiskDisposition;
  readonly riskReasons: string[];
} => {
  if (row.name === 'missing_migration_registry_authorization') {
    return {
      riskCategory: 'blocked_by_registry_boundary',
      riskSeverity: 'critical',
      riskDisposition: 'keep_blocked_until_registry_mutation_is_explicitly_authorized',
      riskReasons: ['migration registry mutation would operationalize schema changes and must remain explicitly gated'],
    };
  }

  if (
    row.name === 'missing_database_connection_authorization' ||
    row.name === 'missing_database_write_authorization' ||
    row.blockers.some((blocker) => blocker.includes('database_'))
  ) {
    return {
      riskCategory: 'blocked_by_database_boundary',
      riskSeverity: 'critical',
      riskDisposition: 'keep_blocked_until_database_boundary_is_explicitly_authorized',
      riskReasons: ['database connection/write authorization is absent and Phase 13M must not persist metadata'],
    };
  }

  if (row.name === 'missing_sql_execution_authorization' || row.blockers.some((blocker) => blocker.includes('sql_execution'))) {
    return {
      riskCategory: 'blocked_by_execution_boundary',
      riskSeverity: 'critical',
      riskDisposition: 'keep_blocked_until_sql_execution_is_explicitly_authorized',
      riskReasons: ['SQL execution remains disabled and cannot be inferred from eligibility evidence'],
    };
  }

  if (row.name === 'failed_apply_boundary' || row.name === 'all_documented_preconditions_but_apply_still_disabled') {
    return {
      riskCategory: 'blocked_by_apply_boundary',
      riskSeverity: 'high',
      riskDisposition: 'keep_blocked_until_apply_boundary_changes',
      riskReasons: ['apply boundary remains closed even when supporting evidence exists'],
    };
  }

  if (row.name === 'failed_migration_runner_dry_run' || row.name === 'failed_preflight_fixture') {
    return {
      riskCategory: 'blocked_by_evidence_boundary',
      riskSeverity: 'high',
      riskDisposition: 'keep_blocked_until_evidence_passes',
      riskReasons: ['supporting dry-run or preflight evidence is missing or failing'],
    };
  }

  return {
    riskCategory: 'blocked_by_phase_boundary',
    riskSeverity: 'medium',
    riskDisposition: 'keep_blocked_phase_design_only',
    riskReasons: ['current phase is classification-only and does not authorize migration application'],
  };
};

export const classifyShadowScoreMetadataOnlyMigrationApplyRiskRows = (
  rows: readonly ShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRow[],
): ShadowScoreMetadataOnlyMigrationApplyRiskClassificationRow[] => rows.map((row) => {
  const classification = classifyRowCategory(row);

  return {
    sourceRowName: row.name,
    eligibilityDecision: row.eligibilityDecision,
    riskCategory: classification.riskCategory,
    riskSeverity: classification.riskSeverity,
    riskDisposition: classification.riskDisposition,
    riskReasons: classification.riskReasons,
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

export const buildShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport => {
  const sourceEligibilityMatrixReport = buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport(generatedAt);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const riskRows = classifyShadowScoreMetadataOnlyMigrationApplyRiskRows(sourceEligibilityMatrixReport.matrixRows);
  const categoryCounts = emptyCategoryCounts();

  for (const row of riskRows) {
    categoryCounts[row.riskCategory] += 1;
  }

  const highestRiskSeverity = riskRows.reduce<ShadowScoreMetadataOnlyMigrationApplyRiskSeverity>(
    (current, row) => (severityRank[row.riskSeverity] > severityRank[current] ? row.riskSeverity : current),
    'medium',
  );

  const classificationChecks: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationCheck[] = [
    check(
      'source-eligibility-matrix-is-safe',
      sourceEligibilityMatrixReport.status !== 'fail' &&
        sourceEligibilityMatrixReport.matrixMode === 'eligibility_matrix_only_no_migration_application' &&
        sourceEligibilityMatrixReport.allowed === false,
      'Phase 13M requires the Phase 13L eligibility matrix to remain safe, blocked, and matrix-only.',
    ),
    check(
      'all-risk-rows-remain-blocked',
      riskRows.length > 0 && riskRows.every((row) => row.allowed === false && row.migrationApplicationAllowed === false),
      'Every risk classification row must remain blocked in Phase 13M.',
    ),
    check(
      'risk-categories-cover-critical-boundaries',
      categoryCounts.blocked_by_execution_boundary > 0 &&
        categoryCounts.blocked_by_database_boundary > 0 &&
        categoryCounts.blocked_by_registry_boundary > 0,
      'Risk classification must cover execution, database, and registry boundaries.',
    ),
    check(
      'sql-and-database-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.noDatabaseWrite === true,
      'SQL execution, database connection, and database writes must remain disabled.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (riskRows.length !== sourceEligibilityMatrixReport.matrixRows.length) {
    errors.push(issue('risk_row_count_mismatch', 'Risk row count must match eligibility matrix row count.', 'riskRows'));
  }

  if (riskRows.some((row) => row.allowed !== false || row.sqlExecutionAllowed !== false || row.databaseWriteAllowed !== false)) {
    errors.push(issue('unsafe_risk_row', 'Every risk row must keep apply, SQL execution, and database writes disabled.', 'riskRows'));
  }

  const failedChecks = classificationChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_risk_classification_check', entry.message, `classificationChecks.${entry.name}`)));

  const status = summarizeStatus(sourceEligibilityMatrixReport.status, classificationChecks, warnings.concat(errors));

  return {
    phase: 'Phase 13M',
    classificationKind: 'metadata_only_migration_apply_risk_classification',
    status,
    sourcePhase: 'Phase 13L',
    sourceMatrixKind: 'metadata_only_migration_apply_eligibility_matrix',
    classificationMode: 'risk_classification_only_no_migration_application',
    riskClassificationOnly: true,
    allowed: false,
    riskRowCount: riskRows.length,
    classifiedScenarioCount: riskRows.length,
    blockedScenarioCount: riskRows.length,
    highestRiskSeverity,
    categoryCounts,
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
    classificationChecks,
    riskRows,
    sourceEligibilityMatrixReport,
    riskBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY,
    generatedAt,
  };
};
