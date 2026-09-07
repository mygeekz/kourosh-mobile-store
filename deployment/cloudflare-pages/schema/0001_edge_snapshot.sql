PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenant_installations (
  installation_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  credential_version INTEGER NOT NULL CHECK (credential_version >= 1),
  installation_public_key_pem TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  public_host TEXT NOT NULL COLLATE NOCASE,
  live_origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, bot_id),
  UNIQUE (public_host)
);

CREATE INDEX IF NOT EXISTS idx_tenant_installations_tenant_status
  ON tenant_installations (tenant_id, status);

CREATE TABLE IF NOT EXISTS subject_snapshots (
  tenant_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('customer', 'partner')),
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
  PRIMARY KEY (tenant_id, subject_kind, subject_key),
  FOREIGN KEY (installation_id) REFERENCES tenant_installations(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_snapshots_installation
  ON subject_snapshots (installation_id, subject_kind);
CREATE INDEX IF NOT EXISTS idx_subject_snapshots_authorization
  ON subject_snapshots (tenant_id, authorization_valid_until);

CREATE TABLE IF NOT EXISTS snapshot_sync_replays (
  installation_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (installation_id, request_id),
  FOREIGN KEY (installation_id) REFERENCES tenant_installations(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_sync_replays_expiry
  ON snapshot_sync_replays (expires_at);
