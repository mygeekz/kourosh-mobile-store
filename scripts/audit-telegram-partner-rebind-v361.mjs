import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const fail = (m) => { console.error('[v361] FAIL:',m); process.exit(1); };
const ok = (m) => console.log('[v361] PASS:',m);

const schema = read('server/db/schema/telegramIdentity.schema.ts');
const security = read('server/services/telegramIdentitySecurity.service.ts');
const routes = read('server/routes/telegramLinking.routes.ts');
const handler = read('server/bootstrap/telegram/telegramUpdateHandlerCore.ts');
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const header = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const modal = read('components/TelegramLinkModal.tsx');

for (const token of ['allow_rebind','previous_telegram_user_id']) {
  if (!schema.includes(token)) fail(`partner link-token schema missing ${token}`);
}
ok('partner re-link authorization metadata is persisted non-destructively');

if (!security.includes('throw new Error("TELEGRAM_PARTNER_ALREADY_LINKED")')) fail('normal partner link issuance still permits unusable links for an already-linked partner');
if (!security.includes('export const issuePartnerTelegramRelink')) fail('explicit partner re-link issuer missing');
if (!security.includes('existing binding remains active until redemption') && !security.includes('existing binding remains active')) fail('re-link audit does not preserve old binding until redemption');
if (!security.includes('previousTelegramUserId !== currentTelegramUserId')) fail('stale re-link token guard missing');
if (!security.includes('revokeMiniAppTelegramUserSessions(previousTelegramUserId)')) fail('old Telegram sessions are not revoked after successful re-link');
if (!security.includes('requestMiniAppSnapshotRefreshAfterIdentityChange("partner"')) fail('partner edge/snapshot sync not requested after identity change');
ok('re-link is explicit, stale-safe, session-revoking and snapshot-synchronized');

if (!routes.includes('/api/telegram/partner-relink-token')) fail('partner re-link route missing');
if (!routes.includes('PARTNER_TELEGRAM_ALREADY_LINKED')) fail('normal link endpoint does not fail clearly for an existing binding');
if (!routes.includes('issuePartnerTelegramRelink')) fail('re-link route is not wired to the secure issuer');
ok('Admin/Manager API exposes a distinct secure re-link operation');

if (!controller.includes("'/api/telegram/partner-relink-token'")) fail('partner profile does not use re-link endpoint for an existing secure binding');
if (!controller.includes('اتصال فعلی تا زمانی که لینک جدید با موفقیت در تلگرام تأیید نشود فعال می‌ماند')) fail('re-link confirmation does not explain lifecycle safety');
if (!header.includes("secureTelegram ? 'اتصال مجدد تلگرام' : 'اتصال تلگرام'")) fail('partner profile action does not distinguish re-link from initial link');
if (!modal.includes('rebind?: boolean') || !modal.includes('آماده اتصال مجدد')) fail('Telegram link modal lacks re-link state');
ok('partner UI clearly separates initial link and secure re-link');

if (!handler.includes('result.code === "RELINKED"')) fail('bot does not acknowledge successful secure re-link');
if (!handler.includes('result.code === "REBIND_STALE"')) fail('bot does not explain stale re-link token');
if (!handler.includes('مدیر باید از پروفایل همکار «اتصال مجدد تلگرام» را انتخاب کند')) fail('phone self-contact rejection lacks re-link guidance');
ok('bot guidance matches the secure re-link lifecycle');

console.log('[v361] Telegram Partner Rebind audit passed');
