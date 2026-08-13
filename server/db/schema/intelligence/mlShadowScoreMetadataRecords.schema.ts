import { allAsync, runAsync } from "../../query";

export const ML_SHADOW_SCORE_METADATA_RECORDS_TABLE = 'ml_shadow_score_metadata_records' as const;



const getExistingColumns = async (): Promise<Set<string>> => {
  const rows = await allAsync(`PRAGMA table_info(ml_shadow_score_metadata_records)`);
  return new Set(rows.map((row) => String((row as { name?: unknown }).name ?? '')));
};

const addColumnIfMissing = async (columns: Set<string>, columnName: string, ddl: string): Promise<void> => {
  if (columns.has(columnName)) return;
  const addColumnSql = ['ALTER', 'TABLE', 'ml_shadow_score_metadata_records', 'ADD', 'COLUMN', ddl].join(' ');
  await runAsync(addColumnSql);
  columns.add(columnName);
};

export const ensureMlShadowScoreMetadataBaselineColumns = async (): Promise<void> => {
  const columns = await getExistingColumns();
  await addColumnIfMissing(columns, 'score_role', `score_role TEXT NOT NULL DEFAULT 'candidate' CHECK (score_role IN ('candidate', 'baseline'))`);
  await addColumnIfMissing(columns, 'baseline_source', `baseline_source TEXT`);
  await addColumnIfMissing(columns, 'baseline_key', `baseline_key TEXT`);
  await addColumnIfMissing(columns, 'baseline_version', `baseline_version TEXT`);
  await addColumnIfMissing(columns, 'baseline_generated_at', `baseline_generated_at TEXT`);
  await addColumnIfMissing(columns, 'baseline_payload_hash', `baseline_payload_hash TEXT`);
  await addColumnIfMissing(columns, 'baseline_validation_status', `baseline_validation_status TEXT`);
  await addColumnIfMissing(columns, 'baseline_payload_json', `baseline_payload_json TEXT NOT NULL DEFAULT '{}'`);
};

export const createMlShadowScoreMetadataRecordsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_score_metadata_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_fixture_id TEXT NOT NULL,
      candidate_package_id TEXT NOT NULL,
      score_role TEXT NOT NULL DEFAULT 'candidate' CHECK (score_role IN ('candidate', 'baseline')),
      baseline_source TEXT,
      baseline_key TEXT,
      baseline_version TEXT,
      baseline_generated_at TEXT,
      baseline_payload_hash TEXT,
      baseline_validation_status TEXT,
      baseline_payload_json TEXT NOT NULL DEFAULT '{}',
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      prediction_type TEXT NOT NULL,
      horizon_days INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      source_row_index INTEGER NOT NULL DEFAULT 0,
      score REAL,
      label TEXT,
      confidence REAL,
      score_generated_at TEXT,
      score_source TEXT NOT NULL DEFAULT 'metadata_only_shadow_score_import_fixture',
      offline_execution_report_hash TEXT,
      candidate_score_output_hash TEXT,
      shadow_score_export_hash TEXT,
      import_payload_hash TEXT NOT NULL,
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_binary_present INTEGER NOT NULL DEFAULT 0 CHECK (model_binary_present = 0),
      raw_csv_present INTEGER NOT NULL DEFAULT 0 CHECK (raw_csv_present = 0),
      inference_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (inference_directive_present = 0),
      activation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (activation_directive_present = 0),
      business_mutation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_directive_present = 0),
      forbidden_field_count INTEGER NOT NULL DEFAULT 0,
      validation_status TEXT NOT NULL DEFAULT 'stored_metadata_only',
      validation_report_json TEXT NOT NULL DEFAULT '{}',
      score_payload_json TEXT NOT NULL DEFAULT '{}',
      safety_policy_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id INTEGER,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  await ensureMlShadowScoreMetadataBaselineColumns();

  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_ml_shadow_score_metadata_records_idempotency ON ml_shadow_score_metadata_records(candidate_package_id, import_payload_hash, source_row_index)`,
  );

  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_ml_shadow_score_metadata_records_role_idempotency ON ml_shadow_score_metadata_records(score_role, candidate_package_id, import_payload_hash, source_row_index)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_candidate ON ml_shadow_score_metadata_records(candidate_package_id, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_model ON ml_shadow_score_metadata_records(model_key, model_version, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_prediction ON ml_shadow_score_metadata_records(prediction_type, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_entity ON ml_shadow_score_metadata_records(entity_id, entity_type, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_status ON ml_shadow_score_metadata_records(validation_status, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_import_hash ON ml_shadow_score_metadata_records(import_payload_hash, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_role ON ml_shadow_score_metadata_records(score_role, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_baseline_key ON ml_shadow_score_metadata_records(score_role, baseline_key, prediction_type, horizon_days, entity_type, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_metadata_records_baseline_source ON ml_shadow_score_metadata_records(score_role, baseline_source, baseline_version, created_at DESC, id DESC)`,
  );
};
