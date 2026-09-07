import { runAsync } from "../../query";

export const createMlTrainingPackagesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_training_package_exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      dataset_key TEXT NOT NULL,
      dataset_version TEXT NOT NULL DEFAULT 'v1',
      split_key TEXT NOT NULL,
      split_strategy TEXT NOT NULL,
      seed TEXT NOT NULL,
      test_ratio REAL NOT NULL,
      train_rows INTEGER NOT NULL DEFAULT 0,
      test_rows INTEGER NOT NULL DEFAULT 0,
      feature_count INTEGER NOT NULL DEFAULT 0,
      label_key TEXT NOT NULL,
      manifest_json TEXT,
      data_card_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_training_package_exports_key ON ml_training_package_exports(package_key, created_at)`,
  );
};
