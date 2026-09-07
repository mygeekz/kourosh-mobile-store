// Phase 7K-Cleanup offline artifact DB module. Persistence behavior and SQL preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../../intelligence/artifacts/artifactSafety";
import type {
  ArtifactIntakeStatus,
  ArtifactQuarantineStatus,
  NormalizedArtifactIntakeInput,
  OfflineArtifactRecord,
  OfflineArtifactSummary,
} from "../../../../intelligence/artifacts/artifactIntakeTypes";
import {
  mapLatestArchivePackRow,
  mapLatestAuditSnapshotGovernanceArchiveRow,
  mapLatestAuditSnapshotGovernanceSignoffRow,
  mapLatestAuditSnapshotRow,
  mapLatestBinderRow,
  mapLatestFinalizationRow,
  mapLatestGovernanceSignoffRow,
  mapLatestRetentionGovernanceArchiveRow,
  mapLatestRetentionGovernanceReviewRow,
  mapLatestRetentionPolicyEvidenceRow,
  mapLatestReviewRow,
  mapOfflineArtifactRow,
  offlineArtifactSelect,
} from "./offlineArtifactMappers.db";

export const createOfflineArtifactIntakeRecord = async (payload: {
  input: NormalizedArtifactIntakeInput;
  sha256: string;
  validationMessages: string[];
  safetyNotes: string[];
  intakeStatus?: ArtifactIntakeStatus;
  quarantineStatus?: ArtifactQuarantineStatus;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifacts (
        artifact_name, artifact_kind, model_key, model_version, source,
        declared_format, declared_purpose, related_model_import_id, sha256, size_bytes,
        metadata_json, artifact_payload_json, validation_messages_json, safety_notes_json,
        intake_status, quarantine_status, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        can_mutate_business_records, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.input.artifactName,
      payload.input.artifactKind,
      payload.input.modelKey,
      payload.input.modelVersion,
      payload.input.source,
      payload.input.declaredFormat,
      payload.input.declaredPurpose,
      payload.input.relatedModelImportId == null ? null : String(payload.input.relatedModelImportId),
      payload.sha256,
      payload.input.sizeBytes,
      safeJson(payload.input.metadataJson),
      safeJson(payload.input.artifactPayloadJson),
      safeJson(payload.validationMessages),
      safeJson(payload.safetyNotes),
      payload.intakeStatus || "quarantined",
      payload.quarantineStatus || "quarantined",
      gate.artifactExecutionAllowed ? 1 : 0,
      gate.artifactAutoActivationAllowed ? 1 : 0,
      gate.modelExecutionAllowed ? 1 : 0,
      gate.inferenceEndpointExposed ? 1 : 0,
      gate.productionIntegrationAllowed ? 1 : 0,
      gate.canMutateBusinessRecords ? 1 : 0,
      payload.createdByUserId == null ? null : String(payload.createdByUserId),
    ],
  );
  return getOfflineArtifactById(result.lastID);
};

export const getOfflineArtifactById = async (idInput: unknown): Promise<OfflineArtifactRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactRow(row);
};

export const listOfflineArtifacts = async (limitInput?: unknown): Promise<OfflineArtifactRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactRow(row)).filter((row): row is OfflineArtifactRecord => row !== null);
};

export const findOfflineArtifactBySha256 = async (sha256Input: unknown): Promise<OfflineArtifactRecord | null> => {
  const sha256 = typeof sha256Input === "string" ? sha256Input.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(sha256)) return null;
  const row = await getAsync(`${offlineArtifactSelect} WHERE sha256 = ? ORDER BY created_at ASC, id ASC LIMIT 1`, [sha256]);
  return mapOfflineArtifactRow(row);
};

export const updateOfflineArtifactStatus = async (payload: {
  id: string | number;
  intakeStatus: ArtifactIntakeStatus;
  quarantineStatus?: ArtifactQuarantineStatus;
  safetyNotes?: string[];
}): Promise<OfflineArtifactRecord | null> => {
  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const current = await getOfflineArtifactById(id);
  if (!current) return null;
  await runAsync(
    `
      UPDATE ml_offline_artifacts
      SET intake_status = ?,
          quarantine_status = ?,
          safety_notes_json = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ?
    `,
    [
      payload.intakeStatus,
      payload.quarantineStatus || current.quarantineStatus,
      safeJson(payload.safetyNotes || current.safetyNotes),
      id,
    ],
  );
  return getOfflineArtifactById(id);
};

export const getOfflineArtifactSummary = async (): Promise<OfflineArtifactSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalArtifacts,
           SUM(CASE WHEN quarantine_status = 'quarantined' THEN 1 ELSE 0 END) AS quarantinedArtifacts,
           SUM(CASE WHEN intake_status = 'rejected' OR quarantine_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedArtifacts,
           SUM(CASE WHEN intake_status = 'needs_review' THEN 1 ELSE 0 END) AS needsReviewArtifacts,
           SUM(CASE WHEN intake_status = 'approved_for_shadow_review' THEN 1 ELSE 0 END) AS approvedForShadowReviewArtifacts,
           SUM(CASE WHEN intake_status = 'archived' OR quarantine_status = 'archived' THEN 1 ELSE 0 END) AS archivedArtifacts,
           COUNT(sha256) - COUNT(DISTINCT sha256) AS duplicateHashCount
    FROM ml_offline_artifacts
  `);
  const reviewAggregate = await getAsync(`
    SELECT COUNT(*) AS reviewRecords,
           SUM(CASE WHEN review_status = 'pending_review' OR review_status = 'needs_more_evidence' THEN 1 ELSE 0 END) AS pendingReviewRecords,
           SUM(CASE WHEN review_status = 'approved_for_shadow_review' THEN 1 ELSE 0 END) AS approvedReviewRecords,
           SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedReviewRecords,
           SUM(CASE WHEN signed_review_hash IS NOT NULL AND length(signed_review_hash) = 64 THEN 1 ELSE 0 END) AS signedReviewEvidenceRecords
    FROM ml_offline_artifact_reviews
  `).catch(() => null);
  const binderAggregate = await getAsync(`
    SELECT COUNT(*) AS binderReadinessRecords,
           SUM(CASE WHEN signed_binder_hash IS NOT NULL AND length(signed_binder_hash) = 64 THEN 1 ELSE 0 END) AS signedBinderManifestRecords
    FROM ml_offline_artifact_review_binders
  `).catch(() => null);
  const governanceSignoffAggregate = await getAsync(`
    SELECT COUNT(*) AS governanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'pending_governance_review' OR signoff_status = 'needs_governance_review' THEN 1 ELSE 0 END) AS pendingGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'approved_governance_readiness' THEN 1 ELSE 0 END) AS approvedGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedGovernanceSignoffRecords,
           SUM(CASE WHEN signed_governance_hash IS NOT NULL AND length(signed_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedGovernanceSignoffRecords
    FROM ml_offline_artifact_review_binder_governance_signoffs
  `).catch(() => null);
  const archivePackAggregate = await getAsync(`
    SELECT COUNT(*) AS archivePackReadinessRecords,
           SUM(CASE WHEN archive_pack_status = 'pending_archive_pack_review' OR archive_pack_status = 'needs_archive_pack_review' THEN 1 ELSE 0 END) AS pendingArchivePackRecords,
           SUM(CASE WHEN archive_pack_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedArchivePackRecords,
           SUM(CASE WHEN signed_archive_pack_hash IS NOT NULL AND length(signed_archive_pack_hash) = 64 THEN 1 ELSE 0 END) AS signedArchivePackManifestRecords
    FROM ml_offline_artifact_governance_signoff_archive_packs
  `).catch(() => null);
  const retentionPolicyAggregate = await getAsync(`
    SELECT COUNT(*) AS retentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'prepared_retention_policy_evidence' THEN 1 ELSE 0 END) AS preparedRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'pending_retention_policy_review' OR retention_status = 'needs_retention_policy_review' THEN 1 ELSE 0 END) AS pendingRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN signed_retention_policy_hash IS NOT NULL AND length(signed_retention_policy_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionPolicyEvidenceRecords
    FROM ml_offline_artifact_archive_pack_retention_policy_evidence
  `).catch(() => null);
  const retentionGovernanceReviewAggregate = await getAsync(`
    SELECT COUNT(*) AS retentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'approved_retention_governance_evidence' THEN 1 ELSE 0 END) AS approvedRetentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'pending_retention_governance_review' OR governance_review_status = 'needs_retention_governance_review' THEN 1 ELSE 0 END) AS pendingRetentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionGovernanceReviewRecords,
           SUM(CASE WHEN signed_retention_governance_hash IS NOT NULL AND length(signed_retention_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionGovernanceReviewRecords
    FROM ml_offline_artifact_retention_evidence_governance_reviews
  `).catch(() => null);

  const retentionGovernanceArchiveAggregate = await getAsync(`
    SELECT COUNT(*) AS retentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'prepared_retention_governance_archive' THEN 1 ELSE 0 END) AS preparedRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'pending_retention_archive_review' OR archive_status = 'needs_retention_archive_review' THEN 1 ELSE 0 END) AS pendingRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN signed_archive_readiness_hash IS NOT NULL AND length(signed_archive_readiness_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionGovernanceArchiveRecords
    FROM ml_offline_artifact_retention_governance_review_archives
  `).catch(() => null);
  const finalizationAggregate = await getAsync(`
    SELECT COUNT(*) AS finalizationRecords,
           SUM(CASE WHEN finalization_status = 'prepared_governance_archive_chain_finalization' THEN 1 ELSE 0 END) AS preparedFinalizationRecords,
           SUM(CASE WHEN finalization_status = 'pending_finalization_review' OR finalization_status = 'needs_finalization_review' THEN 1 ELSE 0 END) AS pendingFinalizationRecords,
           SUM(CASE WHEN finalization_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedFinalizationRecords,
           SUM(CASE WHEN signed_finalization_readiness_hash IS NOT NULL AND length(signed_finalization_readiness_hash) = 64 THEN 1 ELSE 0 END) AS signedFinalizationReadinessRecords
    FROM ml_offline_artifact_governance_archive_chain_finalizations
  `).catch(() => null);

  const auditSnapshotAggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'prepared_finalization_chain_audit_snapshot' THEN 1 ELSE 0 END) AS preparedAuditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'pending_audit_snapshot_review' OR audit_snapshot_status = 'needs_audit_snapshot_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotRecords,
           SUM(CASE WHEN signed_audit_snapshot_hash IS NOT NULL AND length(signed_audit_snapshot_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotRecords
    FROM ml_offline_artifact_finalization_chain_audit_snapshots
  `).catch(() => null);
  const auditSnapshotGovernanceSignoffAggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'accepted_audit_snapshot_governance_signoff' THEN 1 ELSE 0 END) AS acceptedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'pending_audit_snapshot_governance_review' OR signoff_status = 'needs_audit_snapshot_governance_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signed_audit_snapshot_governance_hash IS NOT NULL AND length(signed_audit_snapshot_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotGovernanceSignoffRecords
    FROM ml_offline_artifact_audit_snapshot_governance_signoffs
  `).catch(() => null);


  const auditSnapshotGovernanceArchiveAggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'prepared_audit_governance_archive' THEN 1 ELSE 0 END) AS preparedAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'pending_audit_governance_archive_review' OR archive_status = 'needs_audit_governance_archive_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN signed_audit_governance_archive_hash IS NOT NULL AND length(signed_audit_governance_archive_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotGovernanceArchiveRecords
    FROM ml_offline_artifact_audit_snapshot_governance_archives
  `).catch(() => null);

  const latestBinderRow = await getAsync(`
    SELECT id,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           latest_review_id AS latestReviewId,
           latest_review_hash AS latestReviewHash,
           binder_status AS binderStatus,
           binder_purpose AS binderPurpose,
           binder_manifest_json AS binderManifestJson,
           traceability_manifest_json AS traceabilityManifestJson,
           evidence_index_json AS evidenceIndexJson,
           export_readiness_notes_json AS exportReadinessNotesJson,
           safety_notes_json AS safetyNotesJson,
           signed_binder_hash AS signedBinderHash,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           export_file_created AS exportFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           created_by_user_id AS createdByUserId,
           created_at AS createdAt
    FROM ml_offline_artifact_review_binders
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestGovernanceSignoffRow = await getAsync(`
    SELECT id,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_binder_hash AS signedBinderHash,
           signoff_decision AS signoffDecision,
           signoff_status AS signoffStatus,
           signer_notes AS signerNotes,
           rejection_reason AS rejectionReason,
           governance_findings_json AS governanceFindingsJson,
           evidence_completeness_json AS evidenceCompletenessJson,
           risk_acceptance_json AS riskAcceptanceJson,
           safety_notes_json AS safetyNotesJson,
           signed_governance_hash AS signedGovernanceHash,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           export_file_created AS exportFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           binder_activation_allowed AS binderActivationAllowed,
           signer_user_id AS signerUserId,
           signer_display_name AS signerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_review_binder_governance_signoffs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestArchivePackRow = await getAsync(`
    SELECT id,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_governance_hash AS signedGovernanceHash,
           archive_pack_decision AS archivePackDecision,
           archive_pack_status AS archivePackStatus,
           archive_pack_purpose AS archivePackPurpose,
           archivist_notes AS archivistNotes,
           rejection_reason AS rejectionReason,
           archive_manifest_json AS archiveManifestJson,
           retention_manifest_json AS retentionManifestJson,
           evidence_index_json AS evidenceIndexJson,
           archive_readiness_notes_json AS archiveReadinessNotesJson,
           safety_notes_json AS safetyNotesJson,
           signed_archive_pack_hash AS signedArchivePackHash,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           archivist_display_name AS archivistDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_governance_signoff_archive_packs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestRetentionPolicyEvidenceRow = await getAsync(`
    SELECT id,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_archive_pack_hash AS signedArchivePackHash,
           retention_decision AS retentionDecision,
           retention_status AS retentionStatus,
           retention_policy_purpose AS retentionPolicyPurpose,
           retention_window_days AS retentionWindowDays,
           retain_until AS retainUntil,
           legal_hold_reason AS legalHoldReason,
           policy_notes AS policyNotes,
           rejection_reason AS rejectionReason,
           retention_policy_manifest_json AS retentionPolicyManifestJson,
           hold_evidence_json AS holdEvidenceJson,
           expiry_metadata_json AS expiryMetadataJson,
           purge_prohibition_evidence_json AS purgeProhibitionEvidenceJson,
           safety_notes_json AS safetyNotesJson,
           signed_retention_policy_hash AS signedRetentionPolicyHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           policy_reviewer_display_name AS policyReviewerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_archive_pack_retention_policy_evidence
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestRetentionGovernanceReviewRow = await getAsync(`
    SELECT id,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_retention_policy_hash AS signedRetentionPolicyHash,
           governance_review_decision AS governanceReviewDecision,
           governance_review_status AS governanceReviewStatus,
           governance_review_purpose AS governanceReviewPurpose,
           reviewer_notes AS reviewerNotes,
           rejection_reason AS rejectionReason,
           risk_confirmation_json AS riskConfirmationJson,
           hold_confirmation_json AS holdConfirmationJson,
           purge_prohibition_review_json AS purgeProhibitionReviewJson,
           evidence_completeness_json AS evidenceCompletenessJson,
           safety_notes_json AS safetyNotesJson,
           signed_retention_governance_hash AS signedRetentionGovernanceHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           governance_reviewer_display_name AS governanceReviewerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_retention_evidence_governance_reviews
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);

  const latestRetentionGovernanceArchiveRow = await getAsync(`
    SELECT id,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_retention_governance_hash AS signedRetentionGovernanceHash,
           archive_decision AS archiveDecision,
           archive_status AS archiveStatus,
           archive_purpose AS archivePurpose,
           archivist_notes AS archivistNotes,
           rejection_reason AS rejectionReason,
           archive_manifest_json AS archiveManifestJson,
           reviewer_trail_json AS reviewerTrailJson,
           retention_governance_chain_json AS retentionGovernanceChainJson,
           evidence_index_json AS evidenceIndexJson,
           safety_notes_json AS safetyNotesJson,
           signed_archive_readiness_hash AS signedArchiveReadinessHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           archivist_display_name AS archivistDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_retention_governance_review_archives
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestFinalizationRow = await getAsync(`
    SELECT id,
           retention_governance_archive_id AS retentionGovernanceArchiveId,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_archive_readiness_hash AS signedArchiveReadinessHash,
           finalization_decision AS finalizationDecision,
           finalization_status AS finalizationStatus,
           finalization_purpose AS finalizationPurpose,
           final_reviewer_notes AS finalReviewerNotes,
           rejection_reason AS rejectionReason,
           chain_completeness_json AS chainCompletenessJson,
           final_reviewer_acknowledgement_json AS finalReviewerAcknowledgementJson,
           immutable_evidence_summary_json AS immutableEvidenceSummaryJson,
           evidence_index_json AS evidenceIndexJson,
           safety_notes_json AS safetyNotesJson,
           signed_finalization_readiness_hash AS signedFinalizationReadinessHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           final_reviewer_display_name AS finalReviewerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_governance_archive_chain_finalizations
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);

  const latestAuditSnapshotRow = await getAsync(`
    SELECT id,
           finalization_id AS finalizationId,
           retention_governance_archive_id AS retentionGovernanceArchiveId,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_finalization_readiness_hash AS signedFinalizationReadinessHash,
           audit_snapshot_decision AS auditSnapshotDecision,
           audit_snapshot_status AS auditSnapshotStatus,
           snapshot_purpose AS snapshotPurpose,
           snapshot_timestamp AS snapshotTimestamp,
           audit_reviewer_notes AS auditReviewerNotes,
           rejection_reason AS rejectionReason,
           final_chain_digest_json AS finalChainDigestJson,
           reviewer_trail_digest_json AS reviewerTrailDigestJson,
           immutable_evidence_summary_json AS immutableEvidenceSummaryJson,
           evidence_index_json AS evidenceIndexJson,
           safety_notes_json AS safetyNotesJson,
           signed_audit_snapshot_hash AS signedAuditSnapshotHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           audit_reviewer_display_name AS auditReviewerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_finalization_chain_audit_snapshots
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestAuditSnapshotGovernanceSignoffRow = await getAsync(`
    SELECT id,
           audit_snapshot_id AS auditSnapshotId,
           finalization_id AS finalizationId,
           retention_governance_archive_id AS retentionGovernanceArchiveId,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_audit_snapshot_hash AS signedAuditSnapshotHash,
           signoff_decision AS signoffDecision,
           signoff_status AS signoffStatus,
           signoff_purpose AS signoffPurpose,
           audit_reviewer_signoff_notes AS auditReviewerSignoffNotes,
           exception_notes AS exceptionNotes,
           rejection_reason AS rejectionReason,
           snapshot_acceptance_json AS snapshotAcceptanceJson,
           evidence_confidence_json AS evidenceConfidenceJson,
           exception_notes_json AS exceptionNotesJson,
           safety_notes_json AS safetyNotesJson,
           signed_audit_snapshot_governance_hash AS signedAuditSnapshotGovernanceHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           governance_signer_display_name AS governanceSignerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_audit_snapshot_governance_signoffs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);


  const latestAuditSnapshotGovernanceArchiveRow = await getAsync(`
    SELECT id,
           audit_snapshot_governance_signoff_id AS auditSnapshotGovernanceSignoffId,
           audit_snapshot_id AS auditSnapshotId,
           finalization_id AS finalizationId,
           retention_governance_archive_id AS retentionGovernanceArchiveId,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_audit_snapshot_governance_hash AS signedAuditSnapshotGovernanceHash,
           archive_decision AS archiveDecision,
           archive_status AS archiveStatus,
           archive_purpose AS archivePurpose,
           archivist_notes AS archivistNotes,
           rejection_reason AS rejectionReason,
           governance_archive_manifest_json AS governanceArchiveManifestJson,
           signer_trail_json AS signerTrailJson,
           exception_summary_json AS exceptionSummaryJson,
           evidence_confidence_digest_json AS evidenceConfidenceDigestJson,
           safety_notes_json AS safetyNotesJson,
           signed_audit_governance_archive_hash AS signedAuditGovernanceArchiveHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           archivist_display_name AS archivistDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_audit_snapshot_governance_archives
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);

  const latestReviewRow = await getAsync(`
    SELECT id,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           review_decision AS reviewDecision,
           review_status AS reviewStatus,
           reviewer_notes AS reviewerNotes,
           rejection_reason AS rejectionReason,
           validation_findings_json AS validationFindingsJson,
           lineage_comparison_json AS lineageComparisonJson,
           evidence_json AS evidenceJson,
           safety_notes_json AS safetyNotesJson,
           signed_review_hash AS signedReviewHash,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           reviewer_user_id AS reviewerUserId,
           reviewer_display_name AS reviewerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_reviews
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  const latestArtifact = (await listOfflineArtifacts(1))[0] || null;
  return {
    totalArtifacts: Number(aggregate?.totalArtifacts || 0),
    quarantinedArtifacts: Number(aggregate?.quarantinedArtifacts || 0),
    rejectedArtifacts: Number(aggregate?.rejectedArtifacts || 0),
    needsReviewArtifacts: Number(aggregate?.needsReviewArtifacts || 0),
    approvedForShadowReviewArtifacts: Number(aggregate?.approvedForShadowReviewArtifacts || 0),
    archivedArtifacts: Number(aggregate?.archivedArtifacts || 0),
    duplicateHashCount: Number(aggregate?.duplicateHashCount || 0),
    reviewRecords: Number(reviewAggregate?.reviewRecords || 0),
    pendingReviewRecords: Number(reviewAggregate?.pendingReviewRecords || 0),
    approvedReviewRecords: Number(reviewAggregate?.approvedReviewRecords || 0),
    rejectedReviewRecords: Number(reviewAggregate?.rejectedReviewRecords || 0),
    signedReviewEvidenceRecords: Number(reviewAggregate?.signedReviewEvidenceRecords || 0),
    binderReadinessRecords: Number(binderAggregate?.binderReadinessRecords || 0),
    signedBinderManifestRecords: Number(binderAggregate?.signedBinderManifestRecords || 0),
    governanceSignoffRecords: Number(governanceSignoffAggregate?.governanceSignoffRecords || 0),
    pendingGovernanceSignoffRecords: Number(governanceSignoffAggregate?.pendingGovernanceSignoffRecords || 0),
    approvedGovernanceSignoffRecords: Number(governanceSignoffAggregate?.approvedGovernanceSignoffRecords || 0),
    rejectedGovernanceSignoffRecords: Number(governanceSignoffAggregate?.rejectedGovernanceSignoffRecords || 0),
    signedGovernanceSignoffRecords: Number(governanceSignoffAggregate?.signedGovernanceSignoffRecords || 0),
    archivePackReadinessRecords: Number(archivePackAggregate?.archivePackReadinessRecords || 0),
    signedArchivePackManifestRecords: Number(archivePackAggregate?.signedArchivePackManifestRecords || 0),
    pendingArchivePackRecords: Number(archivePackAggregate?.pendingArchivePackRecords || 0),
    rejectedArchivePackRecords: Number(archivePackAggregate?.rejectedArchivePackRecords || 0),
    retentionPolicyEvidenceRecords: Number(retentionPolicyAggregate?.retentionPolicyEvidenceRecords || 0),
    preparedRetentionPolicyEvidenceRecords: Number(retentionPolicyAggregate?.preparedRetentionPolicyEvidenceRecords || 0),
    pendingRetentionPolicyEvidenceRecords: Number(retentionPolicyAggregate?.pendingRetentionPolicyEvidenceRecords || 0),
    rejectedRetentionPolicyEvidenceRecords: Number(retentionPolicyAggregate?.rejectedRetentionPolicyEvidenceRecords || 0),
    signedRetentionPolicyEvidenceRecords: Number(retentionPolicyAggregate?.signedRetentionPolicyEvidenceRecords || 0),
    retentionGovernanceReviewRecords: Number(retentionGovernanceReviewAggregate?.retentionGovernanceReviewRecords || 0),
    approvedRetentionGovernanceReviewRecords: Number(retentionGovernanceReviewAggregate?.approvedRetentionGovernanceReviewRecords || 0),
    pendingRetentionGovernanceReviewRecords: Number(retentionGovernanceReviewAggregate?.pendingRetentionGovernanceReviewRecords || 0),
    rejectedRetentionGovernanceReviewRecords: Number(retentionGovernanceReviewAggregate?.rejectedRetentionGovernanceReviewRecords || 0),
    signedRetentionGovernanceReviewRecords: Number(retentionGovernanceReviewAggregate?.signedRetentionGovernanceReviewRecords || 0),
    retentionGovernanceArchiveRecords: Number(retentionGovernanceArchiveAggregate?.retentionGovernanceArchiveRecords || 0),
    preparedRetentionGovernanceArchiveRecords: Number(retentionGovernanceArchiveAggregate?.preparedRetentionGovernanceArchiveRecords || 0),
    pendingRetentionGovernanceArchiveRecords: Number(retentionGovernanceArchiveAggregate?.pendingRetentionGovernanceArchiveRecords || 0),
    rejectedRetentionGovernanceArchiveRecords: Number(retentionGovernanceArchiveAggregate?.rejectedRetentionGovernanceArchiveRecords || 0),
    signedRetentionGovernanceArchiveRecords: Number(retentionGovernanceArchiveAggregate?.signedRetentionGovernanceArchiveRecords || 0),
    finalizationRecords: Number(finalizationAggregate?.finalizationRecords || 0),
    preparedFinalizationRecords: Number(finalizationAggregate?.preparedFinalizationRecords || 0),
    pendingFinalizationRecords: Number(finalizationAggregate?.pendingFinalizationRecords || 0),
    rejectedFinalizationRecords: Number(finalizationAggregate?.rejectedFinalizationRecords || 0),
    signedFinalizationReadinessRecords: Number(finalizationAggregate?.signedFinalizationReadinessRecords || 0),
    auditSnapshotRecords: Number(auditSnapshotAggregate?.auditSnapshotRecords || 0),
    preparedAuditSnapshotRecords: Number(auditSnapshotAggregate?.preparedAuditSnapshotRecords || 0),
    pendingAuditSnapshotRecords: Number(auditSnapshotAggregate?.pendingAuditSnapshotRecords || 0),
    rejectedAuditSnapshotRecords: Number(auditSnapshotAggregate?.rejectedAuditSnapshotRecords || 0),
    signedAuditSnapshotRecords: Number(auditSnapshotAggregate?.signedAuditSnapshotRecords || 0),
    auditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.auditSnapshotGovernanceSignoffRecords || 0),
    acceptedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.acceptedAuditSnapshotGovernanceSignoffRecords || 0),
    pendingAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.pendingAuditSnapshotGovernanceSignoffRecords || 0),
    rejectedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.rejectedAuditSnapshotGovernanceSignoffRecords || 0),
    signedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.signedAuditSnapshotGovernanceSignoffRecords || 0),
    auditSnapshotGovernanceArchiveRecords: Number(auditSnapshotGovernanceArchiveAggregate?.auditSnapshotGovernanceArchiveRecords || 0),
    preparedAuditSnapshotGovernanceArchiveRecords: Number(auditSnapshotGovernanceArchiveAggregate?.preparedAuditSnapshotGovernanceArchiveRecords || 0),
    pendingAuditSnapshotGovernanceArchiveRecords: Number(auditSnapshotGovernanceArchiveAggregate?.pendingAuditSnapshotGovernanceArchiveRecords || 0),
    rejectedAuditSnapshotGovernanceArchiveRecords: Number(auditSnapshotGovernanceArchiveAggregate?.rejectedAuditSnapshotGovernanceArchiveRecords || 0),
    signedAuditSnapshotGovernanceArchiveRecords: Number(auditSnapshotGovernanceArchiveAggregate?.signedAuditSnapshotGovernanceArchiveRecords || 0),
    latestArtifact,
    latestReview: mapLatestReviewRow(latestReviewRow),
    latestBinder: mapLatestBinderRow(latestBinderRow),
    latestGovernanceSignoff: mapLatestGovernanceSignoffRow(latestGovernanceSignoffRow),
    latestArchivePack: mapLatestArchivePackRow(latestArchivePackRow),
    latestRetentionPolicyEvidence: mapLatestRetentionPolicyEvidenceRow(latestRetentionPolicyEvidenceRow),
    latestRetentionGovernanceReview: mapLatestRetentionGovernanceReviewRow(latestRetentionGovernanceReviewRow),
    latestRetentionGovernanceArchive: mapLatestRetentionGovernanceArchiveRow(latestRetentionGovernanceArchiveRow),
    latestFinalization: mapLatestFinalizationRow(latestFinalizationRow),
    latestAuditSnapshot: mapLatestAuditSnapshotRow(latestAuditSnapshotRow),
    latestAuditSnapshotGovernanceSignoff: mapLatestAuditSnapshotGovernanceSignoffRow(latestAuditSnapshotGovernanceSignoffRow),
    latestAuditSnapshotGovernanceArchive: mapLatestAuditSnapshotGovernanceArchiveRow(latestAuditSnapshotGovernanceArchiveRow),
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    artifactIntakeMode: "offline_quarantine_only",
    noBusinessMutation: true,
  };
};
