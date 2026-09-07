import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationEvidenceReviewPackSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_evidence_review_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      pack_status TEXT NOT NULL,
      evidence_confidence TEXT NOT NULL,
      evidence_note_count INTEGER NOT NULL DEFAULT 0,
      assignment_event_count INTEGER NOT NULL DEFAULT 0,
      reviewer_note_count INTEGER NOT NULL DEFAULT 0,
      unresolved_evidence_gap_count INTEGER NOT NULL DEFAULT 0,
      recommended_reviewer_action TEXT NOT NULL,
      pack_snapshot_json TEXT NOT NULL,
      signed_evidence_review_pack_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_review_packs_queue_item_id ON offline_artifact_validation_evidence_review_packs(queue_item_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_review_packs_validation_result_id ON offline_artifact_validation_evidence_review_packs(validation_result_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_review_packs_status ON offline_artifact_validation_evidence_review_packs(pack_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_review_packs_confidence ON offline_artifact_validation_evidence_review_packs(evidence_confidence)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_review_packs_created_at ON offline_artifact_validation_evidence_review_packs(created_at)`);
};
