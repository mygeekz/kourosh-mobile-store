import assert from "node:assert/strict";
import { buildTelegramMiniAppLaunchButton, buildTelegramMiniAppWebAppUrl } from "../server/utils/telegramMiniApp.ts";
import { resolveMiniAppLaunch } from "../miniapp/startParam.ts";

const settings = {
  miniapp_public_access_mode: "external_tunnel",
  telegram_miniapp_public_url: "https://fresh-host.trycloudflare.com/miniapp.html",
  telegram_bot_username: "KouroshStoreBot",
};
const startParam = "v1_p_ledger";
const expectedUrl = "https://fresh-host.trycloudflare.com/miniapp.html?kourosh_start=v1_p_ledger";
assert.equal(buildTelegramMiniAppWebAppUrl(settings, startParam), expectedUrl);
assert.deepEqual(buildTelegramMiniAppLaunchButton(settings, startParam), {
  text: "باز کردن در پنل کوروش",
  web_app: { url: expectedUrl },
});
assert.equal(buildTelegramMiniAppWebAppUrl({ ...settings, telegram_miniapp_public_url: "https://new-host.trycloudflare.com/miniapp.html" }, startParam), "https://new-host.trycloudflare.com/miniapp.html?kourosh_start=v1_p_ledger");
assert.equal(resolveMiniAppLaunch(startParam, "partner").route, "/ledger");
assert.equal(resolveMiniAppLaunch(startParam, "customer").route, "/", "Role mismatch must not grant cross-role navigation");
console.log(JSON.stringify({ status: "PASS", expectedUrl, roleMismatchRoute: resolveMiniAppLaunch(startParam, "customer").route }, null, 2));
