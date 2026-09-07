import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const has = (text, pattern, message) => assert(pattern.test(text), message);

const dialog = read('pages/settings/SettingsManagerNotificationMatrixDialog.tsx');
const managers = read('pages/settings/SettingsTelegramManagersPanel.tsx');
const notificationsRoute = read('server/routes/managerNotifications.routes.ts');
const reportRoutes = read('server/routes/reportAutomation.routes.ts');
const reportService = read('server/services/managerScheduledReports.service.ts');
const version = read('KOUROSH_SOURCE_VERSION').trim();

const versionNumber = Number(version.replace(/^v/, ''));
assert(Number.isInteger(versionNumber) && versionNumber >= 352, `expected v352 or successor, got ${version}`);
has(managers, /SettingsManagerNotificationMatrixDialog/, 'manager panel must mount notification matrix dialog');
has(managers, />اعلان‌ها<\/Button>/, 'manager row must expose notification action');
has(dialog, /data-ui-manager-notification-matrix="v352"/, 'matrix release marker missing');
has(dialog, /api\/notifications\/managers\/\$\{manager\.userId\}\/preferences/, 'event preference API missing');
has(dialog, /api\/reports\/managers\/\$\{manager\.userId\}\/schedules/, 'scheduled report API missing');
has(dialog, /api\/reports\/managers\/\$\{manager\.userId\}\/runs\?limit=8/, 'scheduled run history missing');
has(dialog, /filter\(\(item\) => !item\.key\.startsWith\('report\.'\)\)/, 'report preferences must not compete with schedule channel settings');
has(dialog, /manager\.permissions\.includes\(item\.requiredPermission\)/, 'event controls must be permission aware');
has(dialog, /profits\.read/, 'profit content must respect profits.read');
has(dialog, /includeAverage/, 'nightly average content control missing');
has(dialog, /includeOverdue/, 'morning overdue content control missing');
has(dialog, /\[0, 3, 7\]/, 'installment window content controls missing');
has(dialog, /catchUpPolicy/, 'catch-up policy control missing');
has(dialog, /maxAgeMinutes/, 'catch-up max age control missing');
has(dialog, /graceMinutes/, 'schedule grace control missing');
has(dialog, /ToggleSwitch/, 'design-system toggle must be reused');
has(dialog, /CheckboxField/, 'design-system checkbox must be reused');
has(dialog, /SelectField/, 'design-system select must be reused');
has(dialog, /TextField/, 'design-system text field must be reused');
has(dialog, /Telegram Binding فعال ندارد/, 'unlinked Telegram warning missing');
has(dialog, /آخرین اجراهای گزارش/, 'durable run history UI missing');
has(dialog, /ذخیره تنظیمات/, 'save action missing');

has(notificationsRoute, /requireManagementPermission\("notifications\.manage"\)/, 'notification preference routes must require notifications.manage');
has(reportRoutes, /const managerReport(?:Schedule|Permission)Guard = requireManagementPermission\("notifications\.manage"\)/, 'report schedule routes must require notifications.manage');
has(reportService, /Preserve it instead of silently restoring all windows/, 'explicit empty installment windows preservation missing');
has(reportService, /windows \}/, 'normalized report config must preserve explicit windows');

const customStyleCandidates = [
  'styles/system/telegram-management-stage7.css',
  'styles/telegram-management-stage7.css',
  'pages/settings/SettingsManagerNotificationMatrixDialog.css',
];
for (const file of customStyleCandidates) {
  assert(!fs.existsSync(path.join(root, file)), `Stage 7 must not add custom CSS: ${file}`);
}

console.log('PASS: Telegram Management Stage 7 notification matrix UI audit (v352)');
