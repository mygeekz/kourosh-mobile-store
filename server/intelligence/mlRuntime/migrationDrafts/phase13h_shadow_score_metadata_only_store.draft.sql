-- Phase 13H DRAFT ONLY. DO NOT RUN.
-- This SQL is a schema design artifact for metadata-only shadow scores.
-- It is not referenced by backend runtime code, not loaded by a migration runner,
-- not applied to SQLite, and not part of production inference or automation.

CREATE TABLE IF NOT EXISTS shadow_score_metadata_only_store (
  storage_record_id TEXT PRIMARY KEY,
  import_record_id TEXT NOT NULL,
  shadow_score_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  horizon_days REAL,
  candidate_score REAL,
  candidate_label TEXT NOT NULL,
  candidate_confidence REAL CHECK (candidate_confidence IS NULL OR (candidate_confidence >= 0 AND candidate_confidence <= 1)),
  score_quality TEXT NOT NULL,
  model_key TEXT NOT NULL,
  model_version TEXT NOT NULL,
  candidate_package_id TEXT NOT NULL,
  source_import_fixture_id TEXT NOT NULL,
  source_shadow_export_id TEXT NOT NULL,
  source_export_record_hash TEXT NOT NULL,
  score_generated_at TEXT NOT NULL,
  export_generated_at TEXT NOT NULL,
  import_fixture_generated_at TEXT NOT NULL,
  metadata_fingerprint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  storage_class TEXT NOT NULL CHECK (storage_class = 'metadata_only_shadow_score_storage_schema_draft'),
  storage_mode TEXT NOT NULL CHECK (storage_mode = 'schema_draft_no_write'),
  evidence_only INTEGER NOT NULL CHECK (evidence_only = 1),
  metadata_only INTEGER NOT NULL CHECK (metadata_only = 1),
  schema_draft_only INTEGER NOT NULL CHECK (schema_draft_only = 1),
  repository_write_method_available INTEGER NOT NULL DEFAULT 0 CHECK (repository_write_method_available = 0),
  database_write_allowed INTEGER NOT NULL DEFAULT 0 CHECK (database_write_allowed = 0),
  route_exposed INTEGER NOT NULL DEFAULT 0 CHECK (route_exposed = 0),
  model_execution_allowed INTEGER NOT NULL DEFAULT 0 CHECK (model_execution_allowed = 0),
  inference_endpoint_exposed INTEGER NOT NULL DEFAULT 0 CHECK (inference_endpoint_exposed = 0),
  artifact_activation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (artifact_activation_allowed = 0),
  business_mutation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (business_mutation_allowed = 0),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_shadow_score_metadata_only_store_fingerprint
  ON shadow_score_metadata_only_store (metadata_fingerprint);

CREATE UNIQUE INDEX IF NOT EXISTS ux_shadow_score_metadata_only_store_idempotency_key
  ON shadow_score_metadata_only_store (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_shadow_score_metadata_only_store_entity
  ON shadow_score_metadata_only_store (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS ix_shadow_score_metadata_only_store_model
  ON shadow_score_metadata_only_store (model_key, model_version);

CREATE INDEX IF NOT EXISTS ix_shadow_score_metadata_only_store_package
  ON shadow_score_metadata_only_store (candidate_package_id);
