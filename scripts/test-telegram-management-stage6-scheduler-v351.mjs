import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { mapSourceEventToManagerNotificationKey } from '../server/notifications/managerNotificationCatalog.ts';

assert.equal(mapSourceEventToManagerNotificationKey('reports', 'MANAGER_REPORT_NIGHTLY_SALES'), 'report.sales.nightly');
assert.equal(mapSourceEventToManagerNotificationKey('reports', 'MANAGER_REPORT_MORNING_INSTALLMENTS'), 'report.installments.morning');
assert.equal(mapSourceEventToManagerNotificationKey('reports', 'NIGHTLY_REPORT'), null);

const source = fs.readFileSync('server/db/schema/managerScheduledReports.schema.ts', 'utf8');
const scheduleSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS manager_report_schedules[\s\S]*?)`\);/)?.[1];
const runSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS scheduled_job_runs[\s\S]*?)`\);/)?.[1];
assert.ok(scheduleSql, 'manager_report_schedules schema not found');
assert.ok(runSql, 'scheduled_job_runs schema not found');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE)');
db.exec(`CREATE TABLE tenant_memberships(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tenant_id,user_id)
)`);
db.exec(scheduleSql);
db.exec(runSql);

db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(1, 'manager_a');
db.prepare("INSERT INTO tenant_memberships(id,tenant_id,user_id,status) VALUES(1,'tenant-a',1,'active')").run();
const scheduleId = Number(db.prepare(`INSERT INTO manager_report_schedules(
  tenant_membership_id,report_key,local_time,timezone,is_enabled,channels_json,config_json,catch_up_policy,max_age_minutes,grace_minutes
) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
  1, 'nightly_sales', '23:30', 'Asia/Tehran', 1, '{"inApp":true,"telegram":false}', '{"includeProfit":true}', 'catch_up', 720, 20,
).lastInsertRowid);

const occurrence = '2026-09-05T20:00:00.000Z';
db.prepare(`INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status) VALUES(?,?,'scheduled')`).run(scheduleId, occurrence);
assert.throws(
  () => db.prepare(`INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status) VALUES(?,?,'scheduled')`).run(scheduleId, occurrence),
  /UNIQUE constraint failed/,
  'same schedule occurrence must never be inserted twice',
);

const runId = Number(db.prepare('SELECT id FROM scheduled_job_runs WHERE schedule_id=?').get(scheduleId).id);
const claimed = db.prepare(`UPDATE scheduled_job_runs SET status='running',executed_at='2026-09-05T20:01:00Z' WHERE id=? AND status='scheduled'`).run(runId);
assert.equal(Number(claimed.changes), 1);
const duplicateClaim = db.prepare(`UPDATE scheduled_job_runs SET status='running' WHERE id=? AND status='scheduled'`).run(runId);
assert.equal(Number(duplicateClaim.changes), 0, 'claimed occurrence cannot be claimed twice');

db.prepare(`UPDATE scheduled_job_runs SET status='failed',delivery_status='failed',retry_count=1,next_retry_at='2026-09-05T20:06:00Z',last_error='network' WHERE id=?`).run(runId);
let row = db.prepare(`SELECT status,delivery_status AS deliveryStatus,retry_count AS retryCount,next_retry_at AS nextRetryAt FROM scheduled_job_runs WHERE id=?`).get(runId);
assert.equal(row.status, 'failed');
assert.equal(row.deliveryStatus, 'failed');
assert.equal(Number(row.retryCount), 1);
assert.equal(row.nextRetryAt, '2026-09-05T20:06:00Z');

db.prepare(`UPDATE scheduled_job_runs SET status='running',retry_count=2 WHERE id=? AND status='failed' AND retry_count<3`).run(runId);
db.prepare(`UPDATE scheduled_job_runs SET status='completed',delivery_status='queued_and_delivered',completed_at='2026-09-05T20:07:00Z',last_error=NULL WHERE id=?`).run(runId);
row = db.prepare(`SELECT status,delivery_status AS deliveryStatus,retry_count AS retryCount FROM scheduled_job_runs WHERE id=?`).get(runId);
assert.equal(row.status, 'completed');
assert.equal(row.deliveryStatus, 'queued_and_delivered');
assert.equal(Number(row.retryCount), 2);

// Skip state is persisted instead of silently dropping a missed occurrence.
db.prepare(`INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status,delivery_status,last_error,completed_at) VALUES(?,?,'skipped','none','catch_up_window_expired','2026-09-06T10:00:00Z')`).run(scheduleId, '2026-09-04T20:00:00.000Z');
assert.equal(Number(db.prepare(`SELECT COUNT(*) AS count FROM scheduled_job_runs WHERE schedule_id=? AND status='skipped'`).get(scheduleId).count), 1);

// Status and policy guards fail closed.
assert.throws(() => db.prepare(`INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status) VALUES(?,?,'unknown')`).run(scheduleId, '2026-09-07T20:00:00Z'), /CHECK constraint failed/);
assert.throws(() => db.prepare(`INSERT INTO manager_report_schedules(tenant_membership_id,report_key,local_time,catch_up_policy) VALUES(1,'morning_installments','08:00','invalid')`).run(), /CHECK constraint failed/);

// Membership removal cascades schedule and all run history.
db.prepare('DELETE FROM tenant_memberships WHERE id=1').run();
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM manager_report_schedules').get().count), 0);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM scheduled_job_runs').get().count), 0);

db.close();
console.log('Telegram Management Center Stage 6 v351 durable scheduler contract passed');
