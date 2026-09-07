import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidatePackageHumanReviewSignoff = async (payload: {
  binderId?: number | null;
  binderKey: string;
  binderVersion: string;
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  candidateModelKey?: string | null;
  candidateModelVersion?: string | null;
  importId?: number | null;
  artifactMetadataId?: number | null;
  approvalReviewId?: number | null;
  artifactChecksumSha256?: string | null;
  signoffKey: string;
  signoffVersion: string;
  reviewStatus: string;
  signoffStatus: string;
  readinessScorePct?: number | null;
  reviewPacket: Record<string, unknown>;
  signoffPayload: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedReviewHash: string;
  humanReviewRequired: boolean;
  humanReviewEvidenceProvided: boolean;
  signoffIsProductionApproval: boolean;
  signoffCanLoadPackageBytes: boolean;
  signoffCanPersistArtifactBytes: boolean;
  signoffCanExecuteModel: boolean;
  signoffCanInvokeRuntime: boolean;
  signoffCanExposeInferenceEndpoint: boolean;
  signoffCanActivateArtifact: boolean;
  signoffCanDeployArtifact: boolean;
  signoffCanProductionScore: boolean;
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
      INSERT INTO ml_candidate_package_human_review_signoffs (
        binder_id, binder_key, binder_version, package_id, package_key, package_version,
        candidate_model_key, candidate_model_version, import_id, artifact_metadata_id,
        approval_review_id, artifact_checksum_sha256, signoff_key, signoff_version,
        review_status, signoff_status, readiness_score_pct, review_packet_json,
        signoff_payload_json, safety_policy_json, summary_json, signed_review_hash,
        human_review_required, human_review_evidence_provided, signoff_is_production_approval,
        signoff_can_load_package_bytes, signoff_can_persist_artifact_bytes,
        signoff_can_execute_model, signoff_can_invoke_runtime, signoff_can_expose_inference_endpoint,
        signoff_can_activate_artifact, signoff_can_deploy_artifact, signoff_can_production_score,
        model_execution_allowed, runtime_invocation_allowed, inference_endpoint_exposed,
        artifact_activation_allowed, artifact_bytes_loading_allowed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, pricing_change_allowed,
        reports_change_allowed, ledger_change_allowed, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.binderId || null,
      payload.binderKey,
      payload.binderVersion,
      payload.packageId || null,
      payload.packageKey,
      payload.packageVersion,
      payload.candidateModelKey || null,
      payload.candidateModelVersion || null,
      payload.importId || null,
      payload.artifactMetadataId || null,
      payload.approvalReviewId || null,
      payload.artifactChecksumSha256 || null,
      payload.signoffKey,
      payload.signoffVersion,
      payload.reviewStatus,
      payload.signoffStatus,
      payload.readinessScorePct ?? null,
      safeJson(payload.reviewPacket),
      safeJson(payload.signoffPayload),
      safeJson(payload.safetyPolicy),
      safeJson(payload.summary),
      payload.signedReviewHash,
      payload.humanReviewRequired ? 1 : 0,
      payload.humanReviewEvidenceProvided ? 1 : 0,
      payload.signoffIsProductionApproval ? 1 : 0,
      payload.signoffCanLoadPackageBytes ? 1 : 0,
      payload.signoffCanPersistArtifactBytes ? 1 : 0,
      payload.signoffCanExecuteModel ? 1 : 0,
      payload.signoffCanInvokeRuntime ? 1 : 0,
      payload.signoffCanExposeInferenceEndpoint ? 1 : 0,
      payload.signoffCanActivateArtifact ? 1 : 0,
      payload.signoffCanDeployArtifact ? 1 : 0,
      payload.signoffCanProductionScore ? 1 : 0,
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
  return getAsync(`SELECT * FROM ml_candidate_package_human_review_signoffs WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageHumanReviewSignoffs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, binder_id AS binderId, binder_key AS binderKey, binder_version AS binderVersion,
             package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
             signoff_key AS signoffKey, signoff_version AS signoffVersion,
             review_status AS reviewStatus, signoff_status AS signoffStatus,
             readiness_score_pct AS readinessScorePct, signed_review_hash AS signedReviewHash,
             human_review_required AS humanReviewRequired,
             human_review_evidence_provided AS humanReviewEvidenceProvided,
             signoff_is_production_approval AS signoffIsProductionApproval,
             signoff_can_load_package_bytes AS signoffCanLoadPackageBytes,
             signoff_can_persist_artifact_bytes AS signoffCanPersistArtifactBytes,
             signoff_can_execute_model AS signoffCanExecuteModel,
             signoff_can_invoke_runtime AS signoffCanInvokeRuntime,
             signoff_can_expose_inference_endpoint AS signoffCanExposeInferenceEndpoint,
             signoff_can_activate_artifact AS signoffCanActivateArtifact,
             signoff_can_deploy_artifact AS signoffCanDeployArtifact,
             signoff_can_production_score AS signoffCanProductionScore,
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
      FROM ml_candidate_package_human_review_signoffs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlCandidatePackageHumanReviewSignoffsByBinderId = async (binderIdInput: unknown, limitInput?: unknown) => {
  const binderId = Number(binderIdInput);
  if (!Number.isFinite(binderId) || binderId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, binder_id AS binderId, binder_key AS binderKey, binder_version AS binderVersion,
             package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
             signoff_key AS signoffKey, signoff_version AS signoffVersion,
             review_status AS reviewStatus, signoff_status AS signoffStatus,
             readiness_score_pct AS readinessScorePct, signed_review_hash AS signedReviewHash,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_human_review_signoffs
      WHERE binder_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [binderId, limit],
  );
};

export const getLatestMlCandidatePackageHumanReviewSignoff = async () => getAsync(
  `
    SELECT id, binder_id AS binderId, binder_key AS binderKey, binder_version AS binderVersion,
           package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
           candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
           import_id AS importId, artifact_metadata_id AS artifactMetadataId,
           approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
           signoff_key AS signoffKey, signoff_version AS signoffVersion,
           review_status AS reviewStatus, signoff_status AS signoffStatus,
           readiness_score_pct AS readinessScorePct, signed_review_hash AS signedReviewHash,
           created_at AS createdAt, user_id AS userId
    FROM ml_candidate_package_human_review_signoffs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `,
);

/* Phase 8C guard anchors: ml_candidate_package_human_review_signoffs, recordMlCandidatePackageHumanReviewSignoff, listMlCandidatePackageHumanReviewSignoffs, listMlCandidatePackageHumanReviewSignoffsByBinderId, getLatestMlCandidatePackageHumanReviewSignoff */
