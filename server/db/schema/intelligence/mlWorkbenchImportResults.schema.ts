import { runAsync } from "../../query";

export const createMlWorkbenchImportResultsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_workbench_import_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_package_id TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      prediction_type TEXT NOT NULL,
      training_package_reference TEXT,
      candidate_manifest_hash TEXT,
      metrics_summary_json TEXT NOT NULL DEFAULT '{}',
      evaluation_summary_json TEXT NOT NULL DEFAULT '{}',
      model_card_reference TEXT,
      checksum_summary_json TEXT NOT NULL DEFAULT '{}',
      safety_policy_json TEXT NOT NULL DEFAULT '{}',
      validation_status TEXT NOT NULL,
      validation_score REAL,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      forbidden_field_count INTEGER NOT NULL DEFAULT 0,
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_binary_present INTEGER NOT NULL DEFAULT 0 CHECK (model_binary_present = 0),
      raw_csv_present INTEGER NOT NULL DEFAULT 0 CHECK (raw_csv_present = 0),
      activation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (activation_directive_present = 0),
      inference_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (inference_directive_present = 0),
      business_mutation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_directive_present = 0),
      payload_snapshot_json TEXT NOT NULL DEFAULT '{}',
      result_snapshot_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id INTEGER,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_results_candidate ON ml_workbench_import_results(candidate_package_id, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_results_model ON ml_workbench_import_results(model_key, model_version, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_results_status ON ml_workbench_import_results(validation_status, created_at DESC, id DESC)`,
  );
};
