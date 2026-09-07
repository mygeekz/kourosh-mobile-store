import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationFutureShadowEligibilityReviewBinderSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_future_shadow_eligibility_review_binders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      future_shadow_eligibility_gate_id INTEGER NOT NULL,
      evidence_closure_signoff_pack_id INTEGER NOT NULL,
      evidence_gap_closure_matrix_id INTEGER NOT NULL,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      binder_status TEXT NOT NULL,
      binder_decision TEXT NOT NULL,
      binder_readiness_pct INTEGER NOT NULL DEFAULT 0,
      section_count INTEGER NOT NULL DEFAULT 0,
      passed_section_count INTEGER NOT NULL DEFAULT 0,
      warning_section_count INTEGER NOT NULL DEFAULT 0,
      failed_section_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      eligibility_decision TEXT NOT NULL,
      gate_status TEXT NOT NULL,
      recommended_binder_action TEXT NOT NULL,
      binder_snapshot_json TEXT NOT NULL,
      signed_future_shadow_eligibility_review_binder_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_review_binders_gate ON offline_artifact_validation_future_shadow_eligibility_review_binders(future_shadow_eligibility_gate_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_review_binders_artifact ON offline_artifact_validation_future_shadow_eligibility_review_binders(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_future_shadow_eligibility_review_binders_status ON offline_artifact_validation_future_shadow_eligibility_review_binders(binder_status, created_at)`);
};
