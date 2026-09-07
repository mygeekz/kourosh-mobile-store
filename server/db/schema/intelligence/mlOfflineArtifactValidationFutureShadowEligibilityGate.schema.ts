import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationFutureShadowEligibilityGateSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_future_shadow_eligibility_gates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evidence_closure_signoff_pack_id INTEGER NOT NULL,
      evidence_gap_closure_matrix_id INTEGER NOT NULL,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      gate_status TEXT NOT NULL,
      eligibility_decision TEXT NOT NULL,
      eligibility_readiness_pct INTEGER NOT NULL DEFAULT 0,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      critical_blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      reviewer_decision TEXT NOT NULL,
      signoff_pack_status TEXT NOT NULL,
      recommended_eligibility_action TEXT NOT NULL,
      eligibility_gate_snapshot_json TEXT NOT NULL,
      signed_future_shadow_eligibility_gate_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_gates_signoff_pack ON offline_artifact_validation_future_shadow_eligibility_gates(evidence_closure_signoff_pack_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_gates_artifact ON offline_artifact_validation_future_shadow_eligibility_gates(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_gates_status ON offline_artifact_validation_future_shadow_eligibility_gates(gate_status, created_at)`);
};
