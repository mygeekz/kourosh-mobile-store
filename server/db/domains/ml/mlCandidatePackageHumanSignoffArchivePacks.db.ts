import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidatePackageHumanSignoffArchivePack = async (payload: {
  signoffId?: number | null;
  signoffKey: string;
  signoffVersion: string;
  signedReviewHash: string;
  binderId?: number | null;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  candidateModelKey?: string | null;
  candidateModelVersion?: string | null;
  importId?: number | null;
  artifactMetadataId?: number | null;
  approvalReviewId?: number | null;
  artifactChecksumSha256?: string | null;
  archivePackKey: string;
  archivePackVersion: string;
  archiveStatus: string;
  readinessScorePct?: number | null;
  archivePack: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedArchiveHash: string;
  archivePackIsProductionApproval: boolean;
  archivePackCanLoadPackageBytes: boolean;
  archivePackCanPersistArtifactBytes: boolean;
  archivePackCanExecuteModel: boolean;
  archivePackCanInvokeRuntime: boolean;
  archivePackCanExposeInferenceEndpoint: boolean;
  archivePackCanActivateArtifact: boolean;
  archivePackCanDeployArtifact: boolean;
  archivePackCanProductionScore: boolean;
  archivePackCanScheduleRetentionJobs: boolean;
  archivePackCanDeleteOrPurge: boolean;
  archivePackMetadataOnly: boolean;
  retentionPolicyLocked: boolean;
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
      INSERT INTO ml_candidate_package_human_signoff_archive_packs (
        signoff_id, signoff_key, signoff_version, signed_review_hash, binder_id,
        package_id, package_key, package_version, candidate_model_key, candidate_model_version,
        import_id, artifact_metadata_id, approval_review_id, artifact_checksum_sha256,
        archive_pack_key, archive_pack_version, archive_status, readiness_score_pct,
        archive_pack_json, retention_policy_json, safety_policy_json, summary_json,
        signed_archive_hash, archive_pack_is_production_approval,
        archive_pack_can_load_package_bytes, archive_pack_can_persist_artifact_bytes,
        archive_pack_can_execute_model, archive_pack_can_invoke_runtime,
        archive_pack_can_expose_inference_endpoint, archive_pack_can_activate_artifact,
        archive_pack_can_deploy_artifact, archive_pack_can_production_score,
        archive_pack_can_schedule_retention_jobs, archive_pack_can_delete_or_purge,
        archive_pack_metadata_only, retention_policy_locked, model_execution_allowed,
        runtime_invocation_allowed, inference_endpoint_exposed, artifact_activation_allowed,
        artifact_bytes_loading_allowed, production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, pricing_change_allowed, reports_change_allowed,
        ledger_change_allowed, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.signoffId || null,
      payload.signoffKey,
      payload.signoffVersion,
      payload.signedReviewHash,
      payload.binderId || null,
      payload.packageId || null,
      payload.packageKey,
      payload.packageVersion,
      payload.candidateModelKey || null,
      payload.candidateModelVersion || null,
      payload.importId || null,
      payload.artifactMetadataId || null,
      payload.approvalReviewId || null,
      payload.artifactChecksumSha256 || null,
      payload.archivePackKey,
      payload.archivePackVersion,
      payload.archiveStatus,
      payload.readinessScorePct ?? null,
      safeJson(payload.archivePack),
      safeJson(payload.retentionPolicy),
      safeJson(payload.safetyPolicy),
      safeJson(payload.summary),
      payload.signedArchiveHash,
      payload.archivePackIsProductionApproval ? 1 : 0,
      payload.archivePackCanLoadPackageBytes ? 1 : 0,
      payload.archivePackCanPersistArtifactBytes ? 1 : 0,
      payload.archivePackCanExecuteModel ? 1 : 0,
      payload.archivePackCanInvokeRuntime ? 1 : 0,
      payload.archivePackCanExposeInferenceEndpoint ? 1 : 0,
      payload.archivePackCanActivateArtifact ? 1 : 0,
      payload.archivePackCanDeployArtifact ? 1 : 0,
      payload.archivePackCanProductionScore ? 1 : 0,
      payload.archivePackCanScheduleRetentionJobs ? 1 : 0,
      payload.archivePackCanDeleteOrPurge ? 1 : 0,
      payload.archivePackMetadataOnly ? 1 : 0,
      payload.retentionPolicyLocked ? 1 : 0,
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
  return getAsync(`SELECT * FROM ml_candidate_package_human_signoff_archive_packs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageHumanSignoffArchivePacks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, signoff_id AS signoffId, signoff_key AS signoffKey, signoff_version AS signoffVersion,
             signed_review_hash AS signedReviewHash, binder_id AS binderId,
             package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
             archive_pack_key AS archivePackKey, archive_pack_version AS archivePackVersion,
             archive_status AS archiveStatus, readiness_score_pct AS readinessScorePct,
             signed_archive_hash AS signedArchiveHash,
             archive_pack_is_production_approval AS archivePackIsProductionApproval,
             archive_pack_can_load_package_bytes AS archivePackCanLoadPackageBytes,
             archive_pack_can_persist_artifact_bytes AS archivePackCanPersistArtifactBytes,
             archive_pack_can_execute_model AS archivePackCanExecuteModel,
             archive_pack_can_invoke_runtime AS archivePackCanInvokeRuntime,
             archive_pack_can_expose_inference_endpoint AS archivePackCanExposeInferenceEndpoint,
             archive_pack_can_activate_artifact AS archivePackCanActivateArtifact,
             archive_pack_can_deploy_artifact AS archivePackCanDeployArtifact,
             archive_pack_can_production_score AS archivePackCanProductionScore,
             archive_pack_can_schedule_retention_jobs AS archivePackCanScheduleRetentionJobs,
             archive_pack_can_delete_or_purge AS archivePackCanDeleteOrPurge,
             archive_pack_metadata_only AS archivePackMetadataOnly,
             retention_policy_locked AS retentionPolicyLocked,
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
      FROM ml_candidate_package_human_signoff_archive_packs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlCandidatePackageHumanSignoffArchivePacksBySignoffId = async (signoffIdInput: unknown, limitInput?: unknown) => {
  const signoffId = Number(signoffIdInput);
  if (!Number.isFinite(signoffId) || signoffId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, signoff_id AS signoffId, archive_pack_key AS archivePackKey,
             archive_pack_version AS archivePackVersion, archive_status AS archiveStatus,
             readiness_score_pct AS readinessScorePct, signed_archive_hash AS signedArchiveHash,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_human_signoff_archive_packs
      WHERE signoff_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [signoffId, limit],
  );
};

export const getLatestMlCandidatePackageHumanSignoffArchivePack = async () => getAsync(
  `
    SELECT id, signoff_id AS signoffId, signoff_key AS signoffKey, signoff_version AS signoffVersion,
           signed_review_hash AS signedReviewHash, package_id AS packageId,
           package_key AS packageKey, package_version AS packageVersion,
           archive_pack_key AS archivePackKey, archive_pack_version AS archivePackVersion,
           archive_status AS archiveStatus, readiness_score_pct AS readinessScorePct,
           signed_archive_hash AS signedArchiveHash, created_at AS createdAt, user_id AS userId
    FROM ml_candidate_package_human_signoff_archive_packs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `,
);

/* Phase 8D guard anchors: ml_candidate_package_human_signoff_archive_packs, recordMlCandidatePackageHumanSignoffArchivePack, listMlCandidatePackageHumanSignoffArchivePacks, listMlCandidatePackageHumanSignoffArchivePacksBySignoffId, getLatestMlCandidatePackageHumanSignoffArchivePack */
