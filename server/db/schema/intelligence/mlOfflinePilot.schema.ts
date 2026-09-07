import { runAsync } from "../../query";

export const createMlOfflinePilotSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_pilot_readiness_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate_key TEXT NOT NULL,
      import_id INTEGER,
      stability_check_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      stability_status TEXT,
      stability_evaluations_considered INTEGER NOT NULL DEFAULT 0,
      minimum_evaluations INTEGER NOT NULL DEFAULT 3,
      avg_delta_f1_pct REAL,
      avg_delta_balanced_accuracy_pct REAL,
      owner_approved INTEGER NOT NULL DEFAULT 0,
      owner_name TEXT,
      pilot_owner TEXT,
      rollback_owner TEXT,
      monitoring_cadence TEXT NOT NULL DEFAULT 'offline_daily_review',
      status TEXT NOT NULL DEFAULT 'needs_owner_approval',
      offline_pilot_ready INTEGER NOT NULL DEFAULT 0,
      rollback_policy_json TEXT,
      monitoring_plan_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (stability_check_id) REFERENCES ml_shadow_stability_checks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_readiness_import ON ml_offline_pilot_readiness_checks(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_readiness_status ON ml_offline_pilot_readiness_checks(status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_pilot_decision_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_key TEXT NOT NULL,
      import_id INTEGER,
      offline_pilot_check_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      board_decision TEXT NOT NULL DEFAULT 'needs_more_review',
      board_status TEXT NOT NULL DEFAULT 'needs_more_review',
      board_scope TEXT NOT NULL DEFAULT 'offline_pilot_human_review_only',
      avg_delta_f1_pct REAL,
      avg_delta_balanced_accuracy_pct REAL,
      pilot_owner TEXT,
      rollback_owner TEXT,
      review_board_json TEXT,
      decision_json TEXT,
      action_items_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (offline_pilot_check_id) REFERENCES ml_offline_pilot_readiness_checks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_decisions_import ON ml_offline_pilot_decision_reviews(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_decisions_status ON ml_offline_pilot_decision_reviews(board_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_pilot_review_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pack_key TEXT NOT NULL,
      import_id INTEGER,
      offline_pilot_check_id INTEGER,
      decision_review_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      board_status TEXT,
      board_decision TEXT,
      shadow_evaluations_count INTEGER NOT NULL DEFAULT 0,
      stability_status TEXT,
      offline_pilot_status TEXT,
      rollback_status TEXT NOT NULL DEFAULT 'not_required',
      recommendation TEXT NOT NULL DEFAULT 'pause_for_more_review',
      executive_summary_json TEXT,
      review_pack_json TEXT,
      timeline_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (offline_pilot_check_id) REFERENCES ml_offline_pilot_readiness_checks(id),
      FOREIGN KEY (decision_review_id) REFERENCES ml_offline_pilot_decision_reviews(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_review_packs_import ON ml_offline_pilot_review_packs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_review_packs_recommendation ON ml_offline_pilot_review_packs(recommendation, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_pilot_review_exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      export_key TEXT NOT NULL,
      import_id INTEGER,
      review_pack_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      dashboard_status TEXT NOT NULL DEFAULT 'insufficient_review_data',
      recommendation TEXT,
      rollback_status TEXT NOT NULL DEFAULT 'not_required',
      pilot_readiness_pct REAL,
      shadow_evaluations_count INTEGER NOT NULL DEFAULT 0,
      avg_delta_f1_pct REAL,
      avg_delta_balanced_accuracy_pct REAL,
      export_format TEXT NOT NULL DEFAULT 'json_markdown_bundle',
      kpi_json TEXT,
      export_json TEXT,
      export_markdown TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (review_pack_id) REFERENCES ml_offline_pilot_review_packs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_review_exports_import ON ml_offline_pilot_review_exports(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_review_exports_status ON ml_offline_pilot_review_exports(dashboard_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_pilot_closeouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      closeout_key TEXT NOT NULL,
      import_id INTEGER,
      review_export_id INTEGER,
      review_pack_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      dashboard_status TEXT,
      recommendation TEXT,
      rollback_status TEXT NOT NULL DEFAULT 'not_required',
      pilot_readiness_pct REAL,
      shadow_evaluations_count INTEGER NOT NULL DEFAULT 0,
      avg_delta_f1_pct REAL,
      avg_delta_balanced_accuracy_pct REAL,
      closeout_status TEXT NOT NULL DEFAULT 'needs_more_evidence',
      production_readiness_preconditions_met INTEGER NOT NULL DEFAULT 0,
      owner_signoff INTEGER NOT NULL DEFAULT 0,
      owner_name TEXT,
      production_readiness_owner TEXT,
      closeout_summary_json TEXT,
      preconditions_json TEXT,
      risk_signoff_json TEXT,
      audit_export_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (review_export_id) REFERENCES ml_offline_pilot_review_exports(id),
      FOREIGN KEY (review_pack_id) REFERENCES ml_offline_pilot_review_packs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_closeouts_import ON ml_offline_pilot_closeouts(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_offline_pilot_closeouts_status ON ml_offline_pilot_closeouts(closeout_status, created_at)`,
  );
};
