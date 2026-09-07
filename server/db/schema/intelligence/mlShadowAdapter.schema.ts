import { runAsync } from "../../query";

export const createMlShadowAdapterSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_model_artifact_metadata_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_key TEXT NOT NULL,
      artifact_version TEXT NOT NULL,
      import_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      governance_signoff_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      artifact_status TEXT NOT NULL DEFAULT 'metadata_only',
      artifact_source TEXT,
      artifact_storage_ref TEXT,
      artifact_checksum_sha256 TEXT,
      checksum_algorithm TEXT NOT NULL DEFAULT 'sha256',
      algorithm_family TEXT,
      training_package_key TEXT,
      training_package_version TEXT,
      dataset_key TEXT,
      dataset_version TEXT,
      owner_name TEXT,
      owner_team TEXT,
      approval_trail_status TEXT,
      registry_status TEXT NOT NULL DEFAULT 'not_started',
      runtime_load_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_binary_stored INTEGER NOT NULL DEFAULT 0,
      inference_enabled INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      metadata_contract_json TEXT,
      artifact_manifest_json TEXT,
      lineage_json TEXT,
      approval_trail_json TEXT,
      safety_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (governance_signoff_id) REFERENCES ml_production_governance_signoff_decisions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_artifact_metadata_registry_import ON ml_model_artifact_metadata_registry(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_model_artifact_metadata_registry_status ON ml_model_artifact_metadata_registry(registry_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_inference_adapter_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adapter_key TEXT NOT NULL,
      adapter_version TEXT NOT NULL,
      import_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      registry_status TEXT,
      boundary_status TEXT,
      adapter_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      shadow_mode_only INTEGER NOT NULL DEFAULT 1,
      fallback_strategy TEXT,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      adapter_contract_json TEXT,
      io_contract_json TEXT,
      guardrail_policy_json TEXT,
      fallback_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_inference_adapter_contracts_import ON ml_shadow_inference_adapter_contracts(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_inference_adapter_contracts_status ON ml_shadow_inference_adapter_contracts(adapter_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_disabled_shadow_adapter_shells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shell_key TEXT NOT NULL,
      shell_version TEXT NOT NULL,
      import_id INTEGER,
      adapter_contract_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      adapter_status TEXT,
      registry_status TEXT,
      boundary_status TEXT,
      shell_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      shell_enabled INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      no_op_adapter_only INTEGER NOT NULL DEFAULT 1,
      audit_hook_enabled INTEGER NOT NULL DEFAULT 1,
      shadow_mode_only INTEGER NOT NULL DEFAULT 1,
      fallback_strategy TEXT,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      shell_interface_json TEXT,
      no_op_adapter_manifest_json TEXT,
      audit_hook_policy_json TEXT,
      fallback_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (adapter_contract_id) REFERENCES ml_shadow_inference_adapter_contracts(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_disabled_shadow_adapter_shells_import ON ml_disabled_shadow_adapter_shells(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_disabled_shadow_adapter_shells_status ON ml_disabled_shadow_adapter_shells(shell_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_runtime_contract_test_fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_key TEXT NOT NULL,
      fixture_version TEXT NOT NULL,
      import_id INTEGER,
      disabled_shell_id INTEGER,
      adapter_contract_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      shell_status TEXT,
      fixture_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      no_op_fixtures_only INTEGER NOT NULL DEFAULT 1,
      baseline_only_source_of_truth INTEGER NOT NULL DEFAULT 1,
      fixture_count INTEGER NOT NULL DEFAULT 0,
      contract_test_count INTEGER NOT NULL DEFAULT 0,
      mutation_assertion_count INTEGER NOT NULL DEFAULT 0,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      contract_test_suite_json TEXT,
      no_op_audit_fixtures_json TEXT,
      no_mutation_assertions_json TEXT,
      fallback_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (disabled_shell_id) REFERENCES ml_disabled_shadow_adapter_shells(id),
      FOREIGN KEY (adapter_contract_id) REFERENCES ml_shadow_inference_adapter_contracts(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_contract_test_fixtures_import ON ml_shadow_runtime_contract_test_fixtures(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_contract_test_fixtures_status ON ml_shadow_runtime_contract_test_fixtures(fixture_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_disabled_shadow_runtime_harnesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      harness_key TEXT NOT NULL,
      harness_version TEXT NOT NULL,
      import_id INTEGER,
      fixture_run_id INTEGER,
      disabled_shell_id INTEGER,
      adapter_contract_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      fixture_status TEXT,
      harness_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      harness_enabled INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      no_op_harness_only INTEGER NOT NULL DEFAULT 1,
      baseline_only_source_of_truth INTEGER NOT NULL DEFAULT 1,
      audit_hook_enabled INTEGER NOT NULL DEFAULT 1,
      harness_check_count INTEGER NOT NULL DEFAULT 0,
      mutation_guard_count INTEGER NOT NULL DEFAULT 0,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      harness_manifest_json TEXT,
      validation_run_json TEXT,
      no_op_assertions_json TEXT,
      mutation_guard_results_json TEXT,
      fallback_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (fixture_run_id) REFERENCES ml_shadow_runtime_contract_test_fixtures(id),
      FOREIGN KEY (disabled_shell_id) REFERENCES ml_disabled_shadow_adapter_shells(id),
      FOREIGN KEY (adapter_contract_id) REFERENCES ml_shadow_inference_adapter_contracts(id),
      FOREIGN KEY (artifact_metadata_id) REFERENCES ml_model_artifact_metadata_registry(id),
      FOREIGN KEY (safe_boundary_skeleton_id) REFERENCES ml_safe_inference_boundary_skeletons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_disabled_shadow_runtime_harnesses_import ON ml_disabled_shadow_runtime_harnesses(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_disabled_shadow_runtime_harnesses_status ON ml_disabled_shadow_runtime_harnesses(harness_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_adapter_observation_log_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observation_contract_key TEXT NOT NULL,
      observation_contract_version TEXT NOT NULL,
      import_id INTEGER,
      disabled_harness_id INTEGER,
      fixture_run_id INTEGER,
      disabled_shell_id INTEGER,
      adapter_contract_id INTEGER,
      artifact_metadata_id INTEGER,
      safe_boundary_skeleton_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      harness_status TEXT,
      observation_contract_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      observation_logging_enabled INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      no_op_observation_only INTEGER NOT NULL DEFAULT 1,
      baseline_only_source_of_truth INTEGER NOT NULL DEFAULT 1,
      observation_event_schema_json TEXT,
      no_op_observation_fixture_json TEXT,
      mutation_guard_policy_json TEXT,
      retention_policy_json TEXT,
      audit_export_json TEXT,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
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
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_adapter_observation_log_contracts_import ON ml_shadow_adapter_observation_log_contracts(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_adapter_observation_log_contracts_status ON ml_shadow_adapter_observation_log_contracts(observation_contract_status, created_at)`,
  );
};
