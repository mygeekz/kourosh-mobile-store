-- v342: append-only accounting period state history.
-- The original lock row remains immutable historical evidence; reopening/reclosing
-- appends state events instead of rewriting the original close.
-- Self-contained prerequisite: legacy databases may reach the migration runner
-- before the newer governance schema has ever been bootstrapped.
CREATE TABLE IF NOT EXISTS accounting_period_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periodStart TEXT NOT NULL,
  periodEnd TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status = 'closed'),
  closeReason TEXT,
  closedByUserId INTEGER,
  closedByUsername TEXT,
  closedByRole TEXT,
  closedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
  snapshotId INTEGER,
  CHECK (date(periodStart) IS NOT NULL AND date(periodEnd) IS NOT NULL AND date(periodStart) <= date(periodEnd)),
  UNIQUE(periodStart, periodEnd)
);
CREATE INDEX IF NOT EXISTS idx_accounting_period_locks_range ON accounting_period_locks(periodStart, periodEnd);

CREATE TABLE IF NOT EXISTS accounting_period_state_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lockId INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('closed','reopened')),
  reason TEXT NOT NULL,
  snapshotId INTEGER,
  actorUserId INTEGER,
  actorUsername TEXT,
  actorRole TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
);

CREATE INDEX IF NOT EXISTS idx_accounting_period_state_events_lock
  ON accounting_period_state_events(lockId, id DESC);

CREATE TRIGGER IF NOT EXISTS trg_accounting_period_state_events_no_update
BEFORE UPDATE ON accounting_period_state_events
BEGIN
  SELECT RAISE(ABORT, 'accounting_period_state_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounting_period_state_events_no_delete
BEFORE DELETE ON accounting_period_state_events
BEGIN
  SELECT RAISE(ABORT, 'accounting_period_state_events is append-only');
END;

-- Existing closed periods get one baseline close event. This preserves the
-- original lock record while making effective-state queries deterministic.
INSERT INTO accounting_period_state_events(lockId, action, reason, snapshotId, actorUserId, actorUsername, actorRole, createdAt)
SELECT apl.id,
       'closed',
       COALESCE(NULLIF(TRIM(apl.closeReason),''), 'legacy close baseline'),
       apl.snapshotId,
       apl.closedByUserId,
       apl.closedByUsername,
       apl.closedByRole,
       COALESCE(apl.closedAt, strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
  FROM accounting_period_locks apl
 WHERE NOT EXISTS (
   SELECT 1 FROM accounting_period_state_events e WHERE e.lockId = apl.id
 );
