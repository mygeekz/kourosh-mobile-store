import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type GovernanceSignoffArchivePackPayload = {
  finalAuditSnapshotGovernanceSignoffId?: number | null;
  finalAuditSnapshotGovernanceSignoffKey: string;
  finalAuditSnapshotGovernanceSignoffVersion: string;
  finalAuditSnapshotGovernanceSignoffStatus?: string | null;
  signedFinalAuditSnapshotGovernanceSignoffHash: string;
  retentionArchiveFinalAuditSnapshotId?: number | null;
  signedRetentionArchiveFinalAuditSnapshotHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  governanceSignoffArchivePackKey: string;
  governanceSignoffArchivePackVersion: string;
  archiveStatus: string;
  readinessScorePct?: number | null;
  archivePacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedGovernanceSignoffArchiveHash: string;
  governanceSignoffArchivePackIsProductionApproval: boolean;
  governanceSignoffArchivePackCanLoadSignoffBytes: boolean;
  governanceSignoffArchivePackCanLoadSnapshotBytes: boolean;
  governanceSignoffArchivePackCanLoadArchiveBytes: boolean;
  governanceSignoffArchivePackCanLoadPackageBytes: boolean;
  governanceSignoffArchivePackCanPersistArtifactBytes: boolean;
  governanceSignoffArchivePackCanExecuteModel: boolean;
  governanceSignoffArchivePackCanInvokeRuntime: boolean;
  governanceSignoffArchivePackCanExposeInferenceEndpoint: boolean;
  governanceSignoffArchivePackCanActivateArtifact: boolean;
  governanceSignoffArchivePackCanDeployArtifact: boolean;
  governanceSignoffArchivePackCanProductionScore: boolean;
  governanceSignoffArchivePackCanScheduleRetentionJobs: boolean;
  governanceSignoffArchivePackCanDeleteOrPurge: boolean;
  governanceSignoffArchivePackMetadataOnly: boolean;
  retentionPolicyLocked: boolean;
  finalAuditSnapshotImmutable: boolean;
  governanceSignoffIsFinalAuditClosure: boolean;
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
  final_audit_snapshot_governance_signoff_id AS finalAuditSnapshotGovernanceSignoffId,
  final_audit_snapshot_governance_signoff_key AS finalAuditSnapshotGovernanceSignoffKey,
  final_audit_snapshot_governance_signoff_version AS finalAuditSnapshotGovernanceSignoffVersion,
  final_audit_snapshot_governance_signoff_status AS finalAuditSnapshotGovernanceSignoffStatus,
  signed_final_audit_snapshot_governance_signoff_hash AS signedFinalAuditSnapshotGovernanceSignoffHash,
  retention_archive_final_audit_snapshot_id AS retentionArchiveFinalAuditSnapshotId,
  signed_retention_archive_final_audit_snapshot_hash AS signedRetentionArchiveFinalAuditSnapshotHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  governance_signoff_archive_pack_key AS governanceSignoffArchivePackKey,
  governance_signoff_archive_pack_version AS governanceSignoffArchivePackVersion,
  archive_status AS archiveStatus,
  readiness_score_pct AS readinessScorePct,
  signed_governance_signoff_archive_hash AS signedGovernanceSignoffArchiveHash,
  governance_signoff_archive_pack_is_production_approval AS governanceSignoffArchivePackIsProductionApproval,
  governance_signoff_archive_pack_can_load_signoff_bytes AS governanceSignoffArchivePackCanLoadSignoffBytes,
  governance_signoff_archive_pack_can_load_snapshot_bytes AS governanceSignoffArchivePackCanLoadSnapshotBytes,
  governance_signoff_archive_pack_can_load_archive_bytes AS governanceSignoffArchivePackCanLoadArchiveBytes,
  governance_signoff_archive_pack_can_load_package_bytes AS governanceSignoffArchivePackCanLoadPackageBytes,
  governance_signoff_archive_pack_can_persist_artifact_bytes AS governanceSignoffArchivePackCanPersistArtifactBytes,
  governance_signoff_archive_pack_can_execute_model AS governanceSignoffArchivePackCanExecuteModel,
  governance_signoff_archive_pack_can_invoke_runtime AS governanceSignoffArchivePackCanInvokeRuntime,
  governance_signoff_archive_pack_can_expose_inference_endpoint AS governanceSignoffArchivePackCanExposeInferenceEndpoint,
  governance_signoff_archive_pack_can_activate_artifact AS governanceSignoffArchivePackCanActivateArtifact,
  governance_signoff_archive_pack_can_deploy_artifact AS governanceSignoffArchivePackCanDeployArtifact,
  governance_signoff_archive_pack_can_production_score AS governanceSignoffArchivePackCanProductionScore,
  governance_signoff_archive_pack_can_schedule_retention_jobs AS governanceSignoffArchivePackCanScheduleRetentionJobs,
  governance_signoff_archive_pack_can_delete_or_purge AS governanceSignoffArchivePackCanDeleteOrPurge,
  governance_signoff_archive_pack_metadata_only AS governanceSignoffArchivePackMetadataOnly,
  retention_policy_locked AS retentionPolicyLocked,
  final_audit_snapshot_immutable AS finalAuditSnapshotImmutable,
  governance_signoff_is_final_audit_closure AS governanceSignoffIsFinalAuditClosure,
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

export const recordMlCandidatePackageGovernanceSignoffArchivePack = async (payload: GovernanceSignoffArchivePackPayload) => {
  const columns = [
    "final_audit_snapshot_governance_signoff_id", "final_audit_snapshot_governance_signoff_key", "final_audit_snapshot_governance_signoff_version", "final_audit_snapshot_governance_signoff_status", "signed_final_audit_snapshot_governance_signoff_hash",
    "retention_archive_final_audit_snapshot_id", "signed_retention_archive_final_audit_snapshot_hash",
    "package_id", "package_key", "package_version",
    "governance_signoff_archive_pack_key", "governance_signoff_archive_pack_version", "archive_status", "readiness_score_pct",
    "archive_packet_json", "retention_policy_json", "safety_policy_json", "summary_json", "signed_governance_signoff_archive_hash",
    "governance_signoff_archive_pack_is_production_approval", "governance_signoff_archive_pack_can_load_signoff_bytes", "governance_signoff_archive_pack_can_load_snapshot_bytes",
    "governance_signoff_archive_pack_can_load_archive_bytes", "governance_signoff_archive_pack_can_load_package_bytes", "governance_signoff_archive_pack_can_persist_artifact_bytes",
    "governance_signoff_archive_pack_can_execute_model", "governance_signoff_archive_pack_can_invoke_runtime", "governance_signoff_archive_pack_can_expose_inference_endpoint",
    "governance_signoff_archive_pack_can_activate_artifact", "governance_signoff_archive_pack_can_deploy_artifact", "governance_signoff_archive_pack_can_production_score",
    "governance_signoff_archive_pack_can_schedule_retention_jobs", "governance_signoff_archive_pack_can_delete_or_purge", "governance_signoff_archive_pack_metadata_only",
    "retention_policy_locked", "final_audit_snapshot_immutable", "governance_signoff_is_final_audit_closure", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.finalAuditSnapshotGovernanceSignoffId || null,
    payload.finalAuditSnapshotGovernanceSignoffKey,
    payload.finalAuditSnapshotGovernanceSignoffVersion,
    payload.finalAuditSnapshotGovernanceSignoffStatus || null,
    payload.signedFinalAuditSnapshotGovernanceSignoffHash,
    payload.retentionArchiveFinalAuditSnapshotId || null,
    payload.signedRetentionArchiveFinalAuditSnapshotHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.governanceSignoffArchivePackKey,
    payload.governanceSignoffArchivePackVersion,
    payload.archiveStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.archivePacket),
    safeJson(payload.retentionPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedGovernanceSignoffArchiveHash,
    payload.governanceSignoffArchivePackIsProductionApproval ? 1 : 0,
    payload.governanceSignoffArchivePackCanLoadSignoffBytes ? 1 : 0,
    payload.governanceSignoffArchivePackCanLoadSnapshotBytes ? 1 : 0,
    payload.governanceSignoffArchivePackCanLoadArchiveBytes ? 1 : 0,
    payload.governanceSignoffArchivePackCanLoadPackageBytes ? 1 : 0,
    payload.governanceSignoffArchivePackCanPersistArtifactBytes ? 1 : 0,
    payload.governanceSignoffArchivePackCanExecuteModel ? 1 : 0,
    payload.governanceSignoffArchivePackCanInvokeRuntime ? 1 : 0,
    payload.governanceSignoffArchivePackCanExposeInferenceEndpoint ? 1 : 0,
    payload.governanceSignoffArchivePackCanActivateArtifact ? 1 : 0,
    payload.governanceSignoffArchivePackCanDeployArtifact ? 1 : 0,
    payload.governanceSignoffArchivePackCanProductionScore ? 1 : 0,
    payload.governanceSignoffArchivePackCanScheduleRetentionJobs ? 1 : 0,
    payload.governanceSignoffArchivePackCanDeleteOrPurge ? 1 : 0,
    payload.governanceSignoffArchivePackMetadataOnly ? 1 : 0,
    payload.retentionPolicyLocked ? 1 : 0,
    payload.finalAuditSnapshotImmutable ? 1 : 0,
    payload.governanceSignoffIsFinalAuditClosure ? 1 : 0,
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
    `INSERT INTO ml_candidate_package_governance_signoff_archive_packs (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_governance_signoff_archive_packs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageGovernanceSignoffArchivePacks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_packs ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageGovernanceSignoffArchivePacksBySignoffId = async (finalAuditSnapshotGovernanceSignoffIdInput: unknown, limitInput?: unknown) => {
  const finalAuditSnapshotGovernanceSignoffId = Number(finalAuditSnapshotGovernanceSignoffIdInput);
  if (!Number.isFinite(finalAuditSnapshotGovernanceSignoffId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_packs WHERE final_audit_snapshot_governance_signoff_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [finalAuditSnapshotGovernanceSignoffId, limit],
  );
};

export const getLatestMlCandidatePackageGovernanceSignoffArchivePack = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_packs ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8J guard anchors: ml_candidate_package_governance_signoff_archive_packs, recordMlCandidatePackageGovernanceSignoffArchivePack, listMlCandidatePackageGovernanceSignoffArchivePacks, listMlCandidatePackageGovernanceSignoffArchivePacksBySignoffId, getLatestMlCandidatePackageGovernanceSignoffArchivePack */
