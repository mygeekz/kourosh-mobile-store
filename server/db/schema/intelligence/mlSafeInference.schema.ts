import { runAsync } from "../../query";

export const createMlSafeInferenceSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_safe_inference_boundary_skeletons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skeleton_key TEXT NOT NULL,
      import_id INTEGER,
      governance_signoff_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      governance_status TEXT,
      implementation_entry_decision TEXT,
      boundary_status TEXT NOT NULL DEFAULT 'not_started',
      feature_flag_key TEXT,
      feature_flag_default INTEGER NOT NULL DEFAULT 0,
      runtime_enabled INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      shadow_only_capable INTEGER NOT NULL DEFAULT 0,
      fallback_strategy TEXT,
      readiness_score_pct REAL,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      boundary_contract_json TEXT,
      disabled_runtime_manifest_json TEXT,
      safety_controls_json TEXT,
      feature_flag_policy_json TEXT,
      fallback_policy_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (governance_signoff_id) REFERENCES ml_production_governance_signoff_decisions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_safe_inference_boundary_skeletons_import ON ml_safe_inference_boundary_skeletons(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_safe_inference_boundary_skeletons_status ON ml_safe_inference_boundary_skeletons(boundary_status, created_at)`,
  );
};
