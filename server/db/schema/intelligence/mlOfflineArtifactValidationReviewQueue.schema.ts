import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationReviewQueueSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_review_queue_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      validation_status TEXT NOT NULL,
      trust_score INTEGER NOT NULL,
      trust_label TEXT NOT NULL,
      drift_risk TEXT NOT NULL,
      review_priority TEXT NOT NULL,
      queue_status TEXT NOT NULL,
      critical_finding_count INTEGER NOT NULL DEFAULT 0,
      high_finding_count INTEGER NOT NULL DEFAULT 0,
      missing_evidence_count INTEGER NOT NULL DEFAULT 0,
      assigned_reviewer_id TEXT,
      reviewer_decision TEXT NOT NULL DEFAULT 'not_reviewed',
      reviewer_notes_json TEXT,
      reviewer_evidence_json TEXT,
      source_validation_snapshot_json TEXT NOT NULL,
      final_reviewer_decision TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT,
      reviewed_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_validation_result_id ON offline_artifact_validation_review_queue_items(validation_result_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_artifact_id ON offline_artifact_validation_review_queue_items(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_status ON offline_artifact_validation_review_queue_items(queue_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_priority ON offline_artifact_validation_review_queue_items(review_priority)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_trust_label ON offline_artifact_validation_review_queue_items(trust_label)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_drift_risk ON offline_artifact_validation_review_queue_items(drift_risk)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_review_queue_created_at ON offline_artifact_validation_review_queue_items(created_at)`);
};
