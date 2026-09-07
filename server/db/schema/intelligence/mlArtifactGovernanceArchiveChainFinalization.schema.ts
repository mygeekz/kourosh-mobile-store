import { runAsync } from "../../query";

export const createMlArtifactGovernanceArchiveChainFinalizationSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_governance_archive_chain_finalizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      signed_archive_readiness_hash TEXT NOT NULL,
      finalization_decision TEXT NOT NULL,
      finalization_status TEXT NOT NULL,
      finalization_purpose TEXT NOT NULL,
      final_reviewer_notes TEXT NOT NULL,
      rejection_reason TEXT,
      chain_completeness_json TEXT,
      final_reviewer_acknowledgement_json TEXT,
      immutable_evidence_summary_json TEXT,
      evidence_index_json TEXT,
      safety_notes_json TEXT,
      signed_finalization_readiness_hash TEXT NOT NULL,
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
      final_reviewer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_retention_governance_archive_id ON ml_offline_artifact_governance_archive_chain_finalizations(retention_governance_archive_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_retention_governance_review_id ON ml_offline_artifact_governance_archive_chain_finalizations(retention_governance_review_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_artifact_id ON ml_offline_artifact_governance_archive_chain_finalizations(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_model_key ON ml_offline_artifact_governance_archive_chain_finalizations(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_model_version ON ml_offline_artifact_governance_archive_chain_finalizations(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_hash ON ml_offline_artifact_governance_archive_chain_finalizations(signed_finalization_readiness_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_status ON ml_offline_artifact_governance_archive_chain_finalizations(finalization_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_finalizations_created ON ml_offline_artifact_governance_archive_chain_finalizations(created_at)`);
};
