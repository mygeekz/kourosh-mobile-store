import { runAsync } from "../../query";

export const createMlProductionReadinessSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_readiness_design_specs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_key TEXT NOT NULL,
      import_id INTEGER,
      closeout_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      closeout_status TEXT,
      rollback_status TEXT NOT NULL DEFAULT 'not_required',
      design_status TEXT NOT NULL DEFAULT 'needs_safety_review',
      recommendation TEXT,
      production_readiness_design_preconditions_met INTEGER NOT NULL DEFAULT 0,
      architecture_owner TEXT,
      security_review_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      manual_override_owner TEXT,
      architecture_spec_json TEXT,
      safety_architecture_json TEXT,
      rollout_rollback_plan_json TEXT,
      audit_design_spec_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (closeout_id) REFERENCES ml_offline_pilot_closeouts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_readiness_design_specs_import ON ml_production_readiness_design_specs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_readiness_design_specs_status ON ml_production_readiness_design_specs(design_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_readiness_backlogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backlog_key TEXT NOT NULL,
      import_id INTEGER,
      design_spec_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      design_status TEXT,
      backlog_status TEXT NOT NULL DEFAULT 'not_started',
      release_gate_status TEXT NOT NULL DEFAULT 'not_ready',
      recommendation TEXT,
      owner_matrix_complete INTEGER NOT NULL DEFAULT 0,
      risk_register_status TEXT NOT NULL DEFAULT 'draft',
      total_backlog_items INTEGER NOT NULL DEFAULT 0,
      ready_backlog_items INTEGER NOT NULL DEFAULT 0,
      open_blocker_count INTEGER NOT NULL DEFAULT 0,
      high_risk_count INTEGER NOT NULL DEFAULT 0,
      architecture_owner TEXT,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      risk_owner TEXT,
      backlog_json TEXT,
      risk_register_json TEXT,
      owner_matrix_json TEXT,
      release_gate_checklist_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (design_spec_id) REFERENCES ml_production_readiness_design_specs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_readiness_backlogs_import ON ml_production_readiness_backlogs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_readiness_backlogs_status ON ml_production_readiness_backlogs(backlog_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_release_gate_simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simulation_key TEXT NOT NULL,
      import_id INTEGER,
      backlog_id INTEGER,
      design_spec_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      backlog_status TEXT,
      backlog_release_gate_status TEXT,
      simulated_release_gate_status TEXT NOT NULL DEFAULT 'not_ready',
      simulation_status TEXT NOT NULL DEFAULT 'not_started',
      recommendation TEXT,
      readiness_score_pct REAL,
      owner_matrix_complete INTEGER NOT NULL DEFAULT 0,
      risk_register_status TEXT,
      release_gate_checklist_status TEXT,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      simulation_json TEXT,
      gate_results_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (backlog_id) REFERENCES ml_production_readiness_backlogs(id),
      FOREIGN KEY (design_spec_id) REFERENCES ml_production_readiness_design_specs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_release_gate_simulations_import ON ml_production_release_gate_simulations(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_release_gate_simulations_status ON ml_production_release_gate_simulations(simulation_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_implementation_readiness_charters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      charter_key TEXT NOT NULL,
      import_id INTEGER,
      simulation_id INTEGER,
      backlog_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      simulation_status TEXT,
      simulated_release_gate_status TEXT,
      charter_status TEXT NOT NULL DEFAULT 'not_started',
      recommendation TEXT,
      readiness_score_pct REAL,
      scope_boundary_status TEXT NOT NULL DEFAULT 'needs_review',
      owner_matrix_status TEXT NOT NULL DEFAULT 'incomplete',
      go_no_go_status TEXT NOT NULL DEFAULT 'needs_review',
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      signoff_owner TEXT,
      executive_sponsor TEXT,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      change_manager TEXT,
      charter_json TEXT,
      scope_boundary_json TEXT,
      responsibility_matrix_json TEXT,
      go_no_go_checklist_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (simulation_id) REFERENCES ml_production_release_gate_simulations(id),
      FOREIGN KEY (backlog_id) REFERENCES ml_production_readiness_backlogs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_implementation_charters_import ON ml_production_implementation_readiness_charters(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_implementation_charters_status ON ml_production_implementation_readiness_charters(charter_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_implementation_work_order_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_key TEXT NOT NULL,
      import_id INTEGER,
      charter_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      charter_status TEXT,
      charter_go_no_go_status TEXT,
      work_order_status TEXT NOT NULL DEFAULT 'not_started',
      recommendation TEXT,
      readiness_score_pct REAL,
      work_order_scope_status TEXT NOT NULL DEFAULT 'needs_review',
      owner_matrix_status TEXT NOT NULL DEFAULT 'incomplete',
      release_handoff_status TEXT NOT NULL DEFAULT 'blocked',
      epic_count INTEGER NOT NULL DEFAULT 0,
      task_count INTEGER NOT NULL DEFAULT 0,
      acceptance_criteria_count INTEGER NOT NULL DEFAULT 0,
      qa_checklist_count INTEGER NOT NULL DEFAULT 0,
      rollout_checklist_count INTEGER NOT NULL DEFAULT 0,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      change_manager TEXT,
      release_manager TEXT,
      work_order_json TEXT,
      epic_breakdown_json TEXT,
      task_breakdown_json TEXT,
      acceptance_criteria_json TEXT,
      qa_plan_json TEXT,
      rollout_checklist_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (charter_id) REFERENCES ml_production_implementation_readiness_charters(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_work_orders_import ON ml_production_implementation_work_order_packs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_work_orders_status ON ml_production_implementation_work_order_packs(work_order_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_implementation_dry_run_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dry_run_key TEXT NOT NULL,
      import_id INTEGER,
      work_order_id INTEGER,
      charter_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      work_order_status TEXT,
      release_handoff_status TEXT,
      dry_run_status TEXT NOT NULL DEFAULT 'not_started',
      recommendation TEXT,
      readiness_score_pct REAL,
      dependency_sequence_status TEXT NOT NULL DEFAULT 'not_started',
      milestone_plan_status TEXT NOT NULL DEFAULT 'not_started',
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      dependency_count INTEGER NOT NULL DEFAULT 0,
      milestone_count INTEGER NOT NULL DEFAULT 0,
      dry_run_task_count INTEGER NOT NULL DEFAULT 0,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      change_manager TEXT,
      release_manager TEXT,
      dry_run_plan_json TEXT,
      dependency_sequence_json TEXT,
      milestone_plan_json TEXT,
      readiness_blockers_json TEXT,
      dry_run_checklist_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (work_order_id) REFERENCES ml_production_implementation_work_order_packs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_plans_import ON ml_production_implementation_dry_run_plans(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_plans_status ON ml_production_implementation_dry_run_plans(dry_run_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_dry_run_execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_log_key TEXT NOT NULL,
      import_id INTEGER,
      dry_run_plan_id INTEGER,
      work_order_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      dry_run_status TEXT,
      execution_status TEXT NOT NULL DEFAULT 'not_started',
      recommendation TEXT,
      readiness_score_pct REAL,
      evidence_binder_status TEXT NOT NULL DEFAULT 'missing',
      signoff_status TEXT NOT NULL DEFAULT 'missing',
      evidence_item_count INTEGER NOT NULL DEFAULT 0,
      accepted_evidence_count INTEGER NOT NULL DEFAULT 0,
      signoff_count INTEGER NOT NULL DEFAULT 0,
      unresolved_blocker_count INTEGER NOT NULL DEFAULT 0,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      change_manager TEXT,
      release_manager TEXT,
      evidence_items_json TEXT,
      signoffs_json TEXT,
      unresolved_blockers_json TEXT,
      evidence_binder_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (dry_run_plan_id) REFERENCES ml_production_implementation_dry_run_plans(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_execution_logs_import ON ml_production_dry_run_execution_logs(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_execution_logs_status ON ml_production_dry_run_execution_logs(execution_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_dry_run_closeout_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      closeout_memo_key TEXT NOT NULL,
      import_id INTEGER,
      execution_log_id INTEGER,
      dry_run_plan_id INTEGER,
      work_order_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      execution_status TEXT,
      evidence_binder_status TEXT,
      signoff_status TEXT,
      closeout_status TEXT NOT NULL DEFAULT 'not_started',
      final_recommendation TEXT,
      readiness_score_pct REAL,
      evidence_item_count INTEGER NOT NULL DEFAULT 0,
      accepted_evidence_count INTEGER NOT NULL DEFAULT 0,
      signoff_count INTEGER NOT NULL DEFAULT 0,
      unresolved_blocker_count INTEGER NOT NULL DEFAULT 0,
      risk_count INTEGER NOT NULL DEFAULT 0,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      memo_owner TEXT,
      decision_owner TEXT,
      review_board_chair TEXT,
      product_owner TEXT,
      engineering_owner TEXT,
      qa_owner TEXT,
      security_owner TEXT,
      monitoring_owner TEXT,
      rollback_owner TEXT,
      closeout_memo_json TEXT,
      evidence_summary_json TEXT,
      signoff_summary_json TEXT,
      risk_summary_json TEXT,
      decision_summary_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (execution_log_id) REFERENCES ml_production_dry_run_execution_logs(id),
      FOREIGN KEY (dry_run_plan_id) REFERENCES ml_production_implementation_dry_run_plans(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_closeout_memos_import ON ml_production_dry_run_closeout_memos(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_dry_run_closeout_memos_status ON ml_production_dry_run_closeout_memos(closeout_status, created_at)`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_production_governance_signoff_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      governance_key TEXT NOT NULL,
      import_id INTEGER,
      closeout_memo_id INTEGER,
      execution_log_id INTEGER,
      model_key TEXT,
      model_version TEXT,
      closeout_status TEXT,
      final_recommendation TEXT,
      governance_status TEXT NOT NULL DEFAULT 'not_started',
      implementation_entry_decision TEXT,
      phase2_closed INTEGER NOT NULL DEFAULT 0,
      readiness_score_pct REAL,
      governance_signoff_status TEXT,
      board_quorum_status TEXT,
      implementation_entry_status TEXT,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      total_gate_count INTEGER NOT NULL DEFAULT 0,
      executive_sponsor TEXT,
      governance_owner TEXT,
      decision_owner TEXT,
      phase3_owner TEXT,
      rollback_owner TEXT,
      risk_owner TEXT,
      governance_summary_json TEXT,
      signoff_matrix_json TEXT,
      implementation_entry_decision_json TEXT,
      phase2_closeout_archive_json TEXT,
      audit_export_json TEXT,
      summary_json TEXT,
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (import_id) REFERENCES ml_model_result_imports(id),
      FOREIGN KEY (closeout_memo_id) REFERENCES ml_production_dry_run_closeout_memos(id),
      FOREIGN KEY (execution_log_id) REFERENCES ml_production_dry_run_execution_logs(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_governance_signoff_decisions_import ON ml_production_governance_signoff_decisions(import_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_production_governance_signoff_decisions_status ON ml_production_governance_signoff_decisions(governance_status, created_at)`,
  );
};
