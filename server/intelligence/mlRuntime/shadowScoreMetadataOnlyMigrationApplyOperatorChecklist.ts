import {
  buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
  type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision,
  type ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
} from './shadowScoreMetadataOnlyMigrationApplyReadinessSnapshot';
import {
  type ShadowScoreMetadataOnlyStorageDraftIssue,
  type ShadowScoreMetadataOnlyStorageDraftStatus,
} from './shadowScoreMetadataOnlyStorageSchemaDraft';

export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemId =
  | 'confirm_explicit_future_migration_phase_authorized'
  | 'confirm_readiness_snapshot_passes'
  | 'confirm_all_current_rows_remain_blocked'
  | 'confirm_sql_execution_still_disabled'
  | 'confirm_database_connection_still_disabled'
  | 'confirm_database_write_still_disabled'
  | 'confirm_migration_registry_still_unchanged'
  | 'confirm_no_route_exposure'
  | 'confirm_no_model_execution'
  | 'confirm_no_artifact_activation'
  | 'confirm_no_business_mutation';

export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemStatus =
  | 'required_not_completed'
  | 'blocked_by_current_phase';

export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItem = {
  readonly itemId: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemId;
  readonly title: string;
  readonly operatorAction: string;
  readonly sourceReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision;
  readonly status: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemStatus;
  readonly required: true;
  readonly completed: false;
  readonly blocksApply: true;
  readonly allowed: false;
  readonly migrationApplicationAllowed: false;
  readonly sqlExecutionAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly routeExposed: false;
  readonly businessMutationAllowed: false;
};

export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistCheck = {
  readonly name: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly message: string;
};

export type ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistReport = {
  readonly phase: 'Phase 13O';
  readonly checklistKind: 'metadata_only_migration_apply_operator_checklist';
  readonly status: ShadowScoreMetadataOnlyStorageDraftStatus;
  readonly sourcePhases: readonly ['Phase 13N'];
  readonly sourceSnapshotKind: 'metadata_only_migration_apply_readiness_snapshot';
  readonly checklistMode: 'operator_checklist_only_no_migration_application';
  readonly operatorChecklistOnly: true;
  readonly operatorApprovalRequired: true;
  readonly operatorApproved: false;
  readonly allowed: false;
  readonly ready: false;
  readonly overallReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision;
  readonly checklistItemCount: number;
  readonly requiredItemCount: number;
  readonly completedItemCount: 0;
  readonly blockedItemCount: number;
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
  readonly checklistChecks: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistCheck[];
  readonly checklistItems: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItem[];
  readonly sourceReadinessSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport;
  readonly operatorChecklistBoundary: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_BOUNDARY;
  readonly safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY;
  readonly generatedAt: string;
};

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_BOUNDARY = {
  phase: 'Phase 13O',
  operatorChecklistOnly: true,
  checklistMode: 'operator_checklist_only_no_migration_application',
  usesPhase13NReadinessSnapshotOnly: true,
  summarizesReadinessForManualOperatorReviewOnly: true,
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
  allChecklistItemsRequireFutureManualCompletion: true,
  stopsBeforeExecutableMigration: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY = {
  phase: 'Phase 13O',
  metadataOnly: true,
  operatorChecklistOnly: true,
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

const check = (name: string, passed: boolean, message: string): ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistCheck => ({
  name,
  status: passed ? 'pass' : 'fail',
  message,
});

const summarizeStatus = (
  sourceStatus: ShadowScoreMetadataOnlyStorageDraftStatus,
  checks: readonly ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistCheck[],
  warnings: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
  errors: readonly ShadowScoreMetadataOnlyStorageDraftIssue[],
): ShadowScoreMetadataOnlyStorageDraftStatus => {
  if (sourceStatus === 'fail' || checks.some((entry) => entry.status === 'fail') || errors.length > 0) return 'fail';
  if (sourceStatus === 'warning' || warnings.length > 0 || checks.some((entry) => entry.status === 'warning')) return 'warning';
  return 'pass';
};

const checklistItem = (
  itemId: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemId,
  title: string,
  operatorAction: string,
  sourceReadinessDecision: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotDecision,
  status: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItemStatus = 'required_not_completed',
): ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItem => ({
  itemId,
  title,
  operatorAction,
  sourceReadinessDecision,
  status,
  required: true,
  completed: false,
  blocksApply: true,
  allowed: false,
  migrationApplicationAllowed: false,
  sqlExecutionAllowed: false,
  databaseConnectionAllowed: false,
  databaseWriteAllowed: false,
  routeExposed: false,
  businessMutationAllowed: false,
});

export const buildShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItems = (
  readinessSnapshotReport: ShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport,
): ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItem[] => {
  const decision = readinessSnapshotReport.overallReadinessDecision;

  return [
    checklistItem(
      'confirm_explicit_future_migration_phase_authorized',
      'Confirm explicit future migration phase authorization',
      'Verify a later phase explicitly permits migration application before any SQL, database connection, or table creation is considered.',
      decision,
      'blocked_by_current_phase',
    ),
    checklistItem(
      'confirm_readiness_snapshot_passes',
      'Confirm readiness snapshot remains passing',
      'Review the Phase 13N readiness snapshot and confirm it remains status=pass or an accepted non-fail warning state.',
      decision,
    ),
    checklistItem(
      'confirm_all_current_rows_remain_blocked',
      'Confirm current apply rows remain blocked',
      'Confirm every current readiness snapshot row keeps allowed=false and migrationApplicationAllowed=false in Phase 13O.',
      decision,
    ),
    checklistItem(
      'confirm_sql_execution_still_disabled',
      'Confirm SQL execution is still disabled',
      'Confirm no SQL text is loaded from disk and no SQL execution pathway is introduced by this phase.',
      decision,
    ),
    checklistItem(
      'confirm_database_connection_still_disabled',
      'Confirm database connection is still disabled',
      'Confirm no database connection or shadow-score storage adapter is introduced by this phase.',
      decision,
    ),
    checklistItem(
      'confirm_database_write_still_disabled',
      'Confirm database write is still disabled',
      'Confirm no database write, repository write, table creation, or durable persistence is introduced by this phase.',
      decision,
    ),
    checklistItem(
      'confirm_migration_registry_still_unchanged',
      'Confirm migration registry is still unchanged',
      'Confirm no migration runner is registered and no migration registry is mutated in this phase.',
      decision,
    ),
    checklistItem(
      'confirm_no_route_exposure',
      'Confirm no route is exposed',
      'Confirm no backend route for import, storage, migration, inference, training, activation, or deployment is added.',
      decision,
    ),
    checklistItem(
      'confirm_no_model_execution',
      'Confirm no model execution is introduced',
      'Confirm backend still does not import joblib or sklearn, load model artifacts, or execute scoring.',
      decision,
    ),
    checklistItem(
      'confirm_no_artifact_activation',
      'Confirm no artifact activation is introduced',
      'Confirm candidate artifacts and score outputs remain evidence-only and are not activated.',
      decision,
    ),
    checklistItem(
      'confirm_no_business_mutation',
      'Confirm no business mutation is introduced',
      'Confirm inventory, accounting, pricing, ledger, reports, invoices, and other business records cannot be mutated by this checklist.',
      decision,
    ),
  ];
};

export const buildShadowScoreMetadataOnlyMigrationApplyOperatorChecklistReport = (
  generatedAt = new Date().toISOString(),
): ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistReport => {
  const sourceReadinessSnapshotReport = buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport(generatedAt);
  const checklistItems = buildShadowScoreMetadataOnlyMigrationApplyOperatorChecklistItems(sourceReadinessSnapshotReport);
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  const checklistChecks: ShadowScoreMetadataOnlyMigrationApplyOperatorChecklistCheck[] = [
    check(
      'source-readiness-snapshot-remains-blocked',
      sourceReadinessSnapshotReport.status !== 'fail' &&
        sourceReadinessSnapshotReport.ready === false &&
        sourceReadinessSnapshotReport.allowed === false &&
        sourceReadinessSnapshotReport.migrationApplicationAllowed === false,
      'Phase 13O requires the Phase 13N readiness snapshot to remain blocked and not ready.',
    ),
    check(
      'operator-checklist-does-not-approve-apply',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.operatorApproved === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.noMigrationApplication === true,
      'The operator checklist must not approve or apply a migration in Phase 13O.',
    ),
    check(
      'all-checklist-items-remain-uncompleted-and-blocking',
      checklistItems.length > 0 && checklistItems.every((item) => item.required === true && item.completed === false && item.blocksApply === true),
      'Every operator checklist item must remain required, uncompleted, and blocking in Phase 13O.',
    ),
    check(
      'sql-database-and-registry-remain-disabled',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.noRuntimeSqlExecution === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.noDatabaseConnection === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.noDatabaseWrite === true &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.noMigrationRegistryMutation === true,
      'SQL execution, database access, database writes, and migration registry mutation must remain disabled.',
    ),
    check(
      'backend-safety-flags-remain-false',
      SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.modelExecutionAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.inferenceEndpointExposed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.artifactActivationAllowed === false &&
        SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY.canMutateBusinessRecords === false,
      'Backend safety flags must remain disconnected from model execution, inference, activation, and business mutation.',
    ),
  ];

  if (checklistItems.some((item) => item.completed !== false || item.allowed !== false || item.migrationApplicationAllowed !== false)) {
    errors.push(issue('unsafe_operator_checklist_item', 'Every operator checklist item must remain uncompleted and blocked.', 'checklistItems'));
  }

  const failedChecks = checklistChecks.filter((entry) => entry.status === 'fail');
  errors.push(...failedChecks.map((entry) => issue('failed_operator_checklist_check', entry.message, `checklistChecks.${entry.name}`)));

  const status = summarizeStatus(sourceReadinessSnapshotReport.status, checklistChecks, warnings, errors);

  return {
    phase: 'Phase 13O',
    checklistKind: 'metadata_only_migration_apply_operator_checklist',
    status,
    sourcePhases: ['Phase 13N'],
    sourceSnapshotKind: 'metadata_only_migration_apply_readiness_snapshot',
    checklistMode: 'operator_checklist_only_no_migration_application',
    operatorChecklistOnly: true,
    operatorApprovalRequired: true,
    operatorApproved: false,
    allowed: false,
    ready: false,
    overallReadinessDecision: sourceReadinessSnapshotReport.overallReadinessDecision,
    checklistItemCount: checklistItems.length,
    requiredItemCount: checklistItems.length,
    completedItemCount: 0,
    blockedItemCount: checklistItems.length,
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
    checklistChecks,
    checklistItems,
    sourceReadinessSnapshotReport,
    operatorChecklistBoundary: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_BOUNDARY,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_CHECKLIST_POLICY,
    generatedAt,
  };
};
