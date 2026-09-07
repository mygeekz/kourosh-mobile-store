import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 347, `KOUROSH_SOURCE_VERSION must be v347 or successor; found ${version}`);

const routes = read('server/routes/telegramLinking.routes.ts');
for (const endpoint of [
  '/api/telegram/managers',
  '/api/telegram/managers/:userId',
  '/api/telegram/managers/:userId/link-token',
  '/api/telegram/managers/:userId/relink-token',
  '/api/telegram/managers/:userId/link',
  '/api/telegram/managers/:userId/test-message',
]) assert.match(routes, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(routes, /requireManagementPermission\("managers\.manage"\)/);
assert.match(routes, /issueStaffTelegramLink\(userId, req\.user!\)/);
assert.match(routes, /revoke(?:Manager|Staff)TelegramBinding\(userId, req\.user!\)/);
assert.match(routes, /sendStaffTelegramTestMessage\(userId, req\.user!\)/);
assert.match(routes, /\?start=staff_\$\{created\.token\}/);

const service = read('server/services/telegramIdentitySecurity.service.ts');
assert.match(service, /export const listTelegramManagers/);
assert.match(service, /export const revokeStaffTelegramBinding/);
assert.match(service, /export const sendStaffTelegramTestMessage/);
assert.match(service, /user_telegram_links/);
assert.match(service, /resolveUserTenantAuthorization/);
assert.match(service, /hasAnyManagementPermission/);
assert.match(service, /TELEGRAM_STAFF_LINK_ISSUED/);
assert.match(service, /TELEGRAM_STAFF_LINK_REVOKED/);
assert.match(service, /TELEGRAM_STAFF_TEST_MESSAGE_SENT/);
assert.match(service, /TELEGRAM_STAFF_TEST_MESSAGE_FAILED/);
assert.match(service, /sendTelegramMessage\(botToken, String\(user\.chat_id\)/);
assert.doesNotMatch(service, /telegram_username\s*=|username\s*=\s*telegram/i);

const schema = read('server/db/schema/telegramIdentity.schema.ts');
assert.match(schema, /CREATE TABLE IF NOT EXISTS user_telegram_links/);
assert.doesNotMatch(schema, /CREATE TABLE IF NOT EXISTS (?:telegram_managers|manager_telegram|telegram_manager)/i);

const usersRoute = read('server/routes/users.routes.ts');
assert.match(usersRoute, /resolveUserTenantAuthorization\(userId\)/);
assert.match(usersRoute, /hasAnyManagementPermission\(authorization\?\.permissions \|\| \[\]\)/);
assert.match(usersRoute, /if \(!stillHasManagementAccess\) await unlinkStaffTelegram/);

const policy = read('server/security/telegramIdentityWritePolicy.ts');
assert.match(policy, /telegramIdentitySecurity\.revokeStaffTelegramBinding/);
assert.match(policy, /telegramIdentitySecurity\.revokeManagerTelegramBinding|central lifecycle unlink compatibility path/);
assert.match(policy, /active tenant management permission/);

const ui = read('pages/settings/SettingsTelegramManagersPanel.tsx');
assert.match(ui, /data-ui-telegram-managers="v347"/);
assert.match(ui, /Telegram Management Center/);
assert.match(ui, /\/api\/telegram\/managers/);
assert.match(ui, /پیام تست/);
assert.match(ui, /اتصال مجدد/);
assert.match(ui, /لغو اتصال/);
assert.match(ui, /QRCodeCanvas/);
assert.match(ui, /managers\.manage/);
assert.doesNotMatch(ui, /import\s+['"].*\.css['"]/);

const usersPanel = read('pages/settings/SettingsUsersPanel.tsx');
assert.match(usersPanel, /SettingsTelegramManagersPanel/);

const edgeSchema = read('deployment/cloudflare-pages/schema/0001_edge_snapshot.sql');
assert.doesNotMatch(edgeSchema, /manager_permissions|manager_ledger|manager_profit|telegram_managers/i);

const pkg = JSON.parse(read('package.json'));
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:telegram-management-stage2-v347/);
assert.equal(pkg.scripts?.['audit:telegram-management-stage2-v347'], 'node scripts/audit-telegram-management-stage2-v347.mjs');
assert.equal(pkg.scripts?.['test:telegram-management-stage2-sql-v347'], 'node scripts/test-telegram-management-stage2-sql-v347.mjs');

console.log('Telegram Management Center Stage 2 v347 source audit passed');
