import { runAsync } from "../../query";

export const createMlWorkbenchImportResultAnnotationsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_workbench_import_result_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_result_id INTEGER,
      candidate_package_id TEXT NOT NULL,
      annotation_scope TEXT NOT NULL DEFAULT 'metadata_result' CHECK (annotation_scope IN ('metadata_result', 'trend_signal', 'offline_metrics_comparison', 'dashboard')),
      annotation_kind TEXT NOT NULL DEFAULT 'operator_note' CHECK (annotation_kind IN ('operator_note', 'review_note', 'risk_note', 'follow_up', 'dismissed_signal')),
      severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'watch', 'warning', 'resolved')),
      signal_key TEXT,
      note_text TEXT NOT NULL CHECK (length(note_text) BETWEEN 1 AND 1600),
      metadata_snapshot_json TEXT NOT NULL DEFAULT '{}',
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_execution_allowed INTEGER NOT NULL DEFAULT 0 CHECK (model_execution_allowed = 0),
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (runtime_invocation_allowed = 0),
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0 CHECK (inference_endpoint_exposed = 0),
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (artifact_activation_allowed = 0),
      artifact_bytes_loading_allowed INTEGER NOT NULL DEFAULT 0 CHECK (artifact_bytes_loading_allowed = 0),
      raw_csv_loading_allowed INTEGER NOT NULL DEFAULT 0 CHECK (raw_csv_loading_allowed = 0),
      business_mutation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_allowed = 0),
      governance_workflow_added INTEGER NOT NULL DEFAULT 0 CHECK (governance_workflow_added = 0),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id INTEGER,
      FOREIGN KEY (import_result_id) REFERENCES ml_workbench_import_results(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_result_annotations_candidate ON ml_workbench_import_result_annotations(candidate_package_id, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_result_annotations_result ON ml_workbench_import_result_annotations(import_result_id, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_workbench_import_result_annotations_scope ON ml_workbench_import_result_annotations(annotation_scope, severity, created_at DESC, id DESC)`,
  );
};
