import { runAsync } from "../../query";

export const createMlCandidatePackageRetentionArchiveFinalAuditSnapshotsSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_candidate_package_retention_archive_final_audit_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retention_signoff_archive_pack_id INTEGER,
      retention_signoff_archive_pack_key TEXT NOT NULL,
      retention_signoff_archive_pack_version TEXT NOT NULL DEFAULT 'v1',
      retention_signoff_archive_pack_status TEXT,
      signed_retention_signoff_archive_hash TEXT NOT NULL,
      retention_review_signoff_id INTEGER,
      signed_retention_review_signoff_hash TEXT,
      package_id INTEGER,
      package_key TEXT NOT NULL,
      package_version TEXT NOT NULL DEFAULT 'v1',
      retention_archive_final_audit_snapshot_key TEXT NOT NULL,
      retention_archive_final_audit_snapshot_version TEXT NOT NULL DEFAULT 'v1',
      snapshot_status TEXT NOT NULL,
      readiness_score_pct REAL,
      audit_snapshot_json TEXT NOT NULL,
      retention_policy_json TEXT NOT NULL,
      safety_policy_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      signed_retention_archive_final_audit_snapshot_hash TEXT NOT NULL,
      retention_archive_final_audit_snapshot_is_production_approval INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_load_archive_bytes INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_load_package_bytes INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_persist_artifact_bytes INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_execute_model INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_invoke_runtime INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_expose_inference_endpoint INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_activate_artifact INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_deploy_artifact INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_production_score INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_schedule_retention_jobs INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_can_delete_or_purge INTEGER NOT NULL DEFAULT 0,
      retention_archive_final_audit_snapshot_metadata_only INTEGER NOT NULL DEFAULT 1,
      retention_policy_locked INTEGER NOT NULL DEFAULT 1,
      final_audit_snapshot_immutable INTEGER NOT NULL DEFAULT 1,
      retention_execution_allowed INTEGER NOT NULL DEFAULT 0,
      automatic_deletion_allowed INTEGER NOT NULL DEFAULT 0,
      purge_job_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      runtime_invocation_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      artifact_activation_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_loading_allowed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      decision_automation_allowed INTEGER NOT NULL DEFAULT 0,
      inventory_accounting_change_allowed INTEGER NOT NULL DEFAULT 0,
      pricing_change_allowed INTEGER NOT NULL DEFAULT 0,
      reports_change_allowed INTEGER NOT NULL DEFAULT 0,
      ledger_change_allowed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      user_id INTEGER,
      FOREIGN KEY (retention_signoff_archive_pack_id) REFERENCES ml_candidate_package_retention_signoff_archive_packs(id),
      FOREIGN KEY (retention_review_signoff_id) REFERENCES ml_candidate_package_archive_retention_review_signoffs(id),
      FOREIGN KEY (package_id) REFERENCES ml_candidate_model_packages(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_retention_archive_final_audit_snapshots_archive_id ON ml_candidate_package_retention_archive_final_audit_snapshots(retention_signoff_archive_pack_id, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_retention_archive_final_audit_snapshots_key ON ml_candidate_package_retention_archive_final_audit_snapshots(retention_archive_final_audit_snapshot_key, created_at)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_ml_candidate_package_retention_archive_final_audit_snapshots_hash ON ml_candidate_package_retention_archive_final_audit_snapshots(signed_retention_archive_final_audit_snapshot_hash)`,
  );
};
