import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationEvidenceClosureSignoffPackSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_evidence_closure_signoff_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evidence_gap_closure_matrix_id INTEGER NOT NULL,
      evidence_review_pack_id INTEGER NOT NULL,
      queue_item_id INTEGER NOT NULL,
      validation_result_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      signoff_pack_status TEXT NOT NULL,
      reviewer_decision TEXT NOT NULL,
      reviewer_decision_reason TEXT NOT NULL,
      signoff_readiness_pct INTEGER NOT NULL DEFAULT 0,
      checklist_pass_count INTEGER NOT NULL DEFAULT 0,
      checklist_warning_count INTEGER NOT NULL DEFAULT 0,
      checklist_fail_count INTEGER NOT NULL DEFAULT 0,
      evidence_confidence TEXT NOT NULL,
      recommended_signoff_action TEXT NOT NULL,
      signoff_pack_snapshot_json TEXT NOT NULL,
      signed_evidence_closure_reviewer_signoff_pack_hash TEXT NOT NULL,
      safety_gate_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_closure_signoff_matrix ON offline_artifact_validation_evidence_closure_signoff_packs(evidence_gap_closure_matrix_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_closure_signoff_artifact ON offline_artifact_validation_evidence_closure_signoff_packs(artifact_id, created_at)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_evidence_closure_signoff_status ON offline_artifact_validation_evidence_closure_signoff_packs(signoff_pack_status, created_at)`);
};
