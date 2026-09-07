import { runAsync } from "../../query";

export const createMlArtifactReviewBinderGovernanceSignoffSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_review_binder_governance_signoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_binder_hash TEXT NOT NULL,
      signoff_decision TEXT NOT NULL,
      signoff_status TEXT NOT NULL,
      signer_notes TEXT NOT NULL,
      rejection_reason TEXT,
      governance_findings_json TEXT,
      evidence_completeness_json TEXT,
      risk_acceptance_json TEXT,
      safety_notes_json TEXT,
      signed_governance_hash TEXT NOT NULL,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      export_file_created INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_included INTEGER NOT NULL DEFAULT 0,
      binder_activation_allowed INTEGER NOT NULL DEFAULT 0,
      signer_user_id TEXT,
      signer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (binder_id) REFERENCES ml_offline_artifact_review_binders(id),
      FOREIGN KEY (artifact_id) REFERENCES ml_offline_artifacts(id)
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_binder_id ON ml_offline_artifact_review_binder_governance_signoffs(binder_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_artifact_id ON ml_offline_artifact_review_binder_governance_signoffs(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_artifact_sha256 ON ml_offline_artifact_review_binder_governance_signoffs(artifact_sha256)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_signed_binder_hash ON ml_offline_artifact_review_binder_governance_signoffs(signed_binder_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_signoff_status ON ml_offline_artifact_review_binder_governance_signoffs(signoff_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_signed_governance_hash ON ml_offline_artifact_review_binder_governance_signoffs(signed_governance_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binder_governance_signoffs_created_at ON ml_offline_artifact_review_binder_governance_signoffs(created_at)`);
};
