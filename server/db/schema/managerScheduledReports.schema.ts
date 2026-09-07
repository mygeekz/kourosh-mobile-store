import { runAsync } from "../query";

/**
 * Stage 6 durable manager scheduled reports.
 * Schedules are tenant-scoped via tenant_memberships and each logical occurrence
 * is persisted before execution so restart/catch-up is deterministic.
 */
export const createManagerScheduledReportsSchema = async (): Promise<void> => {
  await runAsync(`CREATE TABLE IF NOT EXISTS manager_report_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_membership_id INTEGER NOT NULL,
    report_key TEXT NOT NULL CHECK(report_key IN ('nightly_sales','morning_installments')),
    local_time TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0,1)),
    channels_json TEXT NOT NULL DEFAULT '{"inApp":true,"telegram":false}',
    config_json TEXT NOT NULL DEFAULT '{}',
    catch_up_policy TEXT NOT NULL DEFAULT 'catch_up' CHECK(catch_up_policy IN ('catch_up','skip_if_old')),
    max_age_minutes INTEGER NOT NULL DEFAULT 360 CHECK(max_age_minutes BETWEEN 1 AND 10080),
    grace_minutes INTEGER NOT NULL DEFAULT 20 CHECK(grace_minutes BETWEEN 1 AND 1440),
    reconcile_from TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    created_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    UNIQUE(tenant_membership_id, report_key),
    FOREIGN KEY (tenant_membership_id) REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_manager_report_schedules_due ON manager_report_schedules(is_enabled,report_key,local_time)",
  );

  await runAsync(`CREATE TABLE IF NOT EXISTS scheduled_job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    scheduled_for TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','running','completed','failed','skipped')),
    started_at TEXT,
    executed_at TEXT,
    completed_at TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count >= 0),
    next_retry_at TEXT,
    last_error TEXT,
    result_json TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    UNIQUE(schedule_id, scheduled_for),
    FOREIGN KEY (schedule_id) REFERENCES manager_report_schedules(id) ON DELETE CASCADE
  )`);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_worker ON scheduled_job_runs(status,next_retry_at,scheduled_for,id)",
  );
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_schedule ON scheduled_job_runs(schedule_id,scheduled_for DESC,id DESC)",
  );
};
