import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_future_shadow_board_review_decision_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      future_shadow_board_review_packet_id INTEGER NOT NULL,
      future_shadow_review_binder_routing_summary_pack_id INTEGER NOT NULL,
      future_shadow_eligibility_review_binder_id INTEGER NOT NULL,
      future_shadow_eligibility_gate_id INTEGER NOT NULL,
      evidence_closure_signoff_pack_id INTEGER NOT NULL,
      evidence_gap_closure_matrix_id INTEGER NOT NULL,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      decision_log_status TEXT NOT NULL,
      board_decision TEXT NOT NULL,
      board_decision_reason TEXT NOT NULL,
      decision_log_readiness_pct INTEGER NOT NULL DEFAULT 0,
      board_review_priority TEXT NOT NULL,
      board_decision_lane TEXT NOT NULL,
      section_count INTEGER NOT NULL DEFAULT 0,
      passed_section_count INTEGER NOT NULL DEFAULT 0,
      warning_section_count INTEGER NOT NULL DEFAULT 0,
      failed_section_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      board_packet_decision TEXT NOT NULL,
      board_packet_status TEXT NOT NULL,
      board_review_lane TEXT NOT NULL,
      recommended_decision_action TEXT NOT NULL,
      decision_log_snapshot_json TEXT NOT NULL,
      signed_future_shadow_board_review_decision_log_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_decision_logs_packet ON offline_artifact_validation_future_shadow_board_review_decision_logs(future_shadow_board_review_packet_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_decision_logs_artifact ON offline_artifact_validation_future_shadow_board_review_decision_logs(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_decision_logs_status ON offline_artifact_validation_future_shadow_board_review_decision_logs(decision_log_status, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_decision_logs_priority ON offline_artifact_validation_future_shadow_board_review_decision_logs(board_review_priority, created_at)`);
};
