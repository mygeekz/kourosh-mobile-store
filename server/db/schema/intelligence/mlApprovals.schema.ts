import { runAsync } from "../../query";

export const createMlApprovalsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_model_approval_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_id INTEGER NOT NULL,
      review_key TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      decision TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'pending_review',
      promotion_stage TEXT NOT NULL DEFAULT 'none',
      approval_scope TEXT NOT NULL DEFAULT 'offline_candidate_review_only',
      reason TEXT,
      reviewer_notes TEXT,
      metric_override INTEGER NOT NULL DEFAULT 0,
      policy_json TEXT,
      gate_json TEXT,
      review_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_approval_reviews_import ON ml_model_approval_reviews(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_approval_reviews_status ON ml_model_approval_reviews(approval_status, created_at)`,
  );
};
