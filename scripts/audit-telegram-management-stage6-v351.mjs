import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 351, `KOUROSH_SOURCE_VERSION must be v351 or successor; found ${version}`);

const schema = read('server/db/schema/managerScheduledReports.schema.ts');
assert.match(schema, /CREATE TABLE IF NOT EXISTS manager_report_schedules/);
assert.match(schema, /report_key TEXT NOT NULL CHECK\(report_key IN \('nightly_sales','morning_installments'\)\)/);
assert.match(schema, /catch_up_policy TEXT NOT NULL DEFAULT 'catch_up'/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS scheduled_job_runs/);
for (const status of ['scheduled','running','completed','failed','skipped']) assert.ok(schema.includes(`'${status}'`), `scheduled job status missing: ${status}`);
assert.match(schema, /UNIQUE\(schedule_id, scheduled_for\)/);
assert.match(schema, /retry_count INTEGER NOT NULL DEFAULT 0/);
assert.match(schema, /delivery_status TEXT NOT NULL DEFAULT 'pending'/);
assert.match(schema, /next_retry_at TEXT/);
assert.match(schema, /FOREIGN KEY \(schedule_id\) REFERENCES manager_report_schedules\(id\) ON DELETE CASCADE/);

const schemaIndex = read('server/db/schema/index.ts');
const initRuntime = read('server/db/core/initRuntime.ts');
assert.match(schemaIndex, /createManagerScheduledReportsSchema/);
assert.match(initRuntime, /await createManagerScheduledReportsSchema\(\)/);

const catalog = read('server/notifications/managerNotificationCatalog.ts');
assert.ok(catalog.includes('report.sales.nightly'));
assert.ok(catalog.includes('report.installments.morning'));
assert.match(catalog, /MANAGER_REPORT_NIGHTLY_SALES/);
assert.match(catalog, /MANAGER_REPORT_MORNING_INSTALLMENTS/);

const engine = read('server/services/managerNotificationEngine.service.ts');
assert.match(engine, /const publishTargeted = async/);
assert.match(engine, /item\.userId === Number\(input\.userId\)/);
assert.match(engine, /input\.channels\.inApp/);
assert.match(engine, /input\.channels\.telegram/);
assert.match(engine, /publish, publishTargeted/);

const service = read('server/services/managerScheduledReports.service.ts');
assert.match(service, /nightly_sales:[\s\S]*localTime: "23:30"/);
assert.match(service, /morning_installments:[\s\S]*localTime: "08:00"/);
assert.match(service, /maxAgeMinutes: 720/);
assert.match(service, /maxAgeMinutes: 360/);
assert.match(service, /catchUpPolicy === "skip_if_old" \? schedule\.graceMinutes : schedule\.maxAgeMinutes/);
assert.match(service, /INSERT OR IGNORE INTO scheduled_job_runs/);
assert.match(service, /status='running'/);
assert.match(service, /status='failed'/);
assert.match(service, /retry_count<3/);
assert.match(service, /next_retry_at/);
assert.match(service, /MANAGER_REPORT_PERMISSION_REVOKED/);
assert.match(service, /profits\.read/);
assert.match(service, /listUnpaidInstallments\(\)/);
assert.match(service, /windows: \[0, 3, 7\]/);
assert.match(service, /setInterval\(\(\) => \{ void tick\(\); \}, 60_000\)/);

const reportRoutes = read('server/routes/reportAutomation.routes.ts');
assert.match(reportRoutes, /startManagerScheduledReportScheduler/);
assert.match(reportRoutes, /publishManagerScheduledReport/);
assert.match(reportRoutes, /requireManagementPermission\("notifications\.manage"\)/);
assert.match(reportRoutes, /\/api\/reports\/managers\/:userId\/schedules/);
assert.match(reportRoutes, /\/api\/reports\/managers\/:userId\/runs/);
// Legacy scheduler remains present for backward compatibility.
assert.match(reportRoutes, /CREATE TABLE IF NOT EXISTS report_schedules/);
assert.match(reportRoutes, /cron\.schedule/);

const bridge = read('server/bootstrap/coreMessagingBridge.ts');
const composition = read('server/bootstrap/appComposition.ts');
const messaging = read('server/bootstrap/messagingRuntime.ts');
assert.match(bridge, /publishManagerScheduledReport/);
assert.match(composition, /publishManagerScheduledReport/);
assert.match(messaging, /publishManagerScheduledReport: managerNotificationEngine\.publishTargeted/);

const stage5Audit = read('scripts/audit-telegram-management-stage5-v350.mjs');
assert.ok(!stage5Audit.includes('return null/);'), 'Stage 5 audit must allow explicit Stage 6 scheduled report mappings');

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.scripts?.['audit:telegram-management-stage6-v351'], 'node scripts/audit-telegram-management-stage6-v351.mjs');
assert.equal(pkg.scripts?.['test:telegram-management-stage6-scheduler-v351'], 'node --experimental-strip-types scripts/test-telegram-management-stage6-scheduler-v351.mjs');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:telegram-management-stage6-v351/);
assert.match(String(pkg.scripts?.['audit:release'] || ''), /test:telegram-management-stage6-scheduler-v351/);

console.log('Telegram Management Center Stage 6 v351 source audit passed');
