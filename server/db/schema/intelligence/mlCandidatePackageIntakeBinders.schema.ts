import { runAsync } from "../../query";

export const createMlCandidatePackageIntakeBindersSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_candidate_package_intake_binders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER,
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      candidate_model_key TEXT,
      candidate_model_version TEXT,
      import_id INTEGER,
      artifact_metadata_id INTEGER,
      approval_review_id INTEGER,
      artifact_checksum_sha256 TEXT,
      binder_key TEXT NOT NULL,
      binder_version TEXT NOT NULL DEFAULT 'v1',
      intake_status TEXT NOT NULL,
      quarantine_status TEXT NOT NULL,
      binder_status TEXT NOT NULL,
      readiness_score_pct REAL,
      intake_manifest_json TEXT NOT NULL,
      quarantine_readiness_plan_json TEXT NOT NULL,
      binder_payload_json TEXT NOT NULL,
      safety_policy_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      signed_binder_hash TEXT NOT NULL,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_loading_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_intake_can_load_bytes INTEGER NOT NULL DEFAULT 0,
      artifact_intake_can_persist_bytes INTEGER NOT NULL DEFAULT 0,
      quarantine_can_execute_artifact INTEGER NOT NULL DEFAULT 0,
      quarantine_can_activate_artifact INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      pricing_change_allowed INTEGER NOT NULL DEFAULT 0,
      reports_change_allowed INTEGER NOT NULL DEFAULT 0,
      ledger_change_allowed INTEGER NOT NULL DEFAULT 0,
      binder_contains_executable_bytes INTEGER NOT NULL DEFAULT 0,
      package_bytes_loaded INTEGER NOT NULL DEFAULT 0,
      package_bytes_persisted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (package_id) REFERENCES ml_candidate_model_packages(id),
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (approval_review_id) REFERENCES ml_model_approval_reviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_intake_binders_package_id ON ml_candidate_package_intake_binders(package_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_intake_binders_key ON ml_candidate_package_intake_binders(binder_key, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_intake_binders_hash ON ml_candidate_package_intake_binders(signed_binder_hash)`,
  );
};
