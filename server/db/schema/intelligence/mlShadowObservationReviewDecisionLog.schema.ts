import { runAsync } from "../../query";

export const createMlShadowObservationReviewDecisionLogSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_observation_review_decision_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_log_key TEXT NOT NULL,
      decision_log_version TEXT NOT NULL,
      import_id INTEGER,
      observation_event_id INTEGER,
      review_dashboard_key TEXT,
      review_decision_type TEXT NOT NULL,
      review_decision_status TEXT NOT NULL DEFAULT 'draft',
      reviewer_name TEXT,
      reviewer_role TEXT,
      reviewer_note TEXT,
      evidence_summary_json TEXT,
      reviewed_event_ids_json TEXT,
      decision_payload_json TEXT,
      safety_assertions_json TEXT,
      decision_policy_json TEXT,
      audit_export_json TEXT,
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      decision_log_enabled INTEGER NOT NULL DEFAULT 0,
      human_review_only INTEGER NOT NULL DEFAULT 1,
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
      FOREIGN KEY (observation_event_id) REFERENCES ml_shadow_observation_events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_review_decisions_import ON ml_shadow_observation_review_decision_logs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_review_decisions_event ON ml_shadow_observation_review_decision_logs(observation_event_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_review_decisions_status ON ml_shadow_observation_review_decision_logs(review_decision_status, created_at)`,
  );
};
