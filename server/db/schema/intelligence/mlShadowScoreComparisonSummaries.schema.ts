import { runAsync } from "../../query";

export const ML_SHADOW_SCORE_COMPARISON_SUMMARIES_TABLE = 'ml_shadow_score_comparison_summaries' as const;

export const createMlShadowScoreComparisonSummariesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_shadow_score_comparison_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_key TEXT NOT NULL,
      candidate_package_id TEXT NOT NULL,
      baseline_source TEXT NOT NULL CHECK (baseline_source IN ('stored_metadata', 'fixture_metadata', 'none')),
      baseline_key TEXT,
      prediction_type TEXT,
      horizon_days INTEGER,
      entity_type TEXT,
      comparison_status TEXT NOT NULL,
      baseline_coverage_status TEXT NOT NULL CHECK (baseline_coverage_status IN ('complete', 'partial', 'missing')),
      candidate_count INTEGER NOT NULL DEFAULT 0,
      baseline_count INTEGER NOT NULL DEFAULT 0,
      matched_entity_count INTEGER NOT NULL DEFAULT 0,
      missing_baseline_count INTEGER NOT NULL DEFAULT 0,
      extra_baseline_count INTEGER NOT NULL DEFAULT 0,
      coverage_ratio REAL NOT NULL DEFAULT 0,
      absolute_delta_mean REAL,
      absolute_delta_max REAL,
      signed_delta_mean REAL,
      label_agreement_rate REAL,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      comparison_generated_at TEXT NOT NULL,
      comparison_result_hash TEXT NOT NULL,
      summary_payload_json TEXT NOT NULL DEFAULT '{}',
      comparison_result_json TEXT NOT NULL DEFAULT '{}',
      metadata_only INTEGER NOT NULL DEFAULT 1 CHECK (metadata_only = 1),
      model_binary_present INTEGER NOT NULL DEFAULT 0 CHECK (model_binary_present = 0),
      raw_csv_present INTEGER NOT NULL DEFAULT 0 CHECK (raw_csv_present = 0),
      inference_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (inference_directive_present = 0),
      activation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (activation_directive_present = 0),
      business_mutation_directive_present INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_directive_present = 0),
      safety_policy_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      created_by_user_id INTEGER,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_ml_shadow_score_comparison_summaries_key ON ml_shadow_score_comparison_summaries(summary_key)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_comparison_summaries_candidate ON ml_shadow_score_comparison_summaries(candidate_package_id, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_comparison_summaries_baseline ON ml_shadow_score_comparison_summaries(baseline_source, baseline_key, prediction_type, horizon_days, entity_type, created_at DESC, id DESC)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_shadow_score_comparison_summaries_status ON ml_shadow_score_comparison_summaries(comparison_status, baseline_coverage_status, created_at DESC, id DESC)`,
  );
};
