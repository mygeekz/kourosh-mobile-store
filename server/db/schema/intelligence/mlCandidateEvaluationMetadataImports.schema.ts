import { runAsync } from "../../query";

export const createMlCandidateEvaluationMetadataImportsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_candidate_evaluation_metadata_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_key TEXT NOT NULL,
      import_version TEXT NOT NULL DEFAULT 'v1',
      candidate_package_id TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      model_family TEXT,
      prediction_type TEXT NOT NULL,
      target_column TEXT,
      horizon_days INTEGER,
      training_manifest_hash TEXT,
      validation_status TEXT NOT NULL,
      metrics_status TEXT NOT NULL,
      output_contract_status TEXT NOT NULL,
      safety_policy_status TEXT NOT NULL,
      metadata_import_status TEXT NOT NULL,
      accuracy REAL,
      precision_score REAL,
      recall_score REAL,
      f1 REAL,
      roc_auc REAL,
      mae REAL,
      rmse REAL,
      r2 REAL,
      candidate_manifest_json TEXT NOT NULL,
      model_card_json TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      evaluation_report_json TEXT NOT NULL,
      candidate_output_sample_json TEXT NOT NULL,
      checksums_json TEXT NOT NULL,
      training_package_validation_report_json TEXT,
      import_summary_json TEXT NOT NULL,
      safety_policy_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_evaluation_metadata_imports_package ON ml_candidate_evaluation_metadata_imports(candidate_package_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_evaluation_metadata_imports_model ON ml_candidate_evaluation_metadata_imports(model_key, model_version, created_at)`,
  );
};
