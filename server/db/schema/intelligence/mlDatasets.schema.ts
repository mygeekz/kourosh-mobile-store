import { runAsync } from "../../query";

export const createMlDatasetsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_dataset_exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_key TEXT NOT NULL,
      dataset_version TEXT NOT NULL DEFAULT 'v1',
      export_format TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      labeled_row_count INTEGER NOT NULL DEFAULT 0,
      feature_count INTEGER NOT NULL DEFAULT 0,
      label_key TEXT NOT NULL,
      filters_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_feature_snapshots_run ON predictive_feature_snapshots(run_id, prediction_type)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_dataset_exports_key ON ml_dataset_exports(dataset_key, created_at)`,
  );
};
