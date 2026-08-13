import { runAsync } from "../../query";

export const createMlArtifactReviewBinderSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_review_binders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      latest_review_id INTEGER,
      latest_review_hash TEXT,
      binder_status TEXT NOT NULL,
      binder_purpose TEXT NOT NULL,
      binder_manifest_json TEXT NOT NULL,
      traceability_manifest_json TEXT,
      evidence_index_json TEXT,
      export_readiness_notes_json TEXT,
      safety_notes_json TEXT,
      signed_binder_hash TEXT NOT NULL,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      export_file_created INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_included INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (artifact_id) REFERENCES ml_offline_artifacts(id),
      FOREIGN KEY (latest_review_id) REFERENCES ml_offline_artifact_reviews(id)
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_artifact_id ON ml_offline_artifact_review_binders(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_artifact_sha256 ON ml_offline_artifact_review_binders(artifact_sha256)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_model_key ON ml_offline_artifact_review_binders(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_model_version ON ml_offline_artifact_review_binders(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_binder_status ON ml_offline_artifact_review_binders(binder_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_signed_binder_hash ON ml_offline_artifact_review_binders(signed_binder_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_artifact_review_binders_created_at ON ml_offline_artifact_review_binders(created_at)`);
};
