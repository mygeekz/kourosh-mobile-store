import { runAsync } from "../../query";

export const createMlArtifactIntakeSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_name TEXT NOT NULL,
      artifact_kind TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      source TEXT NOT NULL,
      declared_format TEXT NOT NULL,
      declared_purpose TEXT NOT NULL,
      related_model_import_id TEXT,
      sha256 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      artifact_payload_json TEXT,
      validation_messages_json TEXT,
      safety_notes_json TEXT,
      intake_status TEXT NOT NULL DEFAULT 'quarantined',
      quarantine_status TEXT NOT NULL DEFAULT 'quarantined',
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_model_key ON ml_offline_artifacts(model_key)`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_model_version ON ml_offline_artifacts(model_version)`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_sha256 ON ml_offline_artifacts(sha256)`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_intake_status ON ml_offline_artifacts(intake_status)`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_quarantine_status ON ml_offline_artifacts(quarantine_status)`,
  );
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_artifacts_created_at ON ml_offline_artifacts(created_at)`,
  );
};
