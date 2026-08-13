import { runAsync } from "../../query";

export const createMlArtifactRetentionEvidenceGovernanceReviewSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_retention_evidence_governance_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retention_policy_evidence_id INTEGER NOT NULL,
      archive_pack_id INTEGER NOT NULL,
      signoff_id INTEGER NOT NULL,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_retention_policy_hash TEXT NOT NULL,
      governance_review_decision TEXT NOT NULL,
      governance_review_status TEXT NOT NULL,
      governance_review_purpose TEXT NOT NULL,
      reviewer_notes TEXT NOT NULL,
      rejection_reason TEXT,
      risk_confirmation_json TEXT,
      hold_confirmation_json TEXT,
      purge_prohibition_review_json TEXT,
      evidence_completeness_json TEXT,
      safety_notes_json TEXT,
      signed_retention_governance_hash TEXT NOT NULL,
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
      governance_reviewer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (retention_policy_evidence_id) REFERENCES ml_offline_artifact_archive_pack_retention_policy_evidence(id),
      FOREIGN KEY (archive_pack_id) REFERENCES ml_offline_artifact_governance_signoff_archive_packs(id),
      FOREIGN KEY (signoff_id) REFERENCES ml_offline_artifact_review_binder_governance_signoffs(id),
      FOREIGN KEY (binder_id) REFERENCES ml_offline_artifact_review_binders(id),
      FOREIGN KEY (artifact_id) REFERENCES ml_offline_artifacts(id)
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_retention_policy_evidence_id ON ml_offline_artifact_retention_evidence_governance_reviews(retention_policy_evidence_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_archive_pack_id ON ml_offline_artifact_retention_evidence_governance_reviews(archive_pack_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_artifact_id ON ml_offline_artifact_retention_evidence_governance_reviews(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_artifact_sha256 ON ml_offline_artifact_retention_evidence_governance_reviews(artifact_sha256)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_signed_retention_policy_hash ON ml_offline_artifact_retention_evidence_governance_reviews(signed_retention_policy_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_governance_review_status ON ml_offline_artifact_retention_evidence_governance_reviews(governance_review_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_signed_retention_governance_hash ON ml_offline_artifact_retention_evidence_governance_reviews(signed_retention_governance_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_retention_evidence_governance_reviews_created_at ON ml_offline_artifact_retention_evidence_governance_reviews(created_at)`);
};
