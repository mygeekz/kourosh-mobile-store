import { runAsync } from "../../query";

export const createMlArtifactGovernanceSignoffArchivePackSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_governance_signoff_archive_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signoff_id INTEGER NOT NULL,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_governance_hash TEXT NOT NULL,
      archive_pack_decision TEXT NOT NULL,
      archive_pack_status TEXT NOT NULL,
      archive_pack_purpose TEXT NOT NULL,
      archivist_notes TEXT NOT NULL,
      rejection_reason TEXT,
      archive_manifest_json TEXT,
      retention_manifest_json TEXT,
      evidence_index_json TEXT,
      archive_readiness_notes_json TEXT,
      safety_notes_json TEXT,
      signed_archive_pack_hash TEXT NOT NULL,
      archive_file_created INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_included INTEGER NOT NULL DEFAULT 0,
      retention_job_scheduled INTEGER NOT NULL DEFAULT 0,
      deletion_or_purge_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      archivist_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (signoff_id) REFERENCES ml_offline_artifact_review_binder_governance_signoffs(id),
      FOREIGN KEY (binder_id) REFERENCES ml_offline_artifact_review_binders(id),
      FOREIGN KEY (artifact_id) REFERENCES ml_offline_artifacts(id)
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_signoff_id ON ml_offline_artifact_governance_signoff_archive_packs(signoff_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_binder_id ON ml_offline_artifact_governance_signoff_archive_packs(binder_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_artifact_id ON ml_offline_artifact_governance_signoff_archive_packs(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_artifact_sha256 ON ml_offline_artifact_governance_signoff_archive_packs(artifact_sha256)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_signed_governance_hash ON ml_offline_artifact_governance_signoff_archive_packs(signed_governance_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_archive_pack_status ON ml_offline_artifact_governance_signoff_archive_packs(archive_pack_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_signed_archive_pack_hash ON ml_offline_artifact_governance_signoff_archive_packs(signed_archive_pack_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_governance_signoff_archive_packs_created_at ON ml_offline_artifact_governance_signoff_archive_packs(created_at)`);
};
