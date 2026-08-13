import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidateModelPackage = async (payload: {
  packageKey: string;
  packageVersion: string;
  candidateModelKey?: string | null;
  candidateModelVersion?: string | null;
  importId?: number | null;
  artifactMetadataId?: number | null;
  approvalReviewId?: number | null;
  datasetKey: string;
  datasetVersion: string;
  trainingPackageKey: string;
  trainingPackageVersion: string;
  packageStatus: string;
  readinessScorePct?: number | null;
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
  packageContainsExecutableBytes: boolean;
  artifactBinaryStored: boolean;
  packageManifest?: Record<string, unknown>;
  modelCard?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
  evaluationSnapshot?: Record<string, unknown>;
  safetyPolicy?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_candidate_model_packages (
        package_key, package_version, candidate_model_key, candidate_model_version,
        import_id, artifact_metadata_id, approval_review_id, dataset_key, dataset_version,
        training_package_key, training_package_version, package_status, readiness_score_pct,
        model_execution_allowed, runtime_invocation_allowed, inference_endpoint_exposed,
        artifact_activation_allowed, artifact_bytes_loading_allowed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, pricing_change_allowed,
        reports_change_allowed, ledger_change_allowed, package_contains_executable_bytes,
        artifact_binary_stored, package_manifest_json, model_card_json, lineage_json,
        evaluation_snapshot_json, safety_policy_json, summary_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.packageKey,
      payload.packageVersion,
      payload.candidateModelKey || null,
      payload.candidateModelVersion || null,
      payload.importId || null,
      payload.artifactMetadataId || null,
      payload.approvalReviewId || null,
      payload.datasetKey,
      payload.datasetVersion,
      payload.trainingPackageKey,
      payload.trainingPackageVersion,
      payload.packageStatus,
      payload.readinessScorePct ?? null,
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
      payload.packageContainsExecutableBytes ? 1 : 0,
      payload.artifactBinaryStored ? 1 : 0,
      safeJson(payload.packageManifest || {}),
      safeJson(payload.modelCard || {}),
      safeJson(payload.lineage || {}),
      safeJson(payload.evaluationSnapshot || {}),
      safeJson(payload.safetyPolicy || {}),
      safeJson(payload.summary || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_candidate_model_packages WHERE id = ?`, [result.lastID]);
};

export const listMlCandidateModelPackages = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey,
             candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, training_package_key AS trainingPackageKey,
             training_package_version AS trainingPackageVersion,
             package_status AS packageStatus, readiness_score_pct AS readinessScorePct,
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
             package_contains_executable_bytes AS packageContainsExecutableBytes,
             artifact_binary_stored AS artifactBinaryStored,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_model_packages
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlCandidateModelPackagesByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, package_key AS packageKey, package_version AS packageVersion,
             candidate_model_key AS candidateModelKey,
             candidate_model_version AS candidateModelVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             approval_review_id AS approvalReviewId, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, training_package_key AS trainingPackageKey,
             training_package_version AS trainingPackageVersion,
             package_status AS packageStatus, readiness_score_pct AS readinessScorePct,
             created_at AS createdAt, user_id AS userId
      FROM ml_candidate_model_packages
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};

/* Phase 8A guard anchors: ml_candidate_model_packages, recordMlCandidateModelPackage, listMlCandidateModelPackages, listMlCandidateModelPackagesByImportId */
