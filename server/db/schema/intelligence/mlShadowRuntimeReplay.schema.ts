import { runAsync } from "../../query";

export const createMlShadowRuntimeReplaySchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_runtime_replay_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      replay_key TEXT NOT NULL,
      model_import_id TEXT,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      prediction_type TEXT,
      requested_limit INTEGER NOT NULL DEFAULT 25,
      source_snapshot_count INTEGER NOT NULL DEFAULT 0,
      replayed_snapshot_count INTEGER NOT NULL DEFAULT 0,
      validation_failed_count INTEGER NOT NULL DEFAULT 0,
      model_execution_attempted_count INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed_count INTEGER NOT NULL DEFAULT 0,
      business_mutation_allowed_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'created_audit_only',
      safety_notes_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_runtime_replay_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      attempt_id INTEGER,
      snapshot_id INTEGER NOT NULL,
      prediction_run_id INTEGER,
      prediction_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      runtime_mode TEXT NOT NULL DEFAULT 'disabled',
      validation_status TEXT NOT NULL DEFAULT 'invalid',
      allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_attempted INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      can_change_inventory_or_accounting INTEGER NOT NULL DEFAULT 0,
      baseline_prediction_json TEXT,
      candidate_output_json TEXT,
      delta_json TEXT,
      status TEXT NOT NULL DEFAULT 'candidate_output_unavailable_runtime_disabled',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (batch_id) REFERENCES ml_shadow_runtime_replay_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (attempt_id) REFERENCES ml_shadow_runtime_attempts(id) ON DELETE SET NULL
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_replay_batches_created ON ml_shadow_runtime_replay_batches(created_at, id)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_replay_batches_model ON ml_shadow_runtime_replay_batches(model_import_id, model_key, model_version)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_replay_items_batch ON ml_shadow_runtime_replay_items(batch_id, created_at, id)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_runtime_replay_items_snapshot ON ml_shadow_runtime_replay_items(snapshot_id, prediction_type)`,
  );
};
