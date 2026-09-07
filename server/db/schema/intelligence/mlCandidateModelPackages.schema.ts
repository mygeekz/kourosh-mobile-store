import { runAsync } from "../../query";

export const createMlCandidateModelPackagesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_candidate_model_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      candidate_model_key TEXT,
      candidate_model_version TEXT,
      import_id INTEGER,
      artifact_metadata_id INTEGER,
      approval_review_id INTEGER,
      dataset_key TEXT NOT NULL,
      dataset_version TEXT NOT NULL DEFAULT 'v1',
      training_package_key TEXT NOT NULL,
      training_package_version TEXT NOT NULL DEFAULT 'v1',
      package_status TEXT NOT NULL,
      readiness_score_pct REAL,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_loading_allowed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      pricing_change_allowed INTEGER NOT NULL DEFAULT 0,
      reports_change_allowed INTEGER NOT NULL DEFAULT 0,
      ledger_change_allowed INTEGER NOT NULL DEFAULT 0,
      package_contains_executable_bytes INTEGER NOT NULL DEFAULT 0,
      artifact_binary_stored INTEGER NOT NULL DEFAULT 0,
      package_manifest_json TEXT,
      model_card_json TEXT,
      lineage_json TEXT,
      evaluation_snapshot_json TEXT,
      safety_policy_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (approval_review_id) REFERENCES ml_model_approval_reviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_model_packages_key ON ml_candidate_model_packages(package_key, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_model_packages_import_id ON ml_candidate_model_packages(import_id, created_at)`,
  );
};
