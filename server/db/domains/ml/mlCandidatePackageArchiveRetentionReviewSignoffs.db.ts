import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type ArchiveRetentionReviewSignoffPayload = {
  retentionReviewBinderId?: number | null;
  retentionReviewBinderKey: string;
  retentionReviewBinderVersion: string;
  retentionReviewStatus?: string | null;
  signedRetentionReviewBinderHash: string;
  archivePackId?: number | null;
  archivePackKey?: string | null;
  archivePackVersion?: string | null;
  signedArchiveHash?: string | null;
  signoffId?: number | null;
  signoffKey?: string | null;
  signoffVersion?: string | null;
  signedReviewHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  retentionReviewSignoffKey: string;
  retentionReviewSignoffVersion: string;
  retentionReviewSignoffStatus: string;
  readinessScorePct?: number | null;
  signoffPacket: Record<string, unknown>;
  signoffPayload: Record<string, unknown>;
  retentionReviewSignoffPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedRetentionReviewSignoffHash: string;
  retentionReviewHumanSignoffRequired: boolean;
  retentionReviewSignoffEvidenceProvided: boolean;
  retentionReviewSignoffIsProductionApproval: boolean;
  retentionReviewSignoffCanLoadArchiveBytes: boolean;
  retentionReviewSignoffCanLoadPackageBytes: boolean;
  retentionReviewSignoffCanPersistArtifactBytes: boolean;
  retentionReviewSignoffCanExecuteModel: boolean;
  retentionReviewSignoffCanInvokeRuntime: boolean;
  retentionReviewSignoffCanExposeInferenceEndpoint: boolean;
  retentionReviewSignoffCanActivateArtifact: boolean;
  retentionReviewSignoffCanDeployArtifact: boolean;
  retentionReviewSignoffCanProductionScore: boolean;
  retentionReviewSignoffCanScheduleRetentionJobs: boolean;
  retentionReviewSignoffCanDeleteOrPurge: boolean;
  retentionReviewSignoffMetadataOnly: boolean;
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
  retention_review_binder_id AS retentionReviewBinderId,
  retention_review_binder_key AS retentionReviewBinderKey,
  retention_review_binder_version AS retentionReviewBinderVersion,
  retention_review_status AS retentionReviewStatus,
  signed_retention_review_binder_hash AS signedRetentionReviewBinderHash,
  archive_pack_id AS archivePackId,
  archive_pack_key AS archivePackKey,
  archive_pack_version AS archivePackVersion,
  signed_archive_hash AS signedArchiveHash,
  signoff_id AS signoffId,
  signoff_key AS signoffKey,
  signoff_version AS signoffVersion,
  signed_review_hash AS signedReviewHash,
  package_id AS packageId,
  package_key AS packageKey,
  package_version AS packageVersion,
  retention_review_signoff_key AS retentionReviewSignoffKey,
  retention_review_signoff_version AS retentionReviewSignoffVersion,
  retention_review_signoff_status AS retentionReviewSignoffStatus,
  readiness_score_pct AS readinessScorePct,
  signed_retention_review_signoff_hash AS signedRetentionReviewSignoffHash,
  retention_review_human_signoff_required AS retentionReviewHumanSignoffRequired,
  retention_review_signoff_evidence_provided AS retentionReviewSignoffEvidenceProvided,
  retention_review_signoff_is_production_approval AS retentionReviewSignoffIsProductionApproval,
  retention_review_signoff_can_load_archive_bytes AS retentionReviewSignoffCanLoadArchiveBytes,
  retention_review_signoff_can_load_package_bytes AS retentionReviewSignoffCanLoadPackageBytes,
  retention_review_signoff_can_persist_artifact_bytes AS retentionReviewSignoffCanPersistArtifactBytes,
  retention_review_signoff_can_execute_model AS retentionReviewSignoffCanExecuteModel,
  retention_review_signoff_can_invoke_runtime AS retentionReviewSignoffCanInvokeRuntime,
  retention_review_signoff_can_expose_inference_endpoint AS retentionReviewSignoffCanExposeInferenceEndpoint,
  retention_review_signoff_can_activate_artifact AS retentionReviewSignoffCanActivateArtifact,
  retention_review_signoff_can_deploy_artifact AS retentionReviewSignoffCanDeployArtifact,
  retention_review_signoff_can_production_score AS retentionReviewSignoffCanProductionScore,
  retention_review_signoff_can_schedule_retention_jobs AS retentionReviewSignoffCanScheduleRetentionJobs,
  retention_review_signoff_can_delete_or_purge AS retentionReviewSignoffCanDeleteOrPurge,
  retention_review_signoff_metadata_only AS retentionReviewSignoffMetadataOnly,
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

export const recordMlCandidatePackageArchiveRetentionReviewSignoff = async (payload: ArchiveRetentionReviewSignoffPayload) => {
  const columns = [
    "retention_review_binder_id", "retention_review_binder_key", "retention_review_binder_version", "retention_review_status", "signed_retention_review_binder_hash",
    "archive_pack_id", "archive_pack_key", "archive_pack_version", "signed_archive_hash",
    "signoff_id", "signoff_key", "signoff_version", "signed_review_hash",
    "package_id", "package_key", "package_version",
    "retention_review_signoff_key", "retention_review_signoff_version", "retention_review_signoff_status", "readiness_score_pct",
    "signoff_packet_json", "signoff_payload_json", "retention_review_signoff_policy_json", "safety_policy_json", "summary_json",
    "signed_retention_review_signoff_hash", "retention_review_human_signoff_required", "retention_review_signoff_evidence_provided",
    "retention_review_signoff_is_production_approval", "retention_review_signoff_can_load_archive_bytes", "retention_review_signoff_can_load_package_bytes",
    "retention_review_signoff_can_persist_artifact_bytes", "retention_review_signoff_can_execute_model", "retention_review_signoff_can_invoke_runtime",
    "retention_review_signoff_can_expose_inference_endpoint", "retention_review_signoff_can_activate_artifact", "retention_review_signoff_can_deploy_artifact",
    "retention_review_signoff_can_production_score", "retention_review_signoff_can_schedule_retention_jobs", "retention_review_signoff_can_delete_or_purge",
    "retention_review_signoff_metadata_only", "retention_policy_locked", "retention_execution_allowed", "automatic_deletion_allowed", "purge_job_allowed",
    "model_execution_allowed", "runtime_invocation_allowed", "inference_endpoint_exposed", "artifact_activation_allowed", "artifact_bytes_loading_allowed",
    "production_integration_allowed", "decision_automation_allowed", "inventory_accounting_change_allowed", "pricing_change_allowed", "reports_change_allowed", "ledger_change_allowed", "user_id",
  ];
  const values = [
    payload.retentionReviewBinderId || null,
    payload.retentionReviewBinderKey,
    payload.retentionReviewBinderVersion,
    payload.retentionReviewStatus || null,
    payload.signedRetentionReviewBinderHash,
    payload.archivePackId || null,
    payload.archivePackKey || null,
    payload.archivePackVersion || null,
    payload.signedArchiveHash || null,
    payload.signoffId || null,
    payload.signoffKey || null,
    payload.signoffVersion || null,
    payload.signedReviewHash || null,
    payload.packageId || null,
    payload.packageKey,
    payload.packageVersion,
    payload.retentionReviewSignoffKey,
    payload.retentionReviewSignoffVersion,
    payload.retentionReviewSignoffStatus,
    payload.readinessScorePct ?? null,
    safeJson(payload.signoffPacket),
    safeJson(payload.signoffPayload),
    safeJson(payload.retentionReviewSignoffPolicy),
    safeJson(payload.safetyPolicy),
    safeJson(payload.summary),
    payload.signedRetentionReviewSignoffHash,
    payload.retentionReviewHumanSignoffRequired ? 1 : 0,
    payload.retentionReviewSignoffEvidenceProvided ? 1 : 0,
    payload.retentionReviewSignoffIsProductionApproval ? 1 : 0,
    payload.retentionReviewSignoffCanLoadArchiveBytes ? 1 : 0,
    payload.retentionReviewSignoffCanLoadPackageBytes ? 1 : 0,
    payload.retentionReviewSignoffCanPersistArtifactBytes ? 1 : 0,
    payload.retentionReviewSignoffCanExecuteModel ? 1 : 0,
    payload.retentionReviewSignoffCanInvokeRuntime ? 1 : 0,
    payload.retentionReviewSignoffCanExposeInferenceEndpoint ? 1 : 0,
    payload.retentionReviewSignoffCanActivateArtifact ? 1 : 0,
    payload.retentionReviewSignoffCanDeployArtifact ? 1 : 0,
    payload.retentionReviewSignoffCanProductionScore ? 1 : 0,
    payload.retentionReviewSignoffCanScheduleRetentionJobs ? 1 : 0,
    payload.retentionReviewSignoffCanDeleteOrPurge ? 1 : 0,
    payload.retentionReviewSignoffMetadataOnly ? 1 : 0,
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
    `INSERT INTO ml_candidate_package_archive_retention_review_signoffs (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return getAsync(`SELECT * FROM ml_candidate_package_archive_retention_review_signoffs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageArchiveRetentionReviewSignoffs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_archive_retention_review_signoffs ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
};

export const listMlCandidatePackageArchiveRetentionReviewSignoffsByBinderId = async (retentionReviewBinderIdInput: unknown, limitInput?: unknown) => {
  const retentionReviewBinderId = Number(retentionReviewBinderIdInput);
  if (!Number.isFinite(retentionReviewBinderId)) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `SELECT ${selectColumns} FROM ml_candidate_package_archive_retention_review_signoffs WHERE retention_review_binder_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionReviewBinderId, limit],
  );
};

export const getLatestMlCandidatePackageArchiveRetentionReviewSignoff = async () => toRow(await getAsync(
  `SELECT ${selectColumns} FROM ml_candidate_package_archive_retention_review_signoffs ORDER BY created_at DESC, id DESC LIMIT 1`,
));

/* Phase 8F guard anchors: ml_candidate_package_archive_retention_review_signoffs, recordMlCandidatePackageArchiveRetentionReviewSignoff, listMlCandidatePackageArchiveRetentionReviewSignoffs, listMlCandidatePackageArchiveRetentionReviewSignoffsByBinderId, getLatestMlCandidatePackageArchiveRetentionReviewSignoff */
