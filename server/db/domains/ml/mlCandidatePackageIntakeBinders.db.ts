import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidatePackageIntakeBinder = async (payload: {
  packageId?: number | null;
  packageKey: string;
  packageVersion: string;
  candidateModelKey?: string | null;
  candidateModelVersion?: string | null;
  importId?: number | null;
  artifactMetadataId?: number | null;
  approvalReviewId?: number | null;
  artifactChecksumSha256?: string | null;
  binderKey: string;
  binderVersion: string;
  intakeStatus: string;
  quarantineStatus: string;
  binderStatus: string;
  readinessScorePct?: number | null;
  intakeManifest: Record<string, unknown>;
  quarantineReadinessPlan: Record<string, unknown>;
  binderPayload: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
  signedBinderHash: string;
  modelExecutionAllowed: boolean;
  runtimeInvocationAllowed: boolean;
  inferenceEndpointExposed: boolean;
  artifactActivationAllowed: boolean;
  artifactBytesLoadingAllowed: boolean;
  artifactIntakeCanLoadBytes: boolean;
  artifactIntakeCanPersistBytes: boolean;
  quarantineCanExecuteArtifact: boolean;
  quarantineCanActivateArtifact: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  pricingChangeAllowed: boolean;
  reportsChangeAllowed: boolean;
  ledgerChangeAllowed: boolean;
  binderContainsExecutableBytes: boolean;
  packageBytesLoaded: boolean;
  packageBytesPersisted: boolean;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_candidate_package_intake_binders (
        package_id, package_key, package_version, candidate_model_key, candidate_model_version,
        import_id, artifact_metadata_id, approval_review_id, artifact_checksum_sha256,
        binder_key, binder_version, intake_status, quarantine_status, binder_status,
        readiness_score_pct, intake_manifest_json, quarantine_readiness_plan_json,
        binder_payload_json, safety_policy_json, summary_json, signed_binder_hash,
        model_execution_allowed, runtime_invocation_allowed, inference_endpoint_exposed,
        artifact_activation_allowed, artifact_bytes_loading_allowed, artifact_intake_can_load_bytes,
        artifact_intake_can_persist_bytes, quarantine_can_execute_artifact, quarantine_can_activate_artifact,
        production_integration_allowed, decision_automation_allowed, inventory_accounting_change_allowed,
        pricing_change_allowed, reports_change_allowed, ledger_change_allowed, binder_contains_executable_bytes,
        package_bytes_loaded, package_bytes_persisted, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.packageId || null,
      payload.packageKey,
      payload.packageVersion,
      payload.candidateModelKey || null,
      payload.candidateModelVersion || null,
      payload.importId || null,
      payload.artifactMetadataId || null,
      payload.approvalReviewId || null,
      payload.artifactChecksumSha256 || null,
      payload.binderKey,
      payload.binderVersion,
      payload.intakeStatus,
      payload.quarantineStatus,
      payload.binderStatus,
      payload.readinessScorePct ?? null,
      safeJson(payload.intakeManifest),
      safeJson(payload.quarantineReadinessPlan),
      safeJson(payload.binderPayload),
      safeJson(payload.safetyPolicy),
      safeJson(payload.summary),
      payload.signedBinderHash,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.artifactActivationAllowed ? 1 : 0,
      payload.artifactBytesLoadingAllowed ? 1 : 0,
      payload.artifactIntakeCanLoadBytes ? 1 : 0,
      payload.artifactIntakeCanPersistBytes ? 1 : 0,
      payload.quarantineCanExecuteArtifact ? 1 : 0,
      payload.quarantineCanActivateArtifact ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.pricingChangeAllowed ? 1 : 0,
      payload.reportsChangeAllowed ? 1 : 0,
      payload.ledgerChangeAllowed ? 1 : 0,
      payload.binderContainsExecutableBytes ? 1 : 0,
      payload.packageBytesLoaded ? 1 : 0,
      payload.packageBytesPersisted ? 1 : 0,
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_candidate_package_intake_binders WHERE id = ?`, [result.lastID]);
};

export const listMlCandidatePackageIntakeBinders = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
             binder_key AS binderKey, binder_version AS binderVersion, intake_status AS intakeStatus,
             quarantine_status AS quarantineStatus, binder_status AS binderStatus,
             readiness_score_pct AS readinessScorePct, signed_binder_hash AS signedBinderHash,
             model_execution_allowed AS modelExecutionAllowed,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             artifact_activation_allowed AS artifactActivationAllowed,
             artifact_bytes_loading_allowed AS artifactBytesLoadingAllowed,
             artifact_intake_can_load_bytes AS artifactIntakeCanLoadBytes,
             artifact_intake_can_persist_bytes AS artifactIntakeCanPersistBytes,
             quarantine_can_execute_artifact AS quarantineCanExecuteArtifact,
             quarantine_can_activate_artifact AS quarantineCanActivateArtifact,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             pricing_change_allowed AS pricingChangeAllowed,
             reports_change_allowed AS reportsChangeAllowed,
             ledger_change_allowed AS ledgerChangeAllowed,
             binder_contains_executable_bytes AS binderContainsExecutableBytes,
             package_bytes_loaded AS packageBytesLoaded,
             package_bytes_persisted AS packageBytesPersisted,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_intake_binders
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlCandidatePackageIntakeBindersByPackageId = async (packageIdInput: unknown, limitInput?: unknown) => {
  const packageId = Number(packageIdInput);
  if (!Number.isFinite(packageId) || packageId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
             binder_key AS binderKey, binder_version AS binderVersion, intake_status AS intakeStatus,
             quarantine_status AS quarantineStatus, binder_status AS binderStatus,
             readiness_score_pct AS readinessScorePct, signed_binder_hash AS signedBinderHash,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_package_intake_binders
      WHERE package_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [packageId, limit],
  );
};

export const getLatestMlCandidatePackageIntakeBinder = async () => getAsync(
  `
    SELECT id, package_id AS packageId, package_key AS packageKey, package_version AS packageVersion,
           candidate_model_key AS candidateModelKey, candidate_model_version AS candidateModelVersion,
           import_id AS importId, artifact_metadata_id AS artifactMetadataId,
           approval_review_id AS approvalReviewId, artifact_checksum_sha256 AS artifactChecksumSha256,
           binder_key AS binderKey, binder_version AS binderVersion, intake_status AS intakeStatus,
           quarantine_status AS quarantineStatus, binder_status AS binderStatus,
           readiness_score_pct AS readinessScorePct, signed_binder_hash AS signedBinderHash,
           created_at AS createdAt, user_id AS userId
    FROM ml_candidate_package_intake_binders
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `,
);

/* Phase 8B guard anchors: ml_candidate_package_intake_binders, recordMlCandidatePackageIntakeBinder, listMlCandidatePackageIntakeBinders, listMlCandidatePackageIntakeBindersByPackageId, getLatestMlCandidatePackageIntakeBinder */
