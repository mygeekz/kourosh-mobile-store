import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';

const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`child test failed: node ${args.join(' ')}`);
  }
};

// Re-run the runtime/SQLite security contracts that do not require node_modules.
for (const args of [
  ['scripts/test-telegram-management-stage1-sql-v346.mjs'],
  ['scripts/test-telegram-management-stage2-sql-v347.mjs'],
  ['--experimental-strip-types','scripts/test-telegram-management-stage3-permissions-v348.mjs'],
  ['scripts/test-telegram-management-stage4-gateway-v349.mjs'],
  ['--experimental-strip-types','scripts/test-telegram-management-stage5-notifications-v350.mjs'],
  ['--experimental-strip-types','scripts/test-telegram-management-stage6-scheduler-v351.mjs'],
  ['--experimental-strip-types','scripts/test-telegram-management-stage8-security-v353.mjs'],
]) run(args);

const extractStaticSql = (path) => {
  const source = fs.readFileSync(path, 'utf8');
  const out = [];
  for (const match of source.matchAll(/await runAsync\((`[\s\S]*?`|"(?:[^"\\]|\\.)*")/g)) {
    const literal = match[1];
    if (literal.startsWith('`')) {
      const sql = literal.slice(1, -1);
      if (!sql.includes('${')) out.push(sql);
    } else {
      out.push(JSON.parse(literal));
    }
  }
  return out;
};

// Final tenant-isolation / per-manager persistence acceptance contract.
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE);`);
for (const sql of extractStaticSql('server/db/schema/accessControl.schema.ts')) db.exec(sql);
for (const sql of extractStaticSql('server/db/schema/managerNotifications.schema.ts')) db.exec(sql);
for (const sql of extractStaticSql('server/db/schema/managerScheduledReports.schema.ts')) db.exec(sql);

const a = Number(db.prepare('INSERT INTO users(username) VALUES(?)').run('manager_A').lastInsertRowid);
const b = Number(db.prepare('INSERT INTO users(username) VALUES(?)').run('manager_B').lastInsertRowid);
for (const p of ['dashboard.read','sales.read','profits.read','installments.read','notifications.manage']) {
  db.prepare('INSERT INTO access_permissions(permission_key,name) VALUES(?,?)').run(p,p);
}
const roleA = Number(db.prepare("INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES('tenant_A','manager','A',0)").run().lastInsertRowid);
const roleB = Number(db.prepare("INSERT INTO access_roles(tenant_id,role_key,name,is_system) VALUES('tenant_B','manager','B',0)").run().lastInsertRowid);
for (const p of ['dashboard.read','sales.read','profits.read','installments.read','notifications.manage']) db.prepare('INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)').run(roleA,p);
for (const p of ['dashboard.read','sales.read','installments.read','notifications.manage']) db.prepare('INSERT INTO access_role_permissions(role_id,permission_key) VALUES(?,?)').run(roleB,p);
const membershipA = Number(db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id,status) VALUES('tenant_A',?,'active')").run(a).lastInsertRowid);
const membershipB = Number(db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id,status) VALUES('tenant_B',?,'active')").run(b).lastInsertRowid);
db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'manual')").run(membershipA,roleA);
db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'manual')").run(membershipB,roleB);
assert.throws(() => db.prepare("INSERT INTO tenant_membership_roles(membership_id,role_id,grant_source) VALUES(?,?,'system')").run(membershipA,roleB), /ACCESS_ROLE_TENANT_MISMATCH/);

// Different managers keep independent preferences for the same event.
db.prepare("INSERT INTO manager_notification_preferences(tenant_membership_id,notification_key,telegram_enabled,in_app_enabled) VALUES(?,?,?,?)").run(membershipA,'sale.created',1,1);
db.prepare("INSERT INTO manager_notification_preferences(tenant_membership_id,notification_key,telegram_enabled,in_app_enabled) VALUES(?,?,?,?)").run(membershipB,'sale.created',0,1);
assert.equal(Number(db.prepare('SELECT telegram_enabled v FROM manager_notification_preferences WHERE tenant_membership_id=? AND notification_key=?').get(membershipA,'sale.created').v),1);
assert.equal(Number(db.prepare('SELECT telegram_enabled v FROM manager_notification_preferences WHERE tenant_membership_id=? AND notification_key=?').get(membershipB,'sale.created').v),0);

// Same report type may exist independently for A/B; duplicate logical schedule per manager is rejected.
const scheduleA = Number(db.prepare("INSERT INTO manager_report_schedules(tenant_membership_id,report_key,local_time) VALUES(?,'nightly_sales','23:30')").run(membershipA).lastInsertRowid);
const scheduleB = Number(db.prepare("INSERT INTO manager_report_schedules(tenant_membership_id,report_key,local_time) VALUES(?,'nightly_sales','23:30')").run(membershipB).lastInsertRowid);
assert.ok(scheduleA !== scheduleB);
assert.throws(() => db.prepare("INSERT INTO manager_report_schedules(tenant_membership_id,report_key,local_time) VALUES(?,'nightly_sales','23:45')").run(membershipA), /UNIQUE constraint failed/);

// One occurrence = one durable row even after reconnect/reconcile attempts.
db.prepare("INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status) VALUES(?,?,'scheduled')").run(scheduleA,'2026-09-05T20:00:00.000Z');
assert.throws(() => db.prepare("INSERT INTO scheduled_job_runs(schedule_id,scheduled_for,status) VALUES(?,?,'scheduled')").run(scheduleA,'2026-09-05T20:00:00.000Z'), /UNIQUE constraint failed/);

// Revoked/suspended membership is representable and constrained.
db.prepare("UPDATE tenant_memberships SET status='revoked' WHERE id=?").run(membershipB);
assert.equal(db.prepare('SELECT status FROM tenant_memberships WHERE id=?').get(membershipB).status,'revoked');
assert.throws(() => db.prepare("UPDATE tenant_memberships SET status='invalid' WHERE id=?").run(membershipA), /CHECK constraint failed/);

db.close();
console.log('PASS test-telegram-management-stage9-release-v354');
