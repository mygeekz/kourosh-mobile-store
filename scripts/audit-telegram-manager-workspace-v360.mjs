import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const fail = (m) => { console.error('[v360] FAIL:',m); process.exit(1); };
const ok = (m) => console.log('[v360] PASS:',m);

const session = read('server/miniapp/miniAppSession.ts');
const security = read('server/services/telegramIdentitySecurity.service.ts');
const resolver = read('server/miniapp/miniAppIdentityResolver.ts');
const home = read('miniapp/pages/ManagerHome.tsx');
const shell = read('miniapp/components/MiniAppShell.tsx');

if (!session.includes('revokeTelegramUser(telegramUserId: string): number')) fail('session store lacks telegram-user revocation contract');
if (!session.includes('export const revokeMiniAppTelegramUserSessions')) fail('telegram-user session revoker not exported');
ok('all MiniApp sessions for the same Telegram identity can be revoked');

if (!security.includes('revokeMiniAppTelegramUserSessions(telegramUserId)')) fail('manager binding does not revoke stale personal sessions');
if (!security.includes('requestMiniAppManagerAssociationRefresh(Number(row.user_id), telegramUserId)')) fail('manager binding does not trigger targeted edge/snapshot reconciliation');
if (!security.includes('managerAssociationRefreshRequested: true')) fail('manager binding audit metadata missing sync evidence');
ok('manager binding invalidates stale workspaces and requests targeted immediate edge reconciliation');

const managerPush = resolver.indexOf('if (manager) workspaces.push(manager);');
const customerPush = resolver.indexOf('if (customers[0]) workspaces.push(customerWorkspace(customers[0]));');
const partnerPush = resolver.indexOf('if (partners[0]) workspaces.push(partnerWorkspace(partners[0]));');
if (!(managerPush >= 0 && customerPush > managerPush && partnerPush > customerPush)) fail('manager is not the deterministic default workspace');
if (!resolver.includes('const manager = staff[0] ? managerWorkspace(staff[0]) : null;')) fail('manager still must resolve from explicit staff binding');
ok('manager remains explicit and wins default workspace without inferring from partner/customer');

for (const text of ['فضای کاری مدیریت','مشتریان','همکاران','مانده، خریدها، اقساط و دفتر حساب','مانده، تأمین، تسویه و دفتر حساب']) {
  if (!home.includes(text)) fail(`manager home missing: ${text}`);
}
if (!home.includes('/directory?type=customer') || !home.includes('/directory?type=partner')) fail('separate manager customer/partner routes missing');
ok('manager home exposes separate customer and partner accounting entry points');

if (!shell.includes('مدیریت فروشگاه') || !shell.includes('حساب همکار من') || !shell.includes('حساب مشتری من')) fail('workspace switcher labels missing');
ok('multi-role workspace switcher remains available');

console.log('[v360] telegram manager workspace audit passed');
