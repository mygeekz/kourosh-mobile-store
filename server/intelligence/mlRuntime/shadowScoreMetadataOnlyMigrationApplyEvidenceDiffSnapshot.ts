import {
  buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
  type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
} from './shadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacket';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotField =
  | 'operatorApproved'
  | 'allowed'
  | 'ready'
  | 'overallReadinessDecision'
  | 'highestRiskSeverity'
  | 'evidenceItemCount'
  | 'blockedEvidenceItemCount'
  | 'migrationApplicationAllowed'
  | 'migrationApplicationPerformed'
  | 'migrationRunnerRegistered'
  | 'migrationRegistryMutated'
  | 'sqlExecutionAllowed'
  | 'databaseConnectionAllowed'
  | 'databaseWriteAllowed'
  | 'tableCreated'
  | 'routeExposed'
  | 'canMutateBusinessRecords';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotStatus =
  | 'unchanged_blocked'
  | 'changed_still_blocked'
  | 'unsafe_changed';

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow = {
  readonly field: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotField;
  readonly baselineValue: string | number | boolean;
  readonly currentValue: string | number | boolean;
  readonly diffStatus: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotStatus;
  readonly valueChanged: boolean;
  readonly safetyRelevant: true;
  readonly blockedInvariant: true;
  readonly blockedInvariantPreserved: boolean;
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly routeExposed: false;
  readonly businessMutationAllowed: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport = {
  readonly phase: 'Phase 13Q';
  readonly snapshotKind: 'metadata_only_migration_apply_evidence_diff_snapshot';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhase: 'Phase 13P';
  readonly sourcePacketKind: 'metadata_only_migration_apply_operator_evidence_packet';
  readonly snapshotMode: 'evidence_diff_snapshot_only_no_migration_application';
  readonly diffSnapshotOnly: true;
  readonly evidenceOnly: true;
  readonly baselineLabel: 'baseline_operator_evidence_packet';
  readonly currentLabel: 'current_operator_evidence_packet';
  readonly baselinePacketStatus: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly currentPacketStatus: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly diffRowCount: number;
  readonly changedRowCount: number;
  readonly unchangedBlockedRowCount: number;
  readonly safetyRelevantChangeCount: number;
  readonly blockedInvariantCount: number;
  readonly blockedInvariantPreserved: boolean;
  readonly unsafeChangeDetected: false;
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
  readonly diffChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotCheck[];
  readonly diffRows: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow[];
  readonly sourceBaselineEvidencePacketReport: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport;
  readonly sourceCurrentEvidencePacketReport: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport;
  readonly evidenceDiffSnapshotBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_BOUNDARY = {
  phase: 'Phase 13Q',
  diffSnapshotOnly: true,
  snapshotMode: 'evidence_diff_snapshot_only_no_migration_application',
  usesPhase13POperatorEvidencePacketOnly: true,
  comparesBaselineAndCurrentEvidencePacketsInMemoryOnly: true,
  doesNotReadBaselinePacketFromDisk: true,
  doesNotReadCurrentPacketFromDisk: true,
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
  allDiffRowsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY = {
  phase: 'Phase 13Q',
  metadataOnly: true,
  diffSnapshotOnly: true,
  evidenceOnly: true,
  noBaselineFileRuntimeRead: true,
  noCurrentFileRuntimeRead: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatuses: readonly ShadowScoreMetadataOnlyStorageDraftStatus[],
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatuses.includes('fail') || checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (sourceStatuses.includes('warning') || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const snapshotValue = (
  packet: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
  field: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotField,
): string | number | boolean => {
  if (field === 'canMutateBusinessRecords') return packet.safetyPolicy.canMutateBusinessRecords;
  return packet[field];
};

const diffRow = (
  field: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotField,
  baselinePacket: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
  currentPacket: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow => {
  const baselineValue = snapshotValue(baselinePacket, field);
  const currentValue = snapshotValue(currentPacket, field);
  const valueChanged = baselineValue !== currentValue;
  const blockedInvariantPreserved =
    currentPacket.operatorApproved === false &&
    currentPacket.allowed === false &&
    currentPacket.ready === false &&
    currentPacket.migrationApplicationAllowed === false &&
    currentPacket.sqlExecutionAllowed === false &&
    currentPacket.databaseConnectionAllowed === false &&
    currentPacket.databaseWriteAllowed === false &&
    currentPacket.routeExposed === false &&
    currentPacket.safetyPolicy.canMutateBusinessRecords === false;

  return {
    field,
    baselineValue,
    currentValue,
    diffStatus: valueChanged ? 'changed_still_blocked' : 'unchanged_blocked',
    valueChanged,
    safetyRelevant: true,
    blockedInvariant: true,
    blockedInvariantPreserved,
    migrationApplicationAllowed: false,
    sqlExecutionAllowed: false,
    databaseConnectionAllowed: false,
    databaseWriteAllowed: false,
    routeExposed: false,
    businessMutationAllowed: false,
  };
};

const DIFF_FIELDS: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotField[] = [
  'operatorApproved',
  'allowed',
  'ready',
  'overallReadinessDecision',
  'highestRiskSeverity',
  'evidenceItemCount',
  'blockedEvidenceItemCount',
  'migrationApplicationAllowed',
  'migrationApplicationPerformed',
  'migrationRunnerRegistered',
  'migrationRegistryMutated',
  'sqlExecutionAllowed',
  'databaseConnectionAllowed',
  'databaseWriteAllowed',
  'tableCreated',
  'routeExposed',
  'canMutateBusinessRecords',
];

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRows = (
  baselinePacket: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
  currentPacket: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport,
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRow[] => DIFF_FIELDS.map((field) => diffRow(field, baselinePacket, currentPacket));

export const buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotReport => {
  const sourceBaselineEvidencePacketReport = buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport(generatedAt);
  const sourceCurrentEvidencePacketReport = buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport(generatedAt);
  const diffRows = buildShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotRows(
    sourceBaselineEvidencePacketReport,
    sourceCurrentEvidencePacketReport,
  );
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const changedRowCount = diffRows.filter((row) => row.valueChanged).length;
  const safetyRelevantChangeCount = diffRows.filter((row) => row.valueChanged && row.safetyRelevant).length;
  const unchangedBlockedRowCount = diffRows.filter((row) => row.diffStatus === 'unchanged_blocked').length;
  const blockedInvariantCount = diffRows.filter((row) => row.blockedInvariant).length;
  const blockedInvariantPreserved = diffRows.every((row) => row.blockedInvariantPreserved === true);

  const diffChecks: ShadowScoreMetadataOnlyMigrationApplyEvidenceDiffSnapshotCheck[] = [
    check(
      'source-packets-remain-blocked',
      sourceBaselineEvidencePacketReport.status !== 'fail' &&
        sourceCurrentEvidencePacketReport.status !== 'fail' &&
        sourceBaselineEvidencePacketReport.migrationApplicationAllowed === false &&
        sourceCurrentEvidencePacketReport.migrationApplicationAllowed === false,
      'Phase 13Q requires both source evidence packets to remain blocked and non-applying.',
    ),
    check(
      'no-safety-relevant-change-detected',
      safetyRelevantChangeCount === 0,
      'Phase 13Q is a stable diff snapshot and must not surface any safety-relevant change.',
    ),
    check(
      'blocked-invariants-preserved',
      blockedInvariantPreserved,
      'Every diff row must preserve the no-apply, no-SQL, no-database, no-route, no-business-mutation invariant.',
    ),
    check(
      'diff-snapshot-does-not-apply-migration',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.noMigrationApplication === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.noDatabaseWrite === true,
      'The diff snapshot must not apply a migration, execute SQL, or write a database.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (!blockedInvariantPreserved) {
    errors.push(issue('blocked_invariant_not_preserved', 'Every diff row must preserve blocked migration invariants.', 'diffRows'));
  }

  const failedChecks = diffChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_evidence_diff_snapshot_check', entry.message, `diffChecks.${entry.name}`)));

  const status = summarizeStatus(
    [sourceBaselineEvidencePacketReport.status, sourceCurrentEvidencePacketReport.status],
    diffChecks,
    warnings,
    errors,
  );

  return {
    phase: 'Phase 13Q',
    snapshotKind: 'metadata_only_migration_apply_evidence_diff_snapshot',
    status,
    sourcePhase: 'Phase 13P',
    sourcePacketKind: 'metadata_only_migration_apply_operator_evidence_packet',
    snapshotMode: 'evidence_diff_snapshot_only_no_migration_application',
    diffSnapshotOnly: true,
    evidenceOnly: true,
    baselineLabel: 'baseline_operator_evidence_packet',
    currentLabel: 'current_operator_evidence_packet',
    baselinePacketStatus: sourceBaselineEvidencePacketReport.status,
    currentPacketStatus: sourceCurrentEvidencePacketReport.status,
    diffRowCount: diffRows.length,
    changedRowCount,
    unchangedBlockedRowCount,
    safetyRelevantChangeCount,
    blockedInvariantCount,
    blockedInvariantPreserved,
    unsafeChangeDetected: false,
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
    diffChecks,
    diffRows,
    sourceBaselineEvidencePacketReport,
    sourceCurrentEvidencePacketReport,
    evidenceDiffSnapshotBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_EVIDENCE_DIFF_SNAPSHOT_POLICY,
    generatedAt,
  };
};
