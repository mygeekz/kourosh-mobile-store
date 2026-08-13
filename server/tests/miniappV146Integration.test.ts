import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MINI_APP_START_PARAM_MAX_LENGTH,
  miniAppRouteForStartParam,
  parseMiniAppStartParam,
  resolveMiniAppLaunch,
  serializeMiniAppStartParam,
} from "../../miniapp/startParam";
import {
  buildTelegramMiniAppLaunchLink,
  createTelegramMenuButtonEnsurer,
  resolveTelegramMiniAppUrl,
  telegramMenuButtonPayload,
  validateTelegramMiniAppPublicUrl,
} from "../utils/telegramMiniApp";

assert.deepEqual(parseMiniAppStartParam("v1_c_home"), { version: "v1", role: "customer", page: "home" });
assert.equal(miniAppRouteForStartParam("v1_c_inst_123", "customer"), "/installments/123");
assert.equal(miniAppRouteForStartParam("v1_c_inst_123_456", "customer"), "/installments/123?paymentId=456");
assert.equal(miniAppRouteForStartParam("v1_c_inv_order_7", "customer"), "/invoices/order-7");
assert.equal(miniAppRouteForStartParam("v1_c_inv_legacy_8", "customer"), "/invoices/legacy-8");
assert.equal(miniAppRouteForStartParam("v1_p_phones", "partner"), "/phones");
assert.equal(miniAppRouteForStartParam("v1_p_phones", "customer"), "/");
assert.equal(miniAppRouteForStartParam("v1_c_inst_123", "partner"), "/");
assert.equal(resolveMiniAppLaunch("v1_p_ledger", "customer").startParam, null);

for (const invalid of [
  "v2_c_home",
  "v1_c_unknown",
  "v1_c_inst_0",
  "v1_c_inst_-1",
  "v1_c_inst_9007199254740992",
  "v1_c_inv_other_1",
  "v1 c home",
  "v1_c_home?x=1",
  "x".repeat(MINI_APP_START_PARAM_MAX_LENGTH + 1),
]) assert.equal(parseMiniAppStartParam(invalid), null, `must reject ${invalid}`);

assert.equal(
  serializeMiniAppStartParam({ version: "v1", role: "customer", page: "installment", saleId: 12, paymentId: 90 }),
  "v1_c_inst_12_90",
);

const configured = {
  telegram_public_access_mode: "self_hosted",
  telegram_miniapp_public_url: "https://panel.example.com/miniapp.html",
  public_app_base_url: "https://fallback.example.com/app",
  telegram_bot_username: "KouroshStoreBot",
};
assert.equal(resolveTelegramMiniAppUrl(configured), "https://panel.example.com/miniapp.html");
assert.equal(resolveTelegramMiniAppUrl({ public_app_base_url: "https://example.com/base?x=1" }), null);
assert.equal(resolveTelegramMiniAppUrl({ app_base_url: "https://example.com/app", local_base_url: "https://kourosh.home.arpa:5173/#/" }), null);
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: "disabled", telegram_miniapp_public_url: "https://panel.example.com/miniapp.html" }), null);
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: "cloud_managed", kourosh_cloud_provisioned: "0", kourosh_cloud_assigned_public_url: "https://cloud.example.com/miniapp.html" }), null);
assert.equal(validateTelegramMiniAppPublicUrl("https://user:pass@example.com/miniapp.html"), null);
assert.equal(validateTelegramMiniAppPublicUrl("https://example.com/miniapp.html#inject"), null);
assert.equal(validateTelegramMiniAppPublicUrl("http://example.com/miniapp.html"), null);
for (const host of ["localhost", "127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.5", "app.local"]) {
  assert.equal(validateTelegramMiniAppPublicUrl(`https://${host}/miniapp.html`, "production"), null);
}
assert.equal(validateTelegramMiniAppPublicUrl("https://localhost/miniapp.html", "test"), "https://localhost/miniapp.html");
assert.equal(telegramMenuButtonPayload(configured).mode, "web_app");
assert.equal(telegramMenuButtonPayload({}).mode, "default");
assert.equal(telegramMenuButtonPayload({ telegram_miniapp_public_url: "javascript:alert(1)" }).mode, "default");
assert.equal(buildTelegramMiniAppLaunchLink(configured, "v1_c_account"), "https://t.me/KouroshStoreBot?startapp=v1_c_account");
assert.equal(buildTelegramMiniAppLaunchLink({ ...configured, telegram_bot_username: "bad!" }, "v1_c_account"), null);
assert.equal(buildTelegramMiniAppLaunchLink(configured, "v1_c_unknown"), null);

const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
const ensurer = createTelegramMenuButtonEnsurer(async (_token, method, payload) => {
  calls.push({ method, payload });
  return { success: true };
});
await ensurer.ensure("123:token", configured);
await ensurer.ensure("123:token", configured);
assert.equal(calls.length, 1, "idempotent ensure must skip an unchanged successful menu");
assert.equal((calls[0].payload.menu_button as any).type, "web_app");
await ensurer.ensure("123:token", {});
assert.equal((calls[1].payload.menu_button as any).type, "default");

const authSource = fs.readFileSync(path.join(process.cwd(), "miniapp", "auth", "MiniAppAuthContext.tsx"), "utf8");
assert.doesNotMatch(authSource, /getStoredMiniAppToken|fetchMiniAppIdentity/);
assert.match(authSource, /authenticateMiniApp\(webApp\.initData\)/);
const routeSource = fs.readFileSync(path.join(process.cwd(), "server", "routes", "miniapp.routes.ts"), "utf8");
assert.match(routeSource, /resolveMiniAppLaunch\(validated\.startParam, identity\.kind\)/);
const helperSource = fs.readFileSync(path.join(process.cwd(), "server", "utils", "telegramBotHelpers.ts"), "utf8");
assert.doesNotMatch(helperSource, /setTelegramDefaultMenuButton\(botToken\)/);
assert.match(helperSource, /ensureTelegramMenuButton\(botToken, settings\)/);
const handlerSource = fs.readFileSync(path.join(process.cwd(), "server", "bootstrap", "telegram", "telegramUpdateHandlerCore.ts"), "utf8");
for (const callback of ["MENU_BALANCE", "MENU_INSTALLMENTS", "MENU_INVOICES", "MENU_REPAIRS", "MENU_NOTIFS", "PARTNER_LEDGER", "PARTNER_PHONES"]) {
  assert.match(handlerSource, new RegExp(callback));
}
const paginationSource = fs.readFileSync(path.join(process.cwd(), "miniapp", "hooks", "useMiniAppPagination.ts"), "utf8");
assert.match(paginationSource, /lastPage\.page \+ 1/);
assert.match(paginationSource, /seen\.has\(key\)/);

console.log("Mini App v146 startapp, URL, menu idempotence, session launch, Bot regression, and pagination checks passed.");
