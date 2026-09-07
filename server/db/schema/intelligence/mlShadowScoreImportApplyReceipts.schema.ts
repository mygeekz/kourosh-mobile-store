import { runAsync } from '../../query';

export const ML_SHADOW_SCORE_IMPORT_APPLY_RECEIPTS_TABLE = 'ml_shadow_score_import_apply_receipts' as const;

export const createMlShadowScoreImportApplyReceiptsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_score_import_apply_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id TEXT NOT NULL UNIQUE,
      import_payload_hash TEXT,
      candidate_package_id TEXT,
      model_key TEXT,
      model_version TEXT,
      prediction_type TEXT,
      source TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0 CHECK (dry_run IN (0, 1)),
      status TEXT NOT NULL CHECK (status IN ('applied', 'dry_run', 'rejected', 'partial')),
      records_received INTEGER NOT NULL DEFAULT 0,
      records_inserted INTEGER NOT NULL DEFAULT 0,
      records_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
      records_rejected INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      warnings_json TEXT NOT NULL DEFAULT '[]',
      errors_json TEXT NOT NULL DEFAULT '[]',
      safety_policy_json TEXT NOT NULL DEFAULT '{}',
      apply_result_json TEXT NOT NULL DEFAULT '{}',
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_execution_allowed INTEGER NOT NULL DEFAULT 0 CHECK (model_execution_allowed = 0),
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0 CHECK (inference_endpoint_exposed = 0),
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (artifact_activation_allowed = 0),
      business_mutation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_allowed = 0),
      requested_by_user_id TEXT,
      trace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_receipt_id ON ml_shadow_score_import_apply_receipts(receipt_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_import_payload_hash ON ml_shadow_score_import_apply_receipts(import_payload_hash, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_candidate_package ON ml_shadow_score_import_apply_receipts(candidate_package_id, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_status ON ml_shadow_score_import_apply_receipts(status, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_source ON ml_shadow_score_import_apply_receipts(source, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_dry_run ON ml_shadow_score_import_apply_receipts(dry_run, created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_created_at ON ml_shadow_score_import_apply_receipts(created_at DESC, id DESC)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_import_apply_receipts_requested_by_user ON ml_shadow_score_import_apply_receipts(requested_by_user_id, created_at DESC, id DESC)`);
};
