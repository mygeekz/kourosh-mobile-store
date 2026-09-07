import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type GovernanceSignoffArchiveFinalizationSummaryPackPayload = {
  governanceSignoffArchivePackId?: number | null;
  governanceSignoffArchivePackKey: string;
  governanceSignoffArchivePackVersion: string;
  governanceSignoffArchivePackStatus?: string | null;
  signedGovernanceSignoffArchiveHash: string;
  finalAuditSnapshotGovernanceSignoffId?: number | null;
  signedFinalAuditSnapshotGovernanceSignoffHash?: string | null;
  retentionArchiveFinalAuditSnapshotId?: number | null;
  signedRetentionArchiveFinalAuditSnapshotHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  governanceSignoffArchiveFinalizationSummaryPackKey: string;
  governanceSignoffArchiveFinalizationSummaryPackVersion: string;
  finalizationStatus: string;
  readinessScorePct?: number | null;
  finalizationSummaryPacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedGovernanceSignoffArchiveFinalizationSummaryHash: string;
  governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanProductionScore: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs: boolean;
  governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge: boolean;
  governanceSignoffArchiveFinalizationSummaryPackMetadataOnly: boolean;
  retentionPolicyLocked: boolean;
  finalAuditSnapshotImmutable: boolean;
  governanceSignoffArchiveFinalizationIsClosureSummary: boolean;
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
  governance_signoff_archive_pack_id AS governanceSignoffArchivePackId,
  governance_signoff_archive_pack_key AS governanceSignoffArchivePackKey,
  governance_signoff_archive_pack_version AS governanceSignoffArchivePackVersion,
  governance_signoff_archive_pack_status AS governanceSignoffArchivePackStatus,
  signed_governance_signoff_archive_hash AS signedGovernanceSignoffArchiveHash,
  final_audit_snapshot_governance_signoff_id AS finalAuditSnapshotGovernanceSignoffId,
  signed_final_audit_snapshot_governance_signoff_hash AS signedFinalAuditSnapshotGovernanceSignoffHash,
  retention_archive_final_audit_snapshot_id AS retentionArchiveFinalAuditSnapshotId,
  signed_retention_archive_final_audit_snapshot_hash AS signedRetentionArchiveFinalAuditSnapshotHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  governance_signoff_archive_finalization_summary_pack_key AS governanceSignoffArchiveFinalizationSummaryPackKey,
  governance_signoff_archive_finalization_summary_pack_version AS governanceSignoffArchiveFinalizationSummaryPackVersion,
  finalization_status AS finalizationStatus,
  readiness_score_pct AS readinessScorePct,
  signed_governance_signoff_archive_finalization_summary_hash AS signedGovernanceSignoffArchiveFinalizationSummaryHash,
  governance_signoff_archive_finalization_summary_pack_is_production_approval AS governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval,
  governance_signoff_archive_finalization_summary_pack_can_load_signoff_bytes AS governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes,
  governance_signoff_archive_finalization_summary_pack_can_load_snapshot_bytes AS governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes,
  governance_signoff_archive_finalization_summary_pack_can_load_archive_bytes AS governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes,
  governance_signoff_archive_finalization_summary_pack_can_load_package_bytes AS governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes,
  governance_signoff_archive_finalization_summary_pack_can_persist_artifact_bytes AS governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes,
  governance_signoff_archive_finalization_summary_pack_can_execute_model AS governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel,
  governance_signoff_archive_finalization_summary_pack_can_invoke_runtime AS governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime,
  governance_signoff_archive_finalization_summary_pack_can_expose_inference_endpoint AS governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint,
  governance_signoff_archive_finalization_summary_pack_can_activate_artifact AS governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact,
  governance_signoff_archive_finalization_summary_pack_can_deploy_artifact AS governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact,
  governance_signoff_archive_finalization_summary_pack_can_production_score AS governanceSignoffArchiveFinalizationSummaryPackCanProductionScore,
  governance_signoff_archive_finalization_summary_pack_can_schedule_retention_jobs AS governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
  governance_signoff_archive_finalization_summary_pack_can_delete_or_purge AS governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge,
  governance_signoff_archive_finalization_summary_pack_metadata_only AS governanceSignoffArchiveFinalizationSummaryPackMetadataOnly,
  retention_policy_locked AS retentionPolicyLocked,
  final_audit_snapshot_immutable AS finalAuditSnapshotImmutable,
  governance_signoff_archive_finalization_is_closure_summary AS governanceSignoffArchiveFinalizationIsClosureSummary,
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

export const recordMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack = async (payload: GovernanceSignoffArchiveFinalizationSummaryPackPayload) => {
  const columns = [
    "governance_signoff_archive_pack_id", "governance_signoff_archive_pack_key", "governance_signoff_archive_pack_version", "governance_signoff_archive_pack_status", "signed_governance_signoff_archive_hash",
    "final_audit_snapshot_governance_signoff_id", "signed_final_audit_snapshot_governance_signoff_hash",
    "retention_archive_final_audit_snapshot_id", "signed_retention_archive_final_audit_snapshot_hash",
    "package_id", "package_key", "package_version",
    "governance_signoff_archive_finalization_summary_pack_key", "governance_signoff_archive_finalization_summary_pack_version", "finalization_status", "readiness_score_pct",
    "finalization_summary_packet_json", "retention_policy_json", "safety_policy_json", "summary_json", "signed_governance_signoff_archive_finalization_summary_hash",
    "governance_signoff_archive_finalization_summary_pack_is_production_approval", "governance_signoff_archive_finalization_summary_pack_can_load_signoff_bytes", "governance_signoff_archive_finalization_summary_pack_can_load_snapshot_bytes",
    "governance_signoff_archive_finalization_summary_pack_can_load_archive_bytes", "governance_signoff_archive_finalization_summary_pack_can_load_package_bytes", "governance_signoff_archive_finalization_summary_pack_can_persist_artifact_bytes",
    "governance_signoff_archive_finalization_summary_pack_can_execute_model", "governance_signoff_archive_finalization_summary_pack_can_invoke_runtime", "governance_signoff_archive_finalization_summary_pack_can_expose_inference_endpoint",
    "governance_signoff_archive_finalization_summary_pack_can_activate_artifact", "governance_signoff_archive_finalization_summary_pack_can_deploy_artifact", "governance_signoff_archive_finalization_summary_pack_can_production_score",
    "governance_signoff_archive_finalization_summary_pack_can_schedule_retention_jobs", "governance_signoff_archive_finalization_summary_pack_can_delete_or_purge", "governance_signoff_archive_finalization_summary_pack_metadata_only",
    "retention_policy_locked", "final_audit_snapshot_immutable", "governance_signoff_archive_finalization_is_closure_summary", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.governanceSignoffArchivePackId || null,
    payload.governanceSignoffArchivePackKey,
    payload.governanceSignoffArchivePackVersion,
    payload.governanceSignoffArchivePackStatus || null,
    payload.signedGovernanceSignoffArchiveHash,
    payload.finalAuditSnapshotGovernanceSignoffId || null,
    payload.signedFinalAuditSnapshotGovernanceSignoffHash || null,
    payload.retentionArchiveFinalAuditSnapshotId || null,
    payload.signedRetentionArchiveFinalAuditSnapshotHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.governanceSignoffArchiveFinalizationSummaryPackKey,
    payload.governanceSignoffArchiveFinalizationSummaryPackVersion,
    payload.finalizationStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.finalizationSummaryPacket),
    safeJson(payload.retentionPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedGovernanceSignoffArchiveFinalizationSummaryHash,
    payload.governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanProductionScore ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationSummaryPackMetadataOnly ? 1 : 0,
    payload.retentionPolicyLocked ? 1 : 0,
    payload.finalAuditSnapshotImmutable ? 1 : 0,
    payload.governanceSignoffArchiveFinalizationIsClosureSummary ? 1 : 0,
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
    `INSERT INTO ml_candidate_package_governance_signoff_archive_finalization_summary_packs (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_governance_signoff_archive_finalization_summary_packs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_finalization_summary_packs ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacksByArchivePackId = async (governanceSignoffArchivePackIdInput: unknown, limitInput?: unknown) => {
  const governanceSignoffArchivePackId = Number(governanceSignoffArchivePackIdInput);
  if (!Number.isFinite(governanceSignoffArchivePackId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_finalization_summary_packs WHERE governance_signoff_archive_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [governanceSignoffArchivePackId, limit],
  );
};

export const getLatestMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_governance_signoff_archive_finalization_summary_packs ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8K guard anchors: ml_candidate_package_governance_signoff_archive_finalization_summary_packs, recordMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack, listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks, listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacksByArchivePackId, getLatestMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack */
