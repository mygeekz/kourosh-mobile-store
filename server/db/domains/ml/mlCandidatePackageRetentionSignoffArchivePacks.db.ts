import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type RetentionSignoffArchivePackPayload = {
  retentionReviewSignoffId?: number | null;
  retentionReviewSignoffKey: string;
  retentionReviewSignoffVersion: string;
  retentionReviewSignoffStatus?: string | null;
  signedRetentionReviewSignoffHash: string;
  retentionReviewBinderId?: number | null;
  signedRetentionReviewBinderHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  retentionSignoffArchivePackKey: string;
  retentionSignoffArchivePackVersion: string;
  archiveStatus: string;
  readinessScorePct?: number | null;
  archivePacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedRetentionSignoffArchiveHash: string;
  retentionSignoffArchivePackIsProductionApproval: boolean;
  retentionSignoffArchivePackCanLoadArchiveBytes: boolean;
  retentionSignoffArchivePackCanLoadPackageBytes: boolean;
  retentionSignoffArchivePackCanPersistArtifactBytes: boolean;
  retentionSignoffArchivePackCanExecuteModel: boolean;
  retentionSignoffArchivePackCanInvokeRuntime: boolean;
  retentionSignoffArchivePackCanExposeInferenceEndpoint: boolean;
  retentionSignoffArchivePackCanActivateArtifact: boolean;
  retentionSignoffArchivePackCanDeployArtifact: boolean;
  retentionSignoffArchivePackCanProductionScore: boolean;
  retentionSignoffArchivePackCanScheduleRetentionJobs: boolean;
  retentionSignoffArchivePackCanDeleteOrPurge: boolean;
  retentionSignoffArchivePackMetadataOnly: boolean;
  retentionPolicyLocked: boolean;
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
  retention_review_signoff_id AS retentionReviewSignoffId,
  retention_review_signoff_key AS retentionReviewSignoffKey,
  retention_review_signoff_version AS retentionReviewSignoffVersion,
  retention_review_signoff_status AS retentionReviewSignoffStatus,
  signed_retention_review_signoff_hash AS signedRetentionReviewSignoffHash,
  retention_review_binder_id AS retentionReviewBinderId,
  signed_retention_review_binder_hash AS signedRetentionReviewBinderHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  retention_signoff_archive_pack_key AS retentionSignoffArchivePackKey,
  retention_signoff_archive_pack_version AS retentionSignoffArchivePackVersion,
  archive_status AS archiveStatus,
  readiness_score_pct AS readinessScorePct,
  signed_retention_signoff_archive_hash AS signedRetentionSignoffArchiveHash,
  retention_signoff_archive_pack_is_production_approval AS retentionSignoffArchivePackIsProductionApproval,
  retention_signoff_archive_pack_can_load_archive_bytes AS retentionSignoffArchivePackCanLoadArchiveBytes,
  retention_signoff_archive_pack_can_load_package_bytes AS retentionSignoffArchivePackCanLoadPackageBytes,
  retention_signoff_archive_pack_can_persist_artifact_bytes AS retentionSignoffArchivePackCanPersistArtifactBytes,
  retention_signoff_archive_pack_can_execute_model AS retentionSignoffArchivePackCanExecuteModel,
  retention_signoff_archive_pack_can_invoke_runtime AS retentionSignoffArchivePackCanInvokeRuntime,
  retention_signoff_archive_pack_can_expose_inference_endpoint AS retentionSignoffArchivePackCanExposeInferenceEndpoint,
  retention_signoff_archive_pack_can_activate_artifact AS retentionSignoffArchivePackCanActivateArtifact,
  retention_signoff_archive_pack_can_deploy_artifact AS retentionSignoffArchivePackCanDeployArtifact,
  retention_signoff_archive_pack_can_production_score AS retentionSignoffArchivePackCanProductionScore,
  retention_signoff_archive_pack_can_schedule_retention_jobs AS retentionSignoffArchivePackCanScheduleRetentionJobs,
  retention_signoff_archive_pack_can_delete_or_purge AS retentionSignoffArchivePackCanDeleteOrPurge,
  retention_signoff_archive_pack_metadata_only AS retentionSignoffArchivePackMetadataOnly,
  retention_policy_locked AS retentionPolicyLocked,
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

export const recordMlCandidatePackageRetentionSignoffArchivePack = async (payload: RetentionSignoffArchivePackPayload) => {
  const columns = [
    "retention_review_signoff_id", "retention_review_signoff_key", "retention_review_signoff_version", "retention_review_signoff_status", "signed_retention_review_signoff_hash",
    "retention_review_binder_id", "signed_retention_review_binder_hash",
    "package_id", "package_key", "package_version",
    "retention_signoff_archive_pack_key", "retention_signoff_archive_pack_version", "archive_status", "readiness_score_pct",
    "archive_packet_json", "retention_policy_json", "safety_policy_json", "summary_json", "signed_retention_signoff_archive_hash",
    "retention_signoff_archive_pack_is_production_approval", "retention_signoff_archive_pack_can_load_archive_bytes", "retention_signoff_archive_pack_can_load_package_bytes",
    "retention_signoff_archive_pack_can_persist_artifact_bytes", "retention_signoff_archive_pack_can_execute_model", "retention_signoff_archive_pack_can_invoke_runtime",
    "retention_signoff_archive_pack_can_expose_inference_endpoint", "retention_signoff_archive_pack_can_activate_artifact", "retention_signoff_archive_pack_can_deploy_artifact",
    "retention_signoff_archive_pack_can_production_score", "retention_signoff_archive_pack_can_schedule_retention_jobs", "retention_signoff_archive_pack_can_delete_or_purge",
    "retention_signoff_archive_pack_metadata_only", "retention_policy_locked", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.retentionReviewSignoffId || null,
    payload.retentionReviewSignoffKey,
    payload.retentionReviewSignoffVersion,
    payload.retentionReviewSignoffStatus || null,
    payload.signedRetentionReviewSignoffHash,
    payload.retentionReviewBinderId || null,
    payload.signedRetentionReviewBinderHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.retentionSignoffArchivePackKey,
    payload.retentionSignoffArchivePackVersion,
    payload.archiveStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.archivePacket),
    safeJson(payload.retentionPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedRetentionSignoffArchiveHash,
    payload.retentionSignoffArchivePackIsProductionApproval ? 1 : 0,
    payload.retentionSignoffArchivePackCanLoadArchiveBytes ? 1 : 0,
    payload.retentionSignoffArchivePackCanLoadPackageBytes ? 1 : 0,
    payload.retentionSignoffArchivePackCanPersistArtifactBytes ? 1 : 0,
    payload.retentionSignoffArchivePackCanExecuteModel ? 1 : 0,
    payload.retentionSignoffArchivePackCanInvokeRuntime ? 1 : 0,
    payload.retentionSignoffArchivePackCanExposeInferenceEndpoint ? 1 : 0,
    payload.retentionSignoffArchivePackCanActivateArtifact ? 1 : 0,
    payload.retentionSignoffArchivePackCanDeployArtifact ? 1 : 0,
    payload.retentionSignoffArchivePackCanProductionScore ? 1 : 0,
    payload.retentionSignoffArchivePackCanScheduleRetentionJobs ? 1 : 0,
    payload.retentionSignoffArchivePackCanDeleteOrPurge ? 1 : 0,
    payload.retentionSignoffArchivePackMetadataOnly ? 1 : 0,
    payload.retentionPolicyLocked ? 1 : 0,
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
    `INSERT INTO ml_candidate_package_retention_signoff_archive_packs (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_retention_signoff_archive_packs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageRetentionSignoffArchivePacks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_retention_signoff_archive_packs ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageRetentionSignoffArchivePacksBySignoffId = async (retentionReviewSignoffIdInput: unknown, limitInput?: unknown) => {
  const retentionReviewSignoffId = Number(retentionReviewSignoffIdInput);
  if (!Number.isFinite(retentionReviewSignoffId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_retention_signoff_archive_packs WHERE retention_review_signoff_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionReviewSignoffId, limit],
  );
};

export const getLatestMlCandidatePackageRetentionSignoffArchivePack = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_retention_signoff_archive_packs ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8G guard anchors: ml_candidate_package_retention_signoff_archive_packs, recordMlCandidatePackageRetentionSignoffArchivePack, listMlCandidatePackageRetentionSignoffArchivePacks, listMlCandidatePackageRetentionSignoffArchivePacksBySignoffId, getLatestMlCandidatePackageRetentionSignoffArchivePack */
