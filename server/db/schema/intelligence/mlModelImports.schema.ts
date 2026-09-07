import { runAsync } from "../../query";

export const createMlModelImportsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_model_result_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_key TEXT NOT NULL,
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
      label_key TEXT NOT NULL,
      threshold REAL NOT NULL DEFAULT 0.5,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      matched_test_rows INTEGER NOT NULL DEFAULT 0,
      missing_test_rows INTEGER NOT NULL DEFAULT 0,
      unexpected_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      accuracy_pct REAL,
      precision_pct REAL,
      recall_pct REAL,
      f1_pct REAL,
      balanced_accuracy_pct REAL,
      baseline_f1_pct REAL,
      baseline_balanced_accuracy_pct REAL,
      metrics_json TEXT,
      validation_json TEXT,
      comparison_json TEXT,
      model_card_json TEXT,
      status TEXT NOT NULL DEFAULT 'validated',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_result_imports_model ON ml_model_result_imports(model_key, model_version, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_result_imports_package ON ml_model_result_imports(package_key, split_key, created_at)`,
  );
};
