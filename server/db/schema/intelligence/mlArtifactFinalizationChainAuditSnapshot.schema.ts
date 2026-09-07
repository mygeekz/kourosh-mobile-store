import { runAsync } from "../../query";

export const createMlArtifactFinalizationChainAuditSnapshotSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_finalization_chain_audit_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      signed_finalization_readiness_hash TEXT NOT NULL,
      audit_snapshot_decision TEXT NOT NULL,
      audit_snapshot_status TEXT NOT NULL,
      snapshot_purpose TEXT NOT NULL,
      snapshot_timestamp TEXT NOT NULL,
      audit_reviewer_notes TEXT NOT NULL,
      rejection_reason TEXT,
      final_chain_digest_json TEXT,
      reviewer_trail_digest_json TEXT,
      immutable_evidence_summary_json TEXT,
      evidence_index_json TEXT,
      safety_notes_json TEXT,
      signed_audit_snapshot_hash TEXT NOT NULL,
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
      audit_reviewer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_finalization_id ON ml_offline_artifact_finalization_chain_audit_snapshots(finalization_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_artifact_id ON ml_offline_artifact_finalization_chain_audit_snapshots(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_model_key ON ml_offline_artifact_finalization_chain_audit_snapshots(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_model_version ON ml_offline_artifact_finalization_chain_audit_snapshots(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_hash ON ml_offline_artifact_finalization_chain_audit_snapshots(signed_audit_snapshot_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_status ON ml_offline_artifact_finalization_chain_audit_snapshots(audit_snapshot_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_snapshot_timestamp ON ml_offline_artifact_finalization_chain_audit_snapshots(snapshot_timestamp)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshots_created ON ml_offline_artifact_finalization_chain_audit_snapshots(created_at)`);
};
