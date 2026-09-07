import { runAsync } from "../../query";

export const createMlOfflineArtifactValidationSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS offline_artifact_validation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id TEXT NOT NULL,
      artifact_hash TEXT,
      artifact_kind TEXT,
      schema_version TEXT,
      model_family TEXT,
      validation_status TEXT NOT NULL,
      trust_score INTEGER NOT NULL,
      trust_label TEXT NOT NULL,
      drift_risk TEXT NOT NULL,
      findings_json TEXT,
      compatibility_json TEXT,
      final_review_snapshot_json TEXT,
      safety_gate_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id TEXT
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_artifact_id ON offline_artifact_validation_results(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_artifact_hash ON offline_artifact_validation_results(artifact_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_validation_status ON offline_artifact_validation_results(validation_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_trust_label ON offline_artifact_validation_results(trust_label)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_drift_risk ON offline_artifact_validation_results(drift_risk)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_offline_artifact_validation_results_created_at ON offline_artifact_validation_results(created_at)`);
};
