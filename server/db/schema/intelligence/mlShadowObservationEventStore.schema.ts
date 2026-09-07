import { runAsync } from "../../query";

export const createMlShadowObservationEventStoreSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_observation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_event_key TEXT NOT NULL,
      observation_event_version TEXT NOT NULL,
      import_id INTEGER,
      observation_contract_id INTEGER,
      disabled_harness_id INTEGER,
      fixture_run_id INTEGER,
      disabled_shell_id INTEGER,
      adapter_contract_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      source_run_id TEXT,
      baseline_reference TEXT,
      event_store_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      event_store_enabled INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      audit_only INTEGER NOT NULL DEFAULT 1,
      mutation_allowed INTEGER NOT NULL DEFAULT 0,
      baseline_only_source_of_truth INTEGER NOT NULL DEFAULT 1,
      forbidden_field_attempt_count INTEGER NOT NULL DEFAULT 0,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      observation_payload_json TEXT,
      safety_assertions_json TEXT,
      mutation_guard_policy_json TEXT,
      retention_policy_json TEXT,
      forbidden_field_keys_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (observation_contract_id) REFERENCES ml_shadow_adapter_observation_log_contracts(id),
      FOREIGN KEY (disabled_harness_id) REFERENCES ml_disabled_shadow_runtime_harnesses(id),
      FOREIGN KEY (fixture_run_id) REFERENCES ml_shadow_runtime_contract_test_fixtures(id),
      FOREIGN KEY (disabled_shell_id) REFERENCES ml_disabled_shadow_adapter_shells(id),
      FOREIGN KEY (adapter_contract_id) REFERENCES ml_shadow_inference_adapter_contracts(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_events_import ON ml_shadow_observation_events(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_events_contract ON ml_shadow_observation_events(observation_contract_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_observation_events_status ON ml_shadow_observation_events(event_store_status, created_at)`,
  );
};
