import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationEvidenceGapClosureMatrixSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_evidence_gap_closure_matrices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      matrix_status TEXT NOT NULL,
      closure_readiness_pct INTEGER NOT NULL DEFAULT 0,
      total_gap_count INTEGER NOT NULL DEFAULT 0,
      open_gap_count INTEGER NOT NULL DEFAULT 0,
      closed_gap_count INTEGER NOT NULL DEFAULT 0,
      blocked_gap_count INTEGER NOT NULL DEFAULT 0,
      critical_open_gap_count INTEGER NOT NULL DEFAULT 0,
      high_open_gap_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      recommended_closure_action TEXT NOT NULL,
      matrix_snapshot_json TEXT NOT NULL,
      signed_evidence_gap_closure_matrix_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_pack_id ON offline_artifact_validation_evidence_gap_closure_matrices(evidence_review_pack_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_queue_item_id ON offline_artifact_validation_evidence_gap_closure_matrices(queue_item_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_validation_result_id ON offline_artifact_validation_evidence_gap_closure_matrices(validation_result_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_artifact_id ON offline_artifact_validation_evidence_gap_closure_matrices(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_status ON offline_artifact_validation_evidence_gap_closure_matrices(matrix_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_readiness ON offline_artifact_validation_evidence_gap_closure_matrices(closure_readiness_pct)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_gap_closure_matrices_created_at ON offline_artifact_validation_evidence_gap_closure_matrices(created_at)`);
};
