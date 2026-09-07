import { runAsync } from "../../query";

export const createMlShadowSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluation_key TEXT NOT NULL,
      import_id INTEGER NOT NULL,
      approval_review_id INTEGER,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      dataset_key TEXT NOT NULL,
      dataset_version TEXT NOT NULL DEFAULT 'v1',
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      split_key TEXT NOT NULL,
      split_strategy TEXT NOT NULL,
      seed TEXT NOT NULL,
      test_ratio REAL NOT NULL,
      evaluated_rows INTEGER NOT NULL DEFAULT 0,
      candidate_f1_pct REAL,
      baseline_f1_pct REAL,
      delta_f1_pct REAL,
      candidate_balanced_accuracy_pct REAL,
      baseline_balanced_accuracy_pct REAL,
      delta_balanced_accuracy_pct REAL,
      status TEXT NOT NULL DEFAULT 'watch',
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (approval_review_id) REFERENCES ml_model_approval_reviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_evaluations_import ON ml_shadow_evaluations(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_evaluations_status ON ml_shadow_evaluations(status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_stability_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate_key TEXT NOT NULL,
      import_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      minimum_evaluations INTEGER NOT NULL DEFAULT 3,
      lookback_evaluations INTEGER NOT NULL DEFAULT 5,
      evaluations_considered INTEGER NOT NULL DEFAULT 0,
      candidate_avg_f1_pct REAL,
      baseline_avg_f1_pct REAL,
      avg_delta_f1_pct REAL,
      candidate_avg_balanced_accuracy_pct REAL,
      baseline_avg_balanced_accuracy_pct REAL,
      avg_delta_balanced_accuracy_pct REAL,
      positive_delta_f1_count INTEGER NOT NULL DEFAULT 0,
      positive_delta_balanced_accuracy_count INTEGER NOT NULL DEFAULT 0,
      underperforming_count INTEGER NOT NULL DEFAULT 0,
      blocked_count INTEGER NOT NULL DEFAULT 0,
      ready_count INTEGER NOT NULL DEFAULT 0,
      watch_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'insufficient_history',
      stable_enough_for_offline_pilot INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_stability_checks_import ON ml_shadow_stability_checks(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_stability_checks_status ON ml_shadow_stability_checks(status, created_at)`,
  );
};
