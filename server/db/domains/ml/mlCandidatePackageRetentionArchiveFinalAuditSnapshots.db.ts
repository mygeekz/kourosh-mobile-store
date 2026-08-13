import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type RetentionArchiveFinalAuditSnapshotPayload = {
  retentionSignoffArchivePackId?: number | null;
  retentionSignoffArchivePackKey: string;
  retentionSignoffArchivePackVersion: string;
  retentionSignoffArchivePackStatus?: string | null;
  signedRetentionSignoffArchiveHash: string;
  retentionReviewSignoffId?: number | null;
  signedRetentionReviewSignoffHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  retentionArchiveFinalAuditSnapshotKey: string;
  retentionArchiveFinalAuditSnapshotVersion: string;
  snapshotStatus: string;
  readinessScorePct?: number | null;
  auditSnapshot: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedRetentionArchiveFinalAuditSnapshotHash: string;
  retentionArchiveFinalAuditSnapshotIsProductionApproval: boolean;
  retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes: boolean;
  retentionArchiveFinalAuditSnapshotCanLoadPackageBytes: boolean;
  retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes: boolean;
  retentionArchiveFinalAuditSnapshotCanExecuteModel: boolean;
  retentionArchiveFinalAuditSnapshotCanInvokeRuntime: boolean;
  retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint: boolean;
  retentionArchiveFinalAuditSnapshotCanActivateArtifact: boolean;
  retentionArchiveFinalAuditSnapshotCanDeployArtifact: boolean;
  retentionArchiveFinalAuditSnapshotCanProductionScore: boolean;
  retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs: boolean;
  retentionArchiveFinalAuditSnapshotCanDeleteOrPurge: boolean;
  retentionArchiveFinalAuditSnapshotMetadataOnly: boolean;
  retentionPolicyLocked: boolean;
  finalAuditSnapshotImmutable: boolean;
  retentionExecutionAllowed: boolean;
  automaticDeletionAllowed: boolean;
  purgeJobAllowed: boolean;
  modelExecutionAllowed: boolean;
  runtimeInvocationAllowed: boolean;
  inferenceEndpointExposed: boolean;
  artifactActivationAllowed: boolean;
  artifactBytesLoadingAllowed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  pricingChangeAllowed: boolean;
  reportsChangeAllowed: boolean;
  ledgerChangeAllowed: boolean;
  userId?: number | null;
};

const toRow = (row: Record<string, unknown> | undefined | null) => row || null;

const selectColumns = `
  id,
  retention_signoff_archive_pack_id AS retentionSignoffArchivePackId,
  retention_signoff_archive_pack_key AS retentionSignoffArchivePackKey,
  retention_signoff_archive_pack_version AS retentionSignoffArchivePackVersion,
  retention_signoff_archive_pack_status AS retentionSignoffArchivePackStatus,
  signed_retention_signoff_archive_hash AS signedRetentionSignoffArchiveHash,
  retention_review_signoff_id AS retentionReviewSignoffId,
  signed_retention_review_signoff_hash AS signedRetentionReviewSignoffHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  retention_archive_final_audit_snapshot_key AS retentionArchiveFinalAuditSnapshotKey,
  retention_archive_final_audit_snapshot_version AS retentionArchiveFinalAuditSnapshotVersion,
  snapshot_status AS snapshotStatus,
  readiness_score_pct AS readinessScorePct,
  signed_retention_archive_final_audit_snapshot_hash AS signedRetentionArchiveFinalAuditSnapshotHash,
  retention_archive_final_audit_snapshot_is_production_approval AS retentionArchiveFinalAuditSnapshotIsProductionApproval,
  retention_archive_final_audit_snapshot_can_load_archive_bytes AS retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes,
  retention_archive_final_audit_snapshot_can_load_package_bytes AS retentionArchiveFinalAuditSnapshotCanLoadPackageBytes,
  retention_archive_final_audit_snapshot_can_persist_artifact_bytes AS retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes,
  retention_archive_final_audit_snapshot_can_execute_model AS retentionArchiveFinalAuditSnapshotCanExecuteModel,
  retention_archive_final_audit_snapshot_can_invoke_runtime AS retentionArchiveFinalAuditSnapshotCanInvokeRuntime,
  retention_archive_final_audit_snapshot_can_expose_inference_endpoint AS retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint,
  retention_archive_final_audit_snapshot_can_activate_artifact AS retentionArchiveFinalAuditSnapshotCanActivateArtifact,
  retention_archive_final_audit_snapshot_can_deploy_artifact AS retentionArchiveFinalAuditSnapshotCanDeployArtifact,
  retention_archive_final_audit_snapshot_can_production_score AS retentionArchiveFinalAuditSnapshotCanProductionScore,
  retention_archive_final_audit_snapshot_can_schedule_retention_jobs AS retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs,
  retention_archive_final_audit_snapshot_can_delete_or_purge AS retentionArchiveFinalAuditSnapshotCanDeleteOrPurge,
  retention_archive_final_audit_snapshot_metadata_only AS retentionArchiveFinalAuditSnapshotMetadataOnly,
  retention_policy_locked AS retentionPolicyLocked,
  final_audit_snapshot_immutable AS finalAuditSnapshotImmutable,
  retention_execution_allowed AS retentionExecutionAllowed,
  automatic_deletion_allowed AS automaticDeletionAllowed,
  purge_job_allowed AS purgeJobAllowed,
  model_execution_allowed AS modelExecutionAllowed,
  runtime_invocation_allowed AS runtimeInvocationAllowed,
  inference_endpoint_exposed AS inferenceEndpointExposed,
  artifact_activation_allowed AS artifactActivationAllowed,
  artifact_bytes_loading_allowed AS artifactBytesLoadingAllowed,
  production_integration_allowed AS productionIntegrationAllowed,
  decision_automation_allowed AS decisionAutomationAllowed,
  inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
  pricing_change_allowed AS pricingChangeAllowed,
  reports_change_allowed AS reportsChangeAllowed,
  ledger_change_allowed AS ledgerChangeAllowed,
  created_at AS createdAt,
  user_id AS userId
`;

export const recordMlCandidatePackageRetentionArchiveFinalAuditSnapshot = async (payload: RetentionArchiveFinalAuditSnapshotPayload) => {
  const columns = [
    "retention_signoff_archive_pack_id", "retention_signoff_archive_pack_key", "retention_signoff_archive_pack_version", "retention_signoff_archive_pack_status", "signed_retention_signoff_archive_hash",
    "retention_review_signoff_id", "signed_retention_review_signoff_hash",
    "package_id", "package_key", "package_version",
    "retention_archive_final_audit_snapshot_key", "retention_archive_final_audit_snapshot_version", "snapshot_status", "readiness_score_pct",
    "audit_snapshot_json", "retention_policy_json", "safety_policy_json", "summary_json", "signed_retention_archive_final_audit_snapshot_hash",
    "retention_archive_final_audit_snapshot_is_production_approval", "retention_archive_final_audit_snapshot_can_load_archive_bytes", "retention_archive_final_audit_snapshot_can_load_package_bytes",
    "retention_archive_final_audit_snapshot_can_persist_artifact_bytes", "retention_archive_final_audit_snapshot_can_execute_model", "retention_archive_final_audit_snapshot_can_invoke_runtime",
    "retention_archive_final_audit_snapshot_can_expose_inference_endpoint", "retention_archive_final_audit_snapshot_can_activate_artifact", "retention_archive_final_audit_snapshot_can_deploy_artifact",
    "retention_archive_final_audit_snapshot_can_production_score", "retention_archive_final_audit_snapshot_can_schedule_retention_jobs", "retention_archive_final_audit_snapshot_can_delete_or_purge",
    "retention_archive_final_audit_snapshot_metadata_only", "retention_policy_locked", "final_audit_snapshot_immutable", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.retentionSignoffArchivePackId || null,
    payload.retentionSignoffArchivePackKey,
    payload.retentionSignoffArchivePackVersion,
    payload.retentionSignoffArchivePackStatus || null,
    payload.signedRetentionSignoffArchiveHash,
    payload.retentionReviewSignoffId || null,
    payload.signedRetentionReviewSignoffHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.retentionArchiveFinalAuditSnapshotKey,
    payload.retentionArchiveFinalAuditSnapshotVersion,
    payload.snapshotStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.auditSnapshot),
    safeJson(payload.retentionPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedRetentionArchiveFinalAuditSnapshotHash,
    payload.retentionArchiveFinalAuditSnapshotIsProductionApproval ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanLoadPackageBytes ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanExecuteModel ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanInvokeRuntime ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanActivateArtifact ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanDeployArtifact ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanProductionScore ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotCanDeleteOrPurge ? 1 : 0,
    payload.retentionArchiveFinalAuditSnapshotMetadataOnly ? 1 : 0,
    payload.retentionPolicyLocked ? 1 : 0,
    payload.finalAuditSnapshotImmutable ? 1 : 0,
    payload.retentionExecutionAllowed ? 1 : 0,
    payload.automaticDeletionAllowed ? 1 : 0,
    payload.purgeJobAllowed ? 1 : 0,
    payload.modelExecutionAllowed ? 1 : 0,
    payload.runtimeInvocationAllowed ? 1 : 0,
    payload.inferenceEndpointExposed ? 1 : 0,
    payload.artifactActivationAllowed ? 1 : 0,
    payload.artifactBytesLoadingAllowed ? 1 : 0,
    payload.productionIntegrationAllowed ? 1 : 0,
    payload.decisionAutomationAllowed ? 1 : 0,
    payload.inventoryAccountingChangeAllowed ? 1 : 0,
    payload.pricingChangeAllowed ? 1 : 0,
    payload.reportsChangeAllowed ? 1 : 0,
    payload.ledgerChangeAllowed ? 1 : 0,
    payload.userId || null,
  ];
  const placeholders = columns.map(() => "?").join(", ");
  const result = await runAsync(
    `INSERT INTO ml_candidate_package_retention_archive_final_audit_snapshots (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_retention_archive_final_audit_snapshots WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageRetentionArchiveFinalAuditSnapshots = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_retention_archive_final_audit_snapshots ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageRetentionArchiveFinalAuditSnapshotsByArchivePackId = async (retentionSignoffArchivePackIdInput: unknown, limitInput?: unknown) => {
  const retentionSignoffArchivePackId = Number(retentionSignoffArchivePackIdInput);
  if (!Number.isFinite(retentionSignoffArchivePackId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_retention_archive_final_audit_snapshots WHERE retention_signoff_archive_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionSignoffArchivePackId, limit],
  );
};

export const getLatestMlCandidatePackageRetentionArchiveFinalAuditSnapshot = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_retention_archive_final_audit_snapshots ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8H guard anchors: ml_candidate_package_retention_archive_final_audit_snapshots, recordMlCandidatePackageRetentionArchiveFinalAuditSnapshot, listMlCandidatePackageRetentionArchiveFinalAuditSnapshots, listMlCandidatePackageRetentionArchiveFinalAuditSnapshotsByArchivePackId, getLatestMlCandidatePackageRetentionArchiveFinalAuditSnapshot */
