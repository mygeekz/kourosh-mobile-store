import { runAsync } from "../../query";

export const createMlArtifactAuditSnapshotGovernanceSignoffSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ml_offline_artifact_audit_snapshot_governance_signoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_snapshot_id INTEGER NOT NULL,
      finalization_id INTEGER NOT NULL,
      retention_governance_archive_id INTEGER NOT NULL,
      retention_governance_review_id INTEGER NOT NULL,
      retention_policy_evidence_id INTEGER NOT NULL,
      archive_pack_id INTEGER NOT NULL,
      signoff_id INTEGER NOT NULL,
      binder_id INTEGER NOT NULL,
      artifact_id INTEGER NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      model_key TEXT NOT NULL,
      model_version TEXT NOT NULL,
      signed_audit_snapshot_hash TEXT NOT NULL,
      signoff_decision TEXT NOT NULL,
      signoff_status TEXT NOT NULL,
      signoff_purpose TEXT NOT NULL,
      audit_reviewer_signoff_notes TEXT NOT NULL,
      exception_notes TEXT,
      rejection_reason TEXT,
      snapshot_acceptance_json TEXT,
      evidence_confidence_json TEXT,
      exception_notes_json TEXT,
      safety_notes_json TEXT,
      signed_audit_snapshot_governance_hash TEXT NOT NULL,
      retention_job_scheduled INTEGER NOT NULL DEFAULT 0,
      deletion_or_purge_allowed INTEGER NOT NULL DEFAULT 0,
      archive_file_created INTEGER NOT NULL DEFAULT 0,
      artifact_bytes_included INTEGER NOT NULL DEFAULT 0,
      artifact_execution_allowed INTEGER NOT NULL DEFAULT 0,
      artifact_auto_activation_allowed INTEGER NOT NULL DEFAULT 0,
      model_execution_allowed INTEGER NOT NULL DEFAULT 0,
      inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0,
      production_integration_allowed INTEGER NOT NULL DEFAULT 0,
      can_mutate_business_records INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      governance_signer_display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    )
  `);

  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_audit_snapshot_id ON ml_offline_artifact_audit_snapshot_governance_signoffs(audit_snapshot_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_artifact_id ON ml_offline_artifact_audit_snapshot_governance_signoffs(artifact_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_model_key ON ml_offline_artifact_audit_snapshot_governance_signoffs(model_key)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_model_version ON ml_offline_artifact_audit_snapshot_governance_signoffs(model_version)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_hash ON ml_offline_artifact_audit_snapshot_governance_signoffs(signed_audit_snapshot_governance_hash)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_status ON ml_offline_artifact_audit_snapshot_governance_signoffs(signoff_status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ml_offline_audit_snapshot_governance_signoffs_created ON ml_offline_artifact_audit_snapshot_governance_signoffs(created_at)`);
};
