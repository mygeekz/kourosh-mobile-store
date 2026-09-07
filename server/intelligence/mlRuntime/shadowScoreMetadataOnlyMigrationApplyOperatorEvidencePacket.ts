import {
  buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
  type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision,
  type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
} from './shadowScoreMetadataOnlyMigrationApplyReadinessSnapshot';
import {
  type ShadowScoreMetadataOnlyMigrationApplyRiskCategory,
  type ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport,
  type ShadowScoreMetadataOnlyMigrationApplyRiskSeverity,
} from './shadowScoreMetadataOnlyMigrationApplyRiskClassification';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';


export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport = {
  readonly phase: 'Phase 13O';
  readonly checklistKind: 'metadata_only_migration_apply_operator_checklist';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly operatorChecklistOnly: true;
  readonly operatorApproved: false;
  readonly allowed: false;
  readonly ready: false;
  readonly checklistItemCount: 11;
  readonly requiredItemCount: 11;
  readonly completedItemCount: 0;
  readonly blockedItemCount: 11;
  readonly migrationApplicationAllowed: false;
  readonly sourceReadinessSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport;
};

export type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketSourcePhase = 'Phase 13O' | 'Phase 13N' | 'Phase 13M';

export type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItemId =
  | 'operator_checklist_evidence'
  | 'readiness_snapshot_evidence'
  | 'risk_classification_evidence';

export type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItem = {
  readonly evidenceId: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItemId;
  readonly sourcePhase: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketSourcePhase;
  readonly sourceKind:
    | 'metadata_only_migration_apply_operator_checklist'
    | 'metadata_only_migration_apply_readiness_snapshot'
    | 'metadata_only_migration_apply_risk_classification';
  readonly sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly evidenceSummary: string;
  readonly included: true;
  readonly evidenceOnly: true;
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

export type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport = {
  readonly phase: 'Phase 13P';
  readonly packetKind: 'metadata_only_migration_apply_operator_evidence_packet';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhases: readonly ['Phase 13O', 'Phase 13N', 'Phase 13M'];
  readonly sourceChecklistKind: 'metadata_only_migration_apply_operator_checklist';
  readonly sourceSnapshotKind: 'metadata_only_migration_apply_readiness_snapshot';
  readonly sourceClassificationKind: 'metadata_only_migration_apply_risk_classification';
  readonly packetMode: 'operator_evidence_packet_only_no_migration_application';
  readonly operatorEvidencePacketOnly: true;
  readonly evidenceOnly: true;
  readonly operatorApprovalRequired: true;
  readonly operatorApproved: false;
  readonly allowed: false;
  readonly ready: false;
  readonly overallReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision;
  readonly highestRiskSeverity: ShadowScoreMetadataOnlyMigrationApplyRiskSeverity;
  readonly categoryCounts: Record<ShadowScoreMetadataOnlyMigrationApplyRiskCategory, number>;
  readonly evidenceItemCount: number;
  readonly includedSourceCount: number;
  readonly blockedEvidenceItemCount: number;
  readonly checklistItemCount: number;
  readonly requiredChecklistItemCount: number;
  readonly completedChecklistItemCount: 0;
  readonly snapshotRowCount: number;
  readonly riskRowCount: number;
  readonly blockedRiskRowCount: number;
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
  readonly evidenceChecks: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketCheck[];
  readonly evidenceItems: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItem[];
  readonly sourceOperatorChecklistReport: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport;
  readonly sourceReadinessSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport;
  readonly sourceRiskClassificationReport: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport;
  readonly operatorEvidencePacketBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_BOUNDARY = {
  phase: 'Phase 13P',
  operatorEvidencePacketOnly: true,
  packetMode: 'operator_evidence_packet_only_no_migration_application',
  usesPhase13OOperatorChecklistOnly: true,
  usesPhase13NReadinessSnapshotOnly: true,
  usesPhase13MRiskClassificationOnly: true,
  packagesOperatorEvidenceForReviewOnly: true,
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
  allEvidenceItemsRemainBlocked: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY = {
  phase: 'Phase 13P',
  metadataOnly: true,
  operatorEvidencePacketOnly: true,
  evidenceOnly: true,
  operatorApprovalRequired: true,
  operatorApproved: false,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatuses: readonly ShadowScoreMetadataOnlyStorageDraftStatus[],
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatuses.includes('fail') || checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (sourceStatuses.includes('warning') || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const evidenceItem = (
  evidenceId: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItemId,
  sourcePhase: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketSourcePhase,
  sourceKind: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItem['sourceKind'],
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  evidenceSummary: string,
): ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItem => ({
  evidenceId,
  sourcePhase,
  sourceKind,
  sourceStatus,
  evidenceSummary,
  included: true,
  evidenceOnly: true,
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
});

export const buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItems = (
  sourceOperatorChecklistReport: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport,
  sourceReadinessSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
  sourceRiskClassificationReport: ShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport,
): ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItem[] => [
  evidenceItem(
    'operator_checklist_evidence',
    'Phase 13O',
    'metadata_only_migration_apply_operator_checklist',
    sourceOperatorChecklistReport.status,
    `Operator checklist remains operatorApproved=false with ${sourceOperatorChecklistReport.blockedItemCount} apply-blocking items.`,
  ),
  evidenceItem(
    'readiness_snapshot_evidence',
    'Phase 13N',
    'metadata_only_migration_apply_readiness_snapshot',
    sourceReadinessSnapshotReport.status,
    `Readiness snapshot remains ready=false with ${sourceReadinessSnapshotReport.blockedSnapshotRowCount} blocked rows.`,
  ),
  evidenceItem(
    'risk_classification_evidence',
    'Phase 13M',
    'metadata_only_migration_apply_risk_classification',
    sourceRiskClassificationReport.status,
    `Risk classification remains blocked with highest severity ${sourceRiskClassificationReport.highestRiskSeverity}.`,
  ),
];

export const buildShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport => {
  const sourceReadinessSnapshotReport = buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport(generatedAt);

  return {
    phase: 'Phase 13O',
    checklistKind: 'metadata_only_migration_apply_operator_checklist',
    status: sourceReadinessSnapshotReport.status,
    operatorChecklistOnly: true,
    operatorApproved: false,
    allowed: false,
    ready: false,
    checklistItemCount: 11,
    requiredItemCount: 11,
    completedItemCount: 0,
    blockedItemCount: 11,
    migrationApplicationAllowed: false,
    sourceReadinessSnapshotReport,
  };
};

export const buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport => {
  const sourceOperatorChecklistReport = buildShadowScoreMetadataOnlyMigrationApplyOperatorChecklistSourceReport(generatedAt);
  const sourceReadinessSnapshotReport = sourceOperatorChecklistReport.sourceReadinessSnapshotReport;
  const sourceRiskClassificationReport = sourceReadinessSnapshotReport.sourceRiskClassificationReport;
  const evidenceItems = buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItems(
    sourceOperatorChecklistReport,
    sourceReadinessSnapshotReport,
    sourceRiskClassificationReport,
  );
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const evidenceChecks: ShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketCheck[] = [
    check(
      'source-operator-checklist-remains-blocked',
      sourceOperatorChecklistReport.status !== 'fail' &&
        sourceOperatorChecklistReport.operatorApproved === false &&
        sourceOperatorChecklistReport.allowed === false &&
        sourceOperatorChecklistReport.migrationApplicationAllowed === false,
      'Phase 13P requires the Phase 13O operator checklist to remain unapproved and blocked.',
    ),
    check(
      'source-readiness-snapshot-remains-not-ready',
      sourceReadinessSnapshotReport.status !== 'fail' &&
        sourceReadinessSnapshotReport.ready === false &&
        sourceReadinessSnapshotReport.allowed === false &&
        sourceReadinessSnapshotReport.migrationApplicationAllowed === false,
      'Phase 13P requires the Phase 13N readiness snapshot to remain not ready and blocked.',
    ),
    check(
      'source-risk-classification-remains-blocked',
      sourceRiskClassificationReport.status !== 'fail' &&
        sourceRiskClassificationReport.allowed === false &&
        sourceRiskClassificationReport.migrationApplicationAllowed === false &&
        sourceRiskClassificationReport.blockedScenarioCount === sourceRiskClassificationReport.riskRowCount,
      'Phase 13P requires every Phase 13M risk classification row to remain blocked.',
    ),
    check(
      'evidence-packet-does-not-approve-apply',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.operatorApproved === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noMigrationApplication === true,
      'The evidence packet must not approve, accept, or apply a migration.',
    ),
    check(
      'sql-database-route-and-registry-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noDatabaseWrite === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noMigrationRegistryMutation === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.noRouteExposure === true,
      'SQL execution, database access, database writes, migration registry mutation, and route exposure must remain disabled.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (evidenceItems.some((item) => item.allowed !== false || item.actionable !== false || item.migrationApplicationAllowed !== false)) {
    errors.push(issue('unsafe_evidence_packet_item', 'Every evidence packet item must remain non-actionable and blocked.', 'evidenceItems'));
  }

  const failedChecks = evidenceChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_operator_evidence_packet_check', entry.message, `evidenceChecks.${entry.name}`)));

  const status = summarizeStatus(
    [sourceOperatorChecklistReport.status, sourceReadinessSnapshotReport.status, sourceRiskClassificationReport.status],
    evidenceChecks,
    warnings,
    errors,
  );

  return {
    phase: 'Phase 13P',
    packetKind: 'metadata_only_migration_apply_operator_evidence_packet',
    status,
    sourcePhases: ['Phase 13O', 'Phase 13N', 'Phase 13M'],
    sourceChecklistKind: 'metadata_only_migration_apply_operator_checklist',
    sourceSnapshotKind: 'metadata_only_migration_apply_readiness_snapshot',
    sourceClassificationKind: 'metadata_only_migration_apply_risk_classification',
    packetMode: 'operator_evidence_packet_only_no_migration_application',
    operatorEvidencePacketOnly: true,
    evidenceOnly: true,
    operatorApprovalRequired: true,
    operatorApproved: false,
    allowed: false,
    ready: false,
    overallReadinessDecision: sourceReadinessSnapshotReport.overallReadinessDecision,
    highestRiskSeverity: sourceRiskClassificationReport.highestRiskSeverity,
    categoryCounts: sourceRiskClassificationReport.categoryCounts,
    evidenceItemCount: evidenceItems.length,
    includedSourceCount: evidenceItems.length,
    blockedEvidenceItemCount: evidenceItems.length,
    checklistItemCount: sourceOperatorChecklistReport.checklistItemCount,
    requiredChecklistItemCount: sourceOperatorChecklistReport.requiredItemCount,
    completedChecklistItemCount: 0,
    snapshotRowCount: sourceReadinessSnapshotReport.snapshotRowCount,
    riskRowCount: sourceRiskClassificationReport.riskRowCount,
    blockedRiskRowCount: sourceRiskClassificationReport.blockedScenarioCount,
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
    evidenceChecks,
    evidenceItems,
    sourceOperatorChecklistReport,
    sourceReadinessSnapshotReport,
    sourceRiskClassificationReport,
    operatorEvidencePacketBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY,
    generatedAt,
  };
};
