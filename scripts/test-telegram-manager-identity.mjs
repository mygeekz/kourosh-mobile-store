import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Execute production TS with isolated persistence/transport boundaries. No real
// database is initialized and no Telegram requests are sent.
const require = createRequire(import.meta.url);
const root = process.cwd();
const mocks = new Map();
const cache = new Map();
const key = (name) => path.resolve(root, name);
function load(file) {
  file = key(file);
  if (mocks.has(file)) return mocks.get(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith('.')) return require(name);
    const target = path.resolve(path.dirname(file), name).replace(/\.js$/, '');
    return load(target + '.ts');
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
let staff = [], customers = [], partners = [];
let permissions = ['dashboard.read'];
const telegramId = '930001';
const settings = { telegram_bot_token: '123:test', miniapp_public_access_mode: 'self_hosted', telegram_miniapp_public_url: 'https://example.com/miniapp' };
const rows = async (sql, params) => {
  assert.equal(params[0], telegramId, 'identity queries must use sender ID, not chat ID');
  if (sql.includes('user_telegram_links')) return staff;
  if (sql.includes('FROM customers')) return customers;
  if (sql.includes('FROM partners')) return partners;
  throw new Error(`Unexpected identity query: ${sql}`);
};
const repo = load('server/repositories/miniAppIdentity.repo.ts').createMiniAppIdentityRepository({
  ensureDatabase: async () => {}, readRows: rows,
  resolveUserAccess: async () => ({ permissions }),
});
mocks.set(key('server/repositories/miniAppIdentity.repo.ts'), { miniAppIdentityRepo: repo });
mocks.set(key('server/database.ts'), {
  getAllSettingsAsObject: async () => settings,
  getAsync: async (sql, params) => (await rows(sql, params))[0],
  runAsync: async () => ({ changes: 1 }), allAsync: rows,
});
mocks.set(key('server/utils/telegramOtpHelpers.ts'), { createTelegramOtpHelpers: () => ({}) });
mocks.set(key('server/utils/notificationSchemaHelpers.ts'), { ensureTelegramInboxTable: async () => {} });
mocks.set(key('server/utils/productSalesReportHelpers.ts'), { formatReportMoneyText: String });
mocks.set(key('server/utils/messagingFormatters.ts'), { telegramCard: (...parts) => parts.flat().join('\n') });
mocks.set(key('server/services/telegramIdentitySecurity.service.ts'), {});
const botHelpersKey = key('server/utils/telegramBotHelpers.ts');
mocks.set(botHelpersKey, { ensureTelegramPersistentMenu: async () => {}, telegramLog: () => {}, buildContactKeyboard: () => ({}) });
const sent = [];
const handler = load('server/bootstrap/telegram/telegramUpdateHandlerCore.ts').createTelegramUpdateHandler({
  trySendSmsNow: async () => {}, sendBotMessage: async (...args) => sent.push(args),
});
const ingress = load('server/telegram/telegramUpdateSource.ts').createTelegramUpdateIngress(handler);
const resolve = load('server/services/miniAppIdentity.service.ts').resolveMiniAppIdentity;
async function update(text, callback = false, source = 'fromPolling') {
  sent.length = 0;
  const message = { chat: { id: 990002, type: 'private' }, from: { id: Number(telegramId) }, text };
  await ingress[source](callback ? { callback_query: { data: text, from: message.from, message: { ...message, from: { id: 123 } } } } : { message });
  assert.ok(sent.length, `response for ${text}`);
  return sent.at(-1);
}
const admin = { id: 1, roleName: 'Admin', displayName: 'Admin' };
const partner = { id: 2, displayName: 'Partner', partnerName: 'Partner' };
const customer = { id: 3, fullName: 'Customer', displayName: 'Customer' };
for (const [name, managers, linkedPartners, linkedCustomers, expected] of [
  ['Admin only', [admin], [], [], 'staff'],
  ['Admin + Partner', [admin], [partner], [], 'staff'],
  ['Partner only', [], [partner], [], 'partner'],
  ['Customer only', [], [], [customer], 'customer'],
  ['Customer + Partner', [], [partner], [customer], 'customer'],
  ['Manager + Customer + Partner', [admin], [partner], [customer], 'staff'],
]) {
  staff = managers; partners = linkedPartners; customers = linkedCustomers;
  assert.equal((await resolve(telegramId)).kind, expected);
  for (const source of ['fromPolling', 'fromWebhook']) for (const [text, callback] of [['/start'], ['/help'], ['/menu'], ['/restart'], ['منوی اصلی'], ['راهنمای سریع'], ['MENU_HOME', true], ['UNKNOWN', true]]) {
    const reply = await update(text, callback, source);
    if (expected === 'staff') {
      assert.match(reply[1], /مدیریت فروشگاه/);
      assert.match(JSON.stringify(reply[2]), /v1_s_home/);
    } else if (expected === 'partner') assert.match(reply[1], /همکار/);
    else assert.doesNotMatch(reply[1], /پنل هوشمند همکاران|مدیریت فروشگاه/);
  }
  console.log(`PASS: ${name}`);
}
staff = [admin]; partners = [partner]; customers = [];
permissions = [];
assert.match((await update('/menu'))[1], /همکاران/, 'revoked managerial permissions must be rechecked on the next update');
permissions = ['dashboard.read'];
assert.match((await update('PARTNER_HOME', true))[1], /همکاران/, 'explicit partner menu remains available');
partners = [];
assert.doesNotMatch((await update('PARTNER_HOME', true))[1], /پنل هوشمند همکاران/, 'unlinked partner callback is denied');
staff = []; partners = [partner]; customers = [{ id: 3, fullName: 'Customer', displayName: 'Customer' }];
assert.equal((await resolve(telegramId)).kind, 'customer');
assert.match((await update('/start'))[1], /Customer/);

// Exercise the actual send wrapper for structured failures and thrown errors.
mocks.delete(botHelpersKey);
let failure = { success: false, message: 'Forbidden: bot was blocked', errorCode: '403' };
mocks.set(key('server/telegramService.ts'), {
  setTelegramProxy: () => {}, sendTelegramMessage: async () => {
    if (failure instanceof Error) throw failure;
    return failure;
  },
});
mocks.set(key('server/services/telegramMenuSync.service.ts'), {});
const helpers = load(botHelpersKey);
const errors = [];
const originalError = console.error;
console.error = (...args) => errors.push(args);
try {
  await helpers.sendBotMessage('990002', 'test');
  assert.match(JSON.stringify(errors), /bot was blocked/);
  failure = new Error('request failed for 123:test');
  await helpers.sendBotMessage('990002', 'test');
  assert.doesNotMatch(JSON.stringify(errors), /123:test/);
  staff = [admin, { ...admin, id: 4 }];
  await handler({ message: { chat: { id: 990002, type: 'private' }, from: { id: Number(telegramId) }, text: '/start' } });
  assert.match(JSON.stringify(errors), /command_failed/);
  assert.match(JSON.stringify(errors), /MINIAPP_IDENTITY_AMBIGUOUS/);
} finally { console.error = originalError; }
console.log('PASS: customer priority, partner callback protection, send diagnostics and fail-closed command errors');

// Exercise the actual active Manager builder without importing a live database.
mocks.set(key('server/db/query.ts'), { getAsync: async () => ({ id: 1, firstName: 'Admin', roleName: 'Admin' }) });
mocks.set(key('server/db/domains/accessControl.db.ts'), { resolveUserTenantAuthorization: async () => ({ status: 'active', permissions: ['dashboard.read'] }) });
mocks.set(key('server/services/miniAppManager.service.ts'), { miniAppManagerService: { getDashboard: async () => ({ total: 1, phoneNumber: 'private-fixture' }) } });
mocks.set(key('server/db/domains/managerNotifications.db.ts'), { listManagerInAppNotifications: async () => ({ items: [] }) });
const candidate = await load('server/cloud/snapshots/miniAppSnapshotBuilder.ts').buildManagerMiniAppSnapshotCandidate(1, {
  tenantId: 'tenant_test', installationId: 'inst_abcdefghijklmnopqrstuvwx', telegramUserId: telegramId, snapshotVersion: 1,
});
assert.equal(candidate.subjectKind, 'manager');
assert.equal(candidate.telegramUserId, telegramId);
assert.equal(Date.parse(candidate.authorizationValidUntil) - Date.parse(candidate.generatedAt), 3600000);
assert.deepEqual(candidate.data.permissions, ['dashboard.read']);
assert.equal(candidate.data.dashboard.total, 1);
assert.ok(!JSON.stringify(candidate).includes('private-fixture'));
console.log('PASS: active Manager snapshot generation, identity preservation, one-hour lease and data sanitization');
