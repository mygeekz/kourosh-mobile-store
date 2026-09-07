import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidatePackageArchiveRetentionReviewBinder = async (payload: {
  archivePackId?: number | null;
  archivePackKey: string;
  archivePackVersion: string;
  archiveStatus?: string | null;
  signedArchiveHash: string;
  signoffId?: number | null;
  signoffKey?: string | null;
  signoffVersion?: string | null;
  signedReviewHash?: string | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  retentionReviewBinderKey: string;
  retentionReviewBinderVersion: string;
  retentionReviewStatus: string;
  readinessScorePct?: number | null;
  retentionReviewBinder: Record<string, unknown>;
  retentionReviewPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedRetentionReviewBinderHash: string;
  retentionReviewBinderIsProductionApproval: boolean;
  retentionReviewBinderCanLoadArchiveBytes: boolean;
  retentionReviewBinderCanLoadPackageBytes: boolean;
  retentionReviewBinderCanPersistArtifactBytes: boolean;
  retentionReviewBinderCanExecuteModel: boolean;
  retentionReviewBinderCanInvokeRuntime: boolean;
  retentionReviewBinderCanExposeInferenceEndpoint: boolean;
  retentionReviewBinderCanActivateArtifact: boolean;
  retentionReviewBinderCanDeployArtifact: boolean;
  retentionReviewBinderCanProductionScore: boolean;
  retentionReviewBinderCanScheduleRetentionJobs: boolean;
  retentionReviewBinderCanDeleteOrPurge: boolean;
  retentionReviewBinderMetadataOnly: boolean;
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
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_candidate_package_archive_retention_review_binders (
        archive_pack_id, archive_pack_key, archive_pack_version, archive_status, signed_archive_hash,
        signoff_id, signoff_key, signoff_version, signed_review_hash,
        package_id, package_key, package_version,
        retention_review_binder_key, retention_review_binder_version, retention_review_status, readiness_score_pct,
        retention_review_binder_json, retention_review_policy_json, safety_policy_json, summary_json,
        signed_retention_review_binder_hash, retention_review_binder_is_production_approval,
        retention_review_binder_can_load_archive_bytes, retention_review_binder_can_load_package_bytes,
        retention_review_binder_can_persist_artifact_bytes, retention_review_binder_can_execute_model,
        retention_review_binder_can_invoke_runtime, retention_review_binder_can_expose_inference_endpoint,
        retention_review_binder_can_activate_artifact, retention_review_binder_can_deploy_artifact,
        retention_review_binder_can_production_score, retention_review_binder_can_schedule_retention_jobs,
        retention_review_binder_can_delete_or_purge, retention_review_binder_metadata_only,
        retention_policy_locked, retention_execution_allowed, automatic_deletion_allowed, purge_job_allowed,
        model_execution_allowed, runtime_invocation_allowed, inference_endpoint_exposed, artifact_activation_allowed,
        artifact_bytes_loading_allowed, production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, pricing_change_allowed, reports_change_allowed, ledger_change_allowed, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.archivePackId || null,
      payload.archivePackKey,
      payload.archivePackVersion,
      payload.archiveStatus || null,
      payload.signedArchiveHash,
      payload.signoffId || null,
      payload.signoffKey || null,
      payload.signoffVersion || null,
      payload.signedReviewHash || null,
      payload.packageId || null,
      payload.packageKey,
      payload.packageVersion,
      payload.retentionReviewBinderKey,
      payload.retentionReviewBinderVersion,
      payload.retentionReviewStatus,
      payload.readinessScorePct ?? null,
      safeJson(payload.retentionReviewBinder),
      safeJson(payload.retentionReviewPolicy),
      safeJson(payload.safetyPolicy),
      safeJson(payload.summary),
      payload.signedRetentionReviewBinderHash,
      payload.retentionReviewBinderIsProductionApproval ? 1 : 0,
      payload.retentionReviewBinderCanLoadArchiveBytes ? 1 : 0,
      payload.retentionReviewBinderCanLoadPackageBytes ? 1 : 0,
      payload.retentionReviewBinderCanPersistArtifactBytes ? 1 : 0,
      payload.retentionReviewBinderCanExecuteModel ? 1 : 0,
      payload.retentionReviewBinderCanInvokeRuntime ? 1 : 0,
      payload.retentionReviewBinderCanExposeInferenceEndpoint ? 1 : 0,
      payload.retentionReviewBinderCanActivateArtifact ? 1 : 0,
      payload.retentionReviewBinderCanDeployArtifact ? 1 : 0,
      payload.retentionReviewBinderCanProductionScore ? 1 : 0,
      payload.retentionReviewBinderCanScheduleRetentionJobs ? 1 : 0,
      payload.retentionReviewBinderCanDeleteOrPurge ? 1 : 0,
      payload.retentionReviewBinderMetadataOnly ? 1 : 0,
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
    ],
  );
  return getAsync(`SELECT * FROM ml_candidate_package_archive_retention_review_binders WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageArchiveRetentionReviewBinders = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, archive_pack_id AS archivePackId, archive_pack_key AS archivePackKey,
             archive_pack_version AS archivePackVersion, archive_status AS archiveStatus,
             signed_archive_hash AS signedArchiveHash, signoff_id AS signoffId,
             signoff_key AS signoffKey, signoff_version AS signoffVersion,
             signed_review_hash AS signedReviewHash, package_id AS packageId,
             package_key AS packageKey, package_version AS packageVersion,
             retention_review_binder_key AS retentionReviewBinderKey,
             retention_review_binder_version AS retentionReviewBinderVersion,
             retention_review_status AS retentionReviewStatus, readiness_score_pct AS readinessScorePct,
             signed_retention_review_binder_hash AS signedRetentionReviewBinderHash,
             retention_review_binder_is_production_approval AS retentionReviewBinderIsProductionApproval,
             retention_review_binder_can_load_archive_bytes AS retentionReviewBinderCanLoadArchiveBytes,
             retention_review_binder_can_load_package_bytes AS retentionReviewBinderCanLoadPackageBytes,
             retention_review_binder_can_persist_artifact_bytes AS retentionReviewBinderCanPersistArtifactBytes,
             retention_review_binder_can_execute_model AS retentionReviewBinderCanExecuteModel,
             retention_review_binder_can_invoke_runtime AS retentionReviewBinderCanInvokeRuntime,
             retention_review_binder_can_expose_inference_endpoint AS retentionReviewBinderCanExposeInferenceEndpoint,
             retention_review_binder_can_activate_artifact AS retentionReviewBinderCanActivateArtifact,
             retention_review_binder_can_deploy_artifact AS retentionReviewBinderCanDeployArtifact,
             retention_review_binder_can_production_score AS retentionReviewBinderCanProductionScore,
             retention_review_binder_can_schedule_retention_jobs AS retentionReviewBinderCanScheduleRetentionJobs,
             retention_review_binder_can_delete_or_purge AS retentionReviewBinderCanDeleteOrPurge,
             retention_review_binder_metadata_only AS retentionReviewBinderMetadataOnly,
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
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_archive_retention_review_binders
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlCandidatePackageArchiveRetentionReviewBindersByArchivePackId = async (archivePackIdInput: unknown, limitInput?: unknown) => {
  const archivePackId = Number(archivePackIdInput);
  if (!Number.isFinite(archivePackId) || archivePackId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, archive_pack_id AS archivePackId, retention_review_binder_key AS retentionReviewBinderKey,
             retention_review_binder_version AS retentionReviewBinderVersion,
             retention_review_status AS retentionReviewStatus, readiness_score_pct AS readinessScorePct,
             signed_retention_review_binder_hash AS signedRetentionReviewBinderHash,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_archive_retention_review_binders
      WHERE archive_pack_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [archivePackId, limit],
  );
};

export const getLatestMlCandidatePackageArchiveRetentionReviewBinder = async () => getAsync(
  `
    SELECT id, archive_pack_id AS archivePackId, archive_pack_key AS archivePackKey,
           archive_pack_version AS archivePackVersion, archive_status AS archiveStatus,
           signed_archive_hash AS signedArchiveHash, signoff_id AS signoffId,
           package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
           retention_review_binder_key AS retentionReviewBinderKey,
           retention_review_binder_version AS retentionReviewBinderVersion,
           retention_review_status AS retentionReviewStatus, readiness_score_pct AS readinessScorePct,
           signed_retention_review_binder_hash AS signedRetentionReviewBinderHash,
           created_at AS createdAt, user_id AS userId
    FROM ml_candidate_package_archive_retention_review_binders
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `,
);

/* Phase 8E guard anchors: ml_candidate_package_archive_retention_review_binders, recordMlCandidatePackageArchiveRetentionReviewBinder, listMlCandidatePackageArchiveRetentionReviewBinders, listMlCandidatePackageArchiveRetentionReviewBindersByArchivePackId, getLatestMlCandidatePackageArchiveRetentionReviewBinder */
