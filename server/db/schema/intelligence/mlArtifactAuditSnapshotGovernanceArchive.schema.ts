import { runAsync } from "../../query";

export const createMlArtifactAuditSnapshotGovernanceArchiveSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_audit_snapshot_governance_archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_snapshot_governance_signoff_id INTEGER NOT NULL,
      audit_snapshot_id INTEGER NOT NULL,
      finalization_id INTEGER NOT NULL,
      retention_governance_archive_id INTEGER NOT NULL,
      retention_governance_review_id INTEGER NOT NULL,
      retention_policy_evidence_id INTEGER NOT NULL,
      archive_pack_id INTEGER NOT NULL,
      signoff_id INTEGER NOT NULL,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_audit_snapshot_governance_hash TEXT NOT NULL,
      archive_decision TEXT NOT NULL,
      archive_status TEXT NOT NULL,
      archive_purpose TEXT NOT NULL,
      archivist_notes TEXT NOT NULL,
      rejection_reason TEXT,
      governance_archive_manifest_json TEXT,
      signer_trail_json TEXT,
      exception_summary_json TEXT,
      evidence_confidence_digest_json TEXT,
      safety_notes_json TEXT,
      signed_audit_governance_archive_hash TEXT NOT NULL,
      retention_job_scheduled INTEGER NOT NULL DEFAULT 0,
      deletion_or_purge_allowed INTEGER NOT NULL DEFAULT 0,
      archive_file_created INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_included INTEGER NOT NULL DEFAULT 0,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      archivist_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_signoff_id ON ml_offline_artifact_audit_snapshot_governance_archives(audit_snapshot_governance_signoff_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_artifact_id ON ml_offline_artifact_audit_snapshot_governance_archives(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_model_key ON ml_offline_artifact_audit_snapshot_governance_archives(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_model_version ON ml_offline_artifact_audit_snapshot_governance_archives(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_hash ON ml_offline_artifact_audit_snapshot_governance_archives(signed_audit_governance_archive_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_status ON ml_offline_artifact_audit_snapshot_governance_archives(archive_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_governance_archives_created ON ml_offline_artifact_audit_snapshot_governance_archives(created_at)`);
};
