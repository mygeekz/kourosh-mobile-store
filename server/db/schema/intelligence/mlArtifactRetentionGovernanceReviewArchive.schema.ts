import { runAsync } from "../../query";

export const createMlArtifactRetentionGovernanceReviewArchiveSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_retention_governance_review_archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retention_governance_review_id INTEGER NOT NULL,
      retention_policy_evidence_id INTEGER NOT NULL,
      archive_pack_id INTEGER NOT NULL,
      signoff_id INTEGER NOT NULL,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_retention_governance_hash TEXT NOT NULL,
      archive_decision TEXT NOT NULL,
      archive_status TEXT NOT NULL,
      archive_purpose TEXT NOT NULL,
      archivist_notes TEXT NOT NULL,
      rejection_reason TEXT,
      archive_manifest_json TEXT,
      reviewer_trail_json TEXT,
      retention_governance_chain_json TEXT,
      evidence_index_json TEXT,
      safety_notes_json TEXT,
      signed_archive_readiness_hash TEXT NOT NULL,
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

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_review_id ON ml_offline_artifact_retention_governance_review_archives(retention_governance_review_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_policy_evidence_id ON ml_offline_artifact_retention_governance_review_archives(retention_policy_evidence_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_artifact_id ON ml_offline_artifact_retention_governance_review_archives(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_model_key ON ml_offline_artifact_retention_governance_review_archives(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_model_version ON ml_offline_artifact_retention_governance_review_archives(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_hash ON ml_offline_artifact_retention_governance_review_archives(signed_archive_readiness_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_status ON ml_offline_artifact_retention_governance_review_archives(archive_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_retention_governance_archives_created ON ml_offline_artifact_retention_governance_review_archives(created_at)`);
};
