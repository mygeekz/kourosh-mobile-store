PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS manager_snapshots (
  tenant_id TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
  schema_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active', 'revoked')),
  generated_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  authorization_valid_until TEXT NOT NULL,
  payload_json TEXT,
  content_hash TEXT NOT NULL,
  PRIMARY KEY (tenant_id, subject_key),
  FOREIGN KEY (installation_id) REFERENCES tenant_installations(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_snapshots_installation
  ON manager_snapshots (installation_id);
CREATE INDEX IF NOT EXISTS idx_manager_snapshots_authorization
  ON manager_snapshots (tenant_id, authorization_valid_until);
