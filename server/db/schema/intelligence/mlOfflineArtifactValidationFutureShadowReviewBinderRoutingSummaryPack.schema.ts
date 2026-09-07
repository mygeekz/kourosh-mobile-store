import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_future_shadow_review_binder_routing_summary_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      future_shadow_eligibility_review_binder_id INTEGER NOT NULL,
      future_shadow_eligibility_gate_id INTEGER NOT NULL,
      evidence_closure_signoff_pack_id INTEGER NOT NULL,
      evidence_gap_closure_matrix_id INTEGER NOT NULL,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      routing_pack_status TEXT NOT NULL,
      routing_decision TEXT NOT NULL,
      routing_readiness_pct INTEGER NOT NULL DEFAULT 0,
      route_priority TEXT NOT NULL,
      route_lane TEXT NOT NULL,
      section_count INTEGER NOT NULL DEFAULT 0,
      passed_section_count INTEGER NOT NULL DEFAULT 0,
      warning_section_count INTEGER NOT NULL DEFAULT 0,
      failed_section_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      binder_decision TEXT NOT NULL,
      binder_status TEXT NOT NULL,
      recommended_routing_action TEXT NOT NULL,
      routing_summary_pack_snapshot_json TEXT NOT NULL,
      signed_future_shadow_review_binder_routing_summary_pack_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_routing_summary_packs_binder ON offline_artifact_validation_future_shadow_review_binder_routing_summary_packs(future_shadow_eligibility_review_binder_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_routing_summary_packs_artifact ON offline_artifact_validation_future_shadow_review_binder_routing_summary_packs(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_routing_summary_packs_status ON offline_artifact_validation_future_shadow_review_binder_routing_summary_packs(routing_pack_status, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_routing_summary_packs_priority ON offline_artifact_validation_future_shadow_review_binder_routing_summary_packs(route_priority, created_at)`);
};
