import { runAsync } from "../../query";

export const createMlCandidatePackageHumanReviewSignoffsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_candidate_package_human_review_signoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      binder_id INTEGER,
      binder_key TEXT NOT NULL,
      binder_version TEXT NOT NULL DEFAULT 'v1',
      package_id INTEGER,
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      candidate_model_key TEXT,
      candidate_model_version TEXT,
      import_id INTEGER,
      artifact_metadata_id INTEGER,
      approval_review_id INTEGER,
      artifact_checksum_sha256 TEXT,
      signoff_key TEXT NOT NULL,
      signoff_version TEXT NOT NULL DEFAULT 'v1',
      review_status TEXT NOT NULL,
      signoff_status TEXT NOT NULL,
      readiness_score_pct REAL,
      review_packet_json TEXT NOT NULL,
      signoff_payload_json TEXT NOT NULL,
      safety_policy_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      signed_review_hash TEXT NOT NULL,
      human_review_required INTEGER NOT NULL DEFAULT 1,
      human_review_evidence_provided INTEGER NOT NULL DEFAULT 0,
      signoff_is_production_approval INTEGER NOT NULL DEFAULT 0,
      signoff_can_load_package_bytes INTEGER NOT NULL DEFAULT 0,
      signoff_can_persist_artifact_bytes INTEGER NOT NULL DEFAULT 0,
      signoff_can_execute_model INTEGER NOT NULL DEFAULT 0,
      signoff_can_invoke_runtime INTEGER NOT NULL DEFAULT 0,
      signoff_can_expose_inference_endpoint INTEGER NOT NULL DEFAULT 0,
      signoff_can_activate_artifact INTEGER NOT NULL DEFAULT 0,
      signoff_can_deploy_artifact INTEGER NOT NULL DEFAULT 0,
      signoff_can_production_score INTEGER NOT NULL DEFAULT 0,
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
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (binder_id) REFERENCES ml_candidate_package_intake_binders(id),
      FOREIGN KEY (package_id) REFERENCES ml_candidate_model_packages(id),
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (approval_review_id) REFERENCES ml_model_approval_reviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_human_review_signoffs_binder_id ON ml_candidate_package_human_review_signoffs(binder_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_human_review_signoffs_key ON ml_candidate_package_human_review_signoffs(signoff_key, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_human_review_signoffs_hash ON ml_candidate_package_human_review_signoffs(signed_review_hash)`,
  );
};
