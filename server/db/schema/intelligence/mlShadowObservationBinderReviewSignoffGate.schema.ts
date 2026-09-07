import { runAsync } from "../../query";

export const createMlShadowObservationBinderReviewSignoffGateSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_observation_binder_review_signoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signoff_gate_key TEXT NOT NULL,
      signoff_gate_version TEXT NOT NULL,
      import_id INTEGER,
      binder_contract_key TEXT NOT NULL,
      binder_fingerprint TEXT,
      signoff_type TEXT NOT NULL,
      signoff_status TEXT NOT NULL DEFAULT 'draft',
      signer_name TEXT,
      signer_role TEXT,
      signer_note TEXT,
      evidence_summary_json TEXT,
      binder_summary_json TEXT,
      signoff_payload_json TEXT,
      safety_assertions_json TEXT,
      signoff_policy_json TEXT,
      audit_export_json TEXT,
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      signoff_gate_enabled INTEGER NOT NULL DEFAULT 0,
      human_signoff_only INTEGER NOT NULL DEFAULT 1,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      audit_only INTEGER NOT NULL DEFAULT 1,
      mutation_allowed INTEGER NOT NULL DEFAULT 0,
      baseline_only_source_of_truth INTEGER NOT NULL DEFAULT 1,
      operational_decision_allowed INTEGER NOT NULL DEFAULT 0,
      customer_supplier_message_allowed INTEGER NOT NULL DEFAULT 0,
      forbidden_field_attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_binder_signoffs_import ON ml_shadow_observation_binder_review_signoffs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_binder_signoffs_status ON ml_shadow_observation_binder_review_signoffs(signoff_status, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_binder_signoffs_fingerprint ON ml_shadow_observation_binder_review_signoffs(binder_fingerprint, created_at)`,
  );
};
