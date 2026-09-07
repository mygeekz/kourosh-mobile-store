import { runAsync } from "../../query";

export const createMlShadowRuntimeSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_runtime_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_import_id TEXT,
      model_key TEXT,
      model_version TEXT,
      prediction_type TEXT,
      entity_type TEXT,
      entity_id TEXT,
      runtime_mode TEXT NOT NULL DEFAULT 'disabled',
      allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_attempted INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      can_change_inventory_or_accounting INTEGER NOT NULL DEFAULT 0,
      input_snapshot_json TEXT,
      output_snapshot_json TEXT,
      safety_notes_json TEXT,
      status TEXT NOT NULL DEFAULT 'disabled',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_attempts_created ON ml_shadow_runtime_attempts(created_at, id)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_attempts_model ON ml_shadow_runtime_attempts(model_import_id, model_key, model_version)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_attempts_status ON ml_shadow_runtime_attempts(status, runtime_mode, created_at)`,
  );
};
