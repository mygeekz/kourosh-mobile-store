// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlModelArtifactMetadata = async (payload: {
  artifactKey: string;
  artifactVersion: string;
  importId?: number | null;
  safeBoundarySkeletonId?: number | null;
  governanceSignoffId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  artifactStatus?: string | null;
  artifactSource?: string | null;
  artifactStorageRef?: string | null;
  artifactChecksumSha256?: string | null;
  checksumAlgorithm?: string | null;
  algorithmFamily?: string | null;
  trainingPackageKey?: string | null;
  trainingPackageVersion?: string | null;
  datasetKey?: string | null;
  datasetVersion?: string | null;
  ownerName?: string | null;
  ownerTeam?: string | null;
  approvalTrailStatus?: string | null;
  registryStatus: string;
  runtimeLoadAllowed: boolean;
  artifactBinaryStored: boolean;
  inferenceEnabled: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  metadataContract?: Record<string, unknown>;
  artifactManifest?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
  approvalTrail?: Record<string, unknown>;
  safetyPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_model_artifact_metadata_registry (
        artifact_key, artifact_version, import_id, safe_boundary_skeleton_id,
        governance_signoff_id, model_key, model_version, artifact_status,
        artifact_source, artifact_storage_ref, artifact_checksum_sha256,
        checksum_algorithm, algorithm_family, training_package_key,
        training_package_version, dataset_key, dataset_version, owner_name,
        owner_team, approval_trail_status, registry_status,
        runtime_load_allowed, artifact_binary_stored, inference_enabled,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, metadata_contract_json,
        artifact_manifest_json, lineage_json, approval_trail_json,
        safety_policy_json, audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.artifactKey,
      payload.artifactVersion,
      payload.importId || null,
      payload.safeBoundarySkeletonId || null,
      payload.governanceSignoffId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.artifactStatus || "metadata_only",
      payload.artifactSource || null,
      payload.artifactStorageRef || null,
      payload.artifactChecksumSha256 || null,
      payload.checksumAlgorithm || "sha256",
      payload.algorithmFamily || null,
      payload.trainingPackageKey || null,
      payload.trainingPackageVersion || null,
      payload.datasetKey || null,
      payload.datasetVersion || null,
      payload.ownerName || null,
      payload.ownerTeam || null,
      payload.approvalTrailStatus || null,
      payload.registryStatus,
      payload.runtimeLoadAllowed ? 1 : 0,
      payload.artifactBinaryStored ? 1 : 0,
      payload.inferenceEnabled ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      safeJson(payload.metadataContract || {}),
      safeJson(payload.artifactManifest || {}),
      safeJson(payload.lineage || {}),
      safeJson(payload.approvalTrail || {}),
      safeJson(payload.safetyPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_model_artifact_metadata_registry WHERE id = ?`, [result.lastID]);
};

export const listMlModelArtifactMetadata = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, artifact_key AS artifactKey, artifact_version AS artifactVersion,
             import_id AS importId, safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             governance_signoff_id AS governanceSignoffId, model_key AS modelKey,
             model_version AS modelVersion, artifact_status AS artifactStatus,
             artifact_source AS artifactSource, artifact_storage_ref AS artifactStorageRef,
             artifact_checksum_sha256 AS artifactChecksumSha256,
             checksum_algorithm AS checksumAlgorithm, algorithm_family AS algorithmFamily,
             training_package_key AS trainingPackageKey,
             training_package_version AS trainingPackageVersion,
             dataset_key AS datasetKey, dataset_version AS datasetVersion,
             owner_name AS ownerName, owner_team AS ownerTeam,
             approval_trail_status AS approvalTrailStatus,
             registry_status AS registryStatus, runtime_load_allowed AS runtimeLoadAllowed,
             artifact_binary_stored AS artifactBinaryStored, inference_enabled AS inferenceEnabled,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             created_at AS createdAt, user_id AS userId
      FROM ml_model_artifact_metadata_registry
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlModelArtifactMetadataByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, artifact_key AS artifactKey, artifact_version AS artifactVersion,
             import_id AS importId, safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             governance_signoff_id AS governanceSignoffId, model_key AS modelKey,
             model_version AS modelVersion, artifact_status AS artifactStatus,
             artifact_source AS artifactSource, artifact_storage_ref AS artifactStorageRef,
             artifact_checksum_sha256 AS artifactChecksumSha256,
             checksum_algorithm AS checksumAlgorithm, algorithm_family AS algorithmFamily,
             training_package_key AS trainingPackageKey,
             training_package_version AS trainingPackageVersion,
             dataset_key AS datasetKey, dataset_version AS datasetVersion,
             owner_name AS ownerName, owner_team AS ownerTeam,
             approval_trail_status AS approvalTrailStatus,
             registry_status AS registryStatus, runtime_load_allowed AS runtimeLoadAllowed,
             artifact_binary_stored AS artifactBinaryStored, inference_enabled AS inferenceEnabled,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             created_at AS createdAt, user_id AS userId
      FROM ml_model_artifact_metadata_registry
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
