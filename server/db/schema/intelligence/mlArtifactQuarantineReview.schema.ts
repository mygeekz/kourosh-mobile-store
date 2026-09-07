import { runAsync } from "../../query";

export const createMlArtifactQuarantineReviewSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      review_decision TEXT NOT NULL,
      review_status TEXT NOT NULL,
      reviewer_notes TEXT NOT NULL,
      rejection_reason TEXT,
      validation_findings_json TEXT,
      lineage_comparison_json TEXT,
      evidence_json TEXT,
      safety_notes_json TEXT,
      signed_review_hash TEXT NOT NULL,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      reviewer_user_id TEXT,
      reviewer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (artifact_id) REFERENCES ml_offline_artifacts(id)
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_artifact_id ON ml_offline_artifact_reviews(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_artifact_sha256 ON ml_offline_artifact_reviews(artifact_sha256)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_model_key ON ml_offline_artifact_reviews(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_model_version ON ml_offline_artifact_reviews(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_review_status ON ml_offline_artifact_reviews(review_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_signed_review_hash ON ml_offline_artifact_reviews(signed_review_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_reviews_created_at ON ml_offline_artifact_reviews(created_at)`);
};
