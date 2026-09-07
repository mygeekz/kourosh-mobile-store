import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type FinalAuditSnapshotGovernanceSignoffPayload = {
  retentionArchiveFinalAuditSnapshotId?: number | null;
  retentionArchiveFinalAuditSnapshotKey: string;
  retentionArchiveFinalAuditSnapshotVersion: string;
  retentionArchiveFinalAuditSnapshotStatus?: string | null;
  signedRetentionArchiveFinalAuditSnapshotHash: string;
  retentionSignoffArchivePackId?: number | null;
  signedRetentionSignoffArchiveHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  finalAuditSnapshotGovernanceSignoffKey: string;
  finalAuditSnapshotGovernanceSignoffVersion: string;
  signoffStatus: string;
  readinessScorePct?: number | null;
  signoffPacket: Record<string, unknown>;
  signoffEvidence: Record<string, unknown>;
  signoffPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedFinalAuditSnapshotGovernanceSignoffHash: string;
  finalAuditSnapshotGovernanceHumanSignoffRequired: boolean;
  finalAuditSnapshotGovernanceSignoffIsProductionApproval: boolean;
  finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes: boolean;
  finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes: boolean;
  finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes: boolean;
  finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes: boolean;
  finalAuditSnapshotGovernanceSignoffCanExecuteModel: boolean;
  finalAuditSnapshotGovernanceSignoffCanInvokeRuntime: boolean;
  finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint: boolean;
  finalAuditSnapshotGovernanceSignoffCanActivateArtifact: boolean;
  finalAuditSnapshotGovernanceSignoffCanDeployArtifact: boolean;
  finalAuditSnapshotGovernanceSignoffCanProductionScore: boolean;
  finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs: boolean;
  finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge: boolean;
  finalAuditSnapshotGovernanceSignoffMetadataOnly: boolean;
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
  retention_archive_final_audit_snapshot_id AS retentionArchiveFinalAuditSnapshotId,
  retention_archive_final_audit_snapshot_key AS retentionArchiveFinalAuditSnapshotKey,
  retention_archive_final_audit_snapshot_version AS retentionArchiveFinalAuditSnapshotVersion,
  retention_archive_final_audit_snapshot_status AS retentionArchiveFinalAuditSnapshotStatus,
  signed_retention_archive_final_audit_snapshot_hash AS signedRetentionArchiveFinalAuditSnapshotHash,
  retention_signoff_archive_pack_id AS retentionSignoffArchivePackId,
  signed_retention_signoff_archive_hash AS signedRetentionSignoffArchiveHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  final_audit_snapshot_governance_signoff_key AS finalAuditSnapshotGovernanceSignoffKey,
  final_audit_snapshot_governance_signoff_version AS finalAuditSnapshotGovernanceSignoffVersion,
  signoff_status AS signoffStatus,
  readiness_score_pct AS readinessScorePct,
  signed_final_audit_snapshot_governance_signoff_hash AS signedFinalAuditSnapshotGovernanceSignoffHash,
  final_audit_snapshot_governance_human_signoff_required AS finalAuditSnapshotGovernanceHumanSignoffRequired,
  final_audit_snapshot_governance_signoff_is_production_approval AS finalAuditSnapshotGovernanceSignoffIsProductionApproval,
  final_audit_snapshot_governance_signoff_can_load_snapshot_bytes AS finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes,
  final_audit_snapshot_governance_signoff_can_load_archive_bytes AS finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes,
  final_audit_snapshot_governance_signoff_can_load_package_bytes AS finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes,
  final_audit_snapshot_governance_signoff_can_persist_artifact_bytes AS finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes,
  final_audit_snapshot_governance_signoff_can_execute_model AS finalAuditSnapshotGovernanceSignoffCanExecuteModel,
  final_audit_snapshot_governance_signoff_can_invoke_runtime AS finalAuditSnapshotGovernanceSignoffCanInvokeRuntime,
  final_audit_snapshot_governance_signoff_can_expose_inference_endpoint AS finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint,
  final_audit_snapshot_governance_signoff_can_activate_artifact AS finalAuditSnapshotGovernanceSignoffCanActivateArtifact,
  final_audit_snapshot_governance_signoff_can_deploy_artifact AS finalAuditSnapshotGovernanceSignoffCanDeployArtifact,
  final_audit_snapshot_governance_signoff_can_production_score AS finalAuditSnapshotGovernanceSignoffCanProductionScore,
  final_audit_snapshot_governance_signoff_can_schedule_retention_jobs AS finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs,
  final_audit_snapshot_governance_signoff_can_delete_or_purge AS finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge,
  final_audit_snapshot_governance_signoff_metadata_only AS finalAuditSnapshotGovernanceSignoffMetadataOnly,
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

export const recordMlCandidatePackageFinalAuditSnapshotGovernanceSignoff = async (payload: FinalAuditSnapshotGovernanceSignoffPayload) => {
  const columns = [
    "retention_archive_final_audit_snapshot_id", "retention_archive_final_audit_snapshot_key", "retention_archive_final_audit_snapshot_version", "retention_archive_final_audit_snapshot_status", "signed_retention_archive_final_audit_snapshot_hash",
    "retention_signoff_archive_pack_id", "signed_retention_signoff_archive_hash",
    "package_id", "package_key", "package_version",
    "final_audit_snapshot_governance_signoff_key", "final_audit_snapshot_governance_signoff_version", "signoff_status", "readiness_score_pct",
    "signoff_packet_json", "signoff_evidence_json", "signoff_policy_json", "safety_policy_json", "summary_json", "signed_final_audit_snapshot_governance_signoff_hash",
    "final_audit_snapshot_governance_human_signoff_required", "final_audit_snapshot_governance_signoff_is_production_approval", "final_audit_snapshot_governance_signoff_can_load_snapshot_bytes",
    "final_audit_snapshot_governance_signoff_can_load_archive_bytes", "final_audit_snapshot_governance_signoff_can_load_package_bytes", "final_audit_snapshot_governance_signoff_can_persist_artifact_bytes",
    "final_audit_snapshot_governance_signoff_can_execute_model", "final_audit_snapshot_governance_signoff_can_invoke_runtime", "final_audit_snapshot_governance_signoff_can_expose_inference_endpoint",
    "final_audit_snapshot_governance_signoff_can_activate_artifact", "final_audit_snapshot_governance_signoff_can_deploy_artifact", "final_audit_snapshot_governance_signoff_can_production_score",
    "final_audit_snapshot_governance_signoff_can_schedule_retention_jobs", "final_audit_snapshot_governance_signoff_can_delete_or_purge", "final_audit_snapshot_governance_signoff_metadata_only",
    "retention_policy_locked", "final_audit_snapshot_immutable", "governance_signoff_is_final_audit_closure", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.retentionArchiveFinalAuditSnapshotId || null,
    payload.retentionArchiveFinalAuditSnapshotKey,
    payload.retentionArchiveFinalAuditSnapshotVersion,
    payload.retentionArchiveFinalAuditSnapshotStatus || null,
    payload.signedRetentionArchiveFinalAuditSnapshotHash,
    payload.retentionSignoffArchivePackId || null,
    payload.signedRetentionSignoffArchiveHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.finalAuditSnapshotGovernanceSignoffKey,
    payload.finalAuditSnapshotGovernanceSignoffVersion,
    payload.signoffStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.signoffPacket),
    safeJson(payload.signoffEvidence),
    safeJson(payload.signoffPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedFinalAuditSnapshotGovernanceSignoffHash,
    payload.finalAuditSnapshotGovernanceHumanSignoffRequired ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffIsProductionApproval ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanExecuteModel ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanInvokeRuntime ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanActivateArtifact ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanDeployArtifact ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanProductionScore ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge ? 1 : 0,
    payload.finalAuditSnapshotGovernanceSignoffMetadataOnly ? 1 : 0,
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
    `INSERT INTO ml_candidate_package_final_audit_snapshot_governance_signoffs (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_final_audit_snapshot_governance_signoffs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_final_audit_snapshot_governance_signoffs ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffsBySnapshotId = async (retentionArchiveFinalAuditSnapshotIdInput: unknown, limitInput?: unknown) => {
  const retentionArchiveFinalAuditSnapshotId = Number(retentionArchiveFinalAuditSnapshotIdInput);
  if (!Number.isFinite(retentionArchiveFinalAuditSnapshotId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_final_audit_snapshot_governance_signoffs WHERE retention_archive_final_audit_snapshot_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionArchiveFinalAuditSnapshotId, limit],
  );
};

export const getLatestMlCandidatePackageFinalAuditSnapshotGovernanceSignoff = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_final_audit_snapshot_governance_signoffs ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8I guard anchors: ml_candidate_package_final_audit_snapshot_governance_signoffs, recordMlCandidatePackageFinalAuditSnapshotGovernanceSignoff, listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffs, listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffsBySnapshotId, getLatestMlCandidatePackageFinalAuditSnapshotGovernanceSignoff */
