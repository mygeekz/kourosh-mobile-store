import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationFutureShadowBoardReviewPacketSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_future_shadow_board_review_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      board_packet_status TEXT NOT NULL,
      board_packet_decision TEXT NOT NULL,
      board_packet_readiness_pct INTEGER NOT NULL DEFAULT 0,
      board_review_priority TEXT NOT NULL,
      board_review_lane TEXT NOT NULL,
      section_count INTEGER NOT NULL DEFAULT 0,
      passed_section_count INTEGER NOT NULL DEFAULT 0,
      warning_section_count INTEGER NOT NULL DEFAULT 0,
      failed_section_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      routing_decision TEXT NOT NULL,
      routing_pack_status TEXT NOT NULL,
      route_lane TEXT NOT NULL,
      recommended_board_action TEXT NOT NULL,
      board_review_packet_snapshot_json TEXT NOT NULL,
      signed_future_shadow_board_review_packet_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_packets_routing ON offline_artifact_validation_future_shadow_board_review_packets(future_shadow_review_binder_routing_summary_pack_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_packets_artifact ON offline_artifact_validation_future_shadow_board_review_packets(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_packets_status ON offline_artifact_validation_future_shadow_board_review_packets(board_packet_status, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_board_review_packets_priority ON offline_artifact_validation_future_shadow_board_review_packets(board_review_priority, created_at)`);
};
