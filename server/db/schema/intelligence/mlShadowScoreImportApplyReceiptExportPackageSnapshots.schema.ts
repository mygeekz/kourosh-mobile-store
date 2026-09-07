import { runAsync } from '../../query';

export const ML_SHADOW_SCORE_IMPORT_APPLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOTS_TABLE = 'ml_shadow_score_import_apply_receipt_export_package_snapshots' as const;

export const createMlShadowScoreImportApplyReceiptExportPackageSnapshotsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_score_import_apply_receipt_export_package_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id TEXT NOT NULL UNIQUE,
      package_id TEXT NOT NULL,
      package_type TEXT NOT NULL,
      package_version TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      receipt_hash TEXT NOT NULL,
      receipt_count INTEGER NOT NULL DEFAULT 0,
      status_counts_json TEXT NOT NULL DEFAULT '{}',
      source_counts_json TEXT NOT NULL DEFAULT '{}',
      dry_run_count INTEGER NOT NULL DEFAULT 0,
      applied_count INTEGER NOT NULL DEFAULT 0,
      rejected_count INTEGER NOT NULL DEFAULT 0,
      total_records_received INTEGER NOT NULL DEFAULT 0,
      total_records_inserted INTEGER NOT NULL DEFAULT 0,
      total_records_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
      total_records_rejected INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      filters_json TEXT NOT NULL DEFAULT '{}',
      page_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      safety_json TEXT NOT NULL DEFAULT '{}',
      package_payload_json TEXT NOT NULL DEFAULT '{}',
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_execution_allowed INTEGER NOT NULL DEFAULT 0 CHECK (model_execution_allowed = 0),
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0 CHECK (inference_endpoint_exposed = 0),
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (artifact_activation_allowed = 0),
      business_mutation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_allowed = 0),
      contains_model_bytes INTEGER NOT NULL DEFAULT 0 CHECK (contains_model_bytes = 0),
      contains_raw_csv INTEGER NOT NULL DEFAULT 0 CHECK (contains_raw_csv = 0),
      contains_filesystem_paths INTEGER NOT NULL DEFAULT 0 CHECK (contains_filesystem_paths = 0),
      generated_by_user_id TEXT,
      trace_id TEXT,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_snapshot_id ON ml_shadow_score_import_apply_receipt_export_package_snapshots(snapshot_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_package_id ON ml_shadow_score_import_apply_receipt_export_package_snapshots(package_id, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_content_hash ON ml_shadow_score_import_apply_receipt_export_package_snapshots(content_hash, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_receipt_hash ON ml_shadow_score_import_apply_receipt_export_package_snapshots(receipt_hash, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_package_type ON ml_shadow_score_import_apply_receipt_export_package_snapshots(package_type, package_version, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_generated_by_user_id ON ml_shadow_score_import_apply_receipt_export_package_snapshots(generated_by_user_id, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_trace_id ON ml_shadow_score_import_apply_receipt_export_package_snapshots(trace_id, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_generated_at ON ml_shadow_score_import_apply_receipt_export_package_snapshots(generated_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipt_export_package_snapshots_created_at ON ml_shadow_score_import_apply_receipt_export_package_snapshots(created_at DESC, id DESC)`);
};
