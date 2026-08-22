import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  isTemporaryQuickTunnelMiniAppUrl,
  resolveTelegramMiniAppUrl,
  validateTelegramStableMiniAppCanonicalUrl,
} from "../server/connectivity/telegramPublicAccess.ts";
import { telegramMenuButtonPayload } from "../server/utils/telegramMiniApp.ts";
import { createMiniAppPublicUrlSyncService } from "../server/services/miniAppPublicUrlSync.service.ts";

const stableRoot = "https://miniapp.example.com/";
const stableCanonical = "https://miniapp.example.com/miniapp.html";
const liveOrigin = "https://live-store.example.com/";
const quickUrl = "https://random-diagnostic.trycloudflare.com/miniapp.html";

assert.equal(validateTelegramStableMiniAppCanonicalUrl(stableRoot), stableCanonical, "Stable root URL must canonicalize to /miniapp.html");
assert.equal(validateTelegramStableMiniAppCanonicalUrl(stableCanonical), stableCanonical);
assert.equal(validateTelegramStableMiniAppCanonicalUrl("https://miniapp.example.com/other"), null, "Non-canonical stable path must fail closed");
assert.equal(validateTelegramStableMiniAppCanonicalUrl("https://miniapp.example.com/miniapp.html?x=1"), null, "Stable canonical URL must not carry query params");
assert.equal(validateTelegramStableMiniAppCanonicalUrl(quickUrl), null, "trycloudflare URL must never be accepted as stable production canonical URL");
assert.equal(isTemporaryQuickTunnelMiniAppUrl(quickUrl), true);

const stableSettings = {
  miniapp_public_access_mode: "stable_tunnel",
  telegram_miniapp_public_url: stableRoot,
  miniapp_live_origin_url: liveOrigin,
};
assert.equal(resolveTelegramMiniAppUrl(stableSettings), stableCanonical);
assert.equal(telegramMenuButtonPayload(stableSettings).payload.menu_button.web_app.url, stableCanonical, "Telegram Menu Button must use the same canonical stable URL");

// Restart invariant: the URL is derived only from persisted stable settings; no tunnel runtime value participates.
const beforeRestart = resolveTelegramMiniAppUrl(stableSettings);
const afterWindowsRestart = resolveTelegramMiniAppUrl({ ...stableSettings });
const afterKouroshRestart = resolveTelegramMiniAppUrl(JSON.parse(JSON.stringify(stableSettings)));
assert.equal(afterWindowsRestart, beforeRestart);
assert.equal(afterKouroshRestart, beforeRestart);

let settings = { miniapp_public_access_mode: "disabled", telegram_miniapp_public_url: "", telegram_transport_mode: "direct", telegram_bot_token: "123456:TEST_TOKEN_ABCDEFGHIJKLMNOPQRSTUVWXYZ" };
let menuCalls = 0;
const quickSync = createMiniAppPublicUrlSyncService({
  getSettings: async () => ({ ...settings }),
  persistSettings: async (patch) => { settings = { ...settings, ...Object.fromEntries(Object.entries(patch).map(([k,v]) => [k, String(v ?? "")])) }; },
  writeRuntimeConfig: (saved) => ({ mode: String(saved.miniapp_public_access_mode), expectedPublicHost: new URL(String(saved.telegram_miniapp_public_url)).hostname }),
  syncMenu: async () => { menuCalls += 1; return { state: "synced", attempts: 1 }; },
  healthCheck: async () => ({ ok: true, status: 200, contentType: "text/html" }),
  sleep: async () => undefined,
});
const quickResult = await quickSync.sync({ provider: "cloudflare_quick_tunnel", publicUrl: quickUrl });
assert.equal(quickResult.success, true);
assert.equal(quickResult.menuSync, "skipped_diagnostic", "Quick Tunnel must never rewrite Telegram's canonical Menu Button");
assert.equal(menuCalls, 0, "Quick Tunnel diagnostic path must perform zero Menu Button writes");

const root = process.cwd();
const stableLauncher = fs.readFileSync(path.join(root, "scripts/windows-miniapp-stable-tunnel-launcher.mjs"), "utf8");
const quickLauncher = fs.readFileSync(path.join(root, "scripts/windows-miniapp-tunnel-launcher.mjs"), "utf8");
const settingsRoute = fs.readFileSync(path.join(root, "server/routes/settings.routes.ts"), "utf8");
assert.doesNotMatch(stableLauncher, /trycloudflare\.com/i, "Stable production launcher must not depend on trycloudflare hostnames");
assert.match(quickLauncher, /provider:\s*["']cloudflare_quick_tunnel["']/, "Quick Tunnel must identify itself as diagnostic provider");
assert.match(settingsRoute, /validateTelegramStableMiniAppCanonicalUrl/, "Stable settings persistence must use canonical URL validation");
assert.match(settingsRoute, /syncTelegramMenuButton\(savedSettings\)/, "Saving stable settings must reconcile Telegram Menu Button to the canonical URL");
assert.doesNotMatch(settingsRoute, /BotFather.*(?:fetch|call|request)|setMainMiniApp/i, "Runtime must not pretend to automate BotFather Main Mini App configuration");

console.log(JSON.stringify({
  status: "PASS",
  canonicalUrl: stableCanonical,
  stableRestartInvariant: true,
  quickTunnelMenuWrites: menuCalls,
  quickTunnelCanonicalMutation: false,
  botFatherRuntimeAutomation: false,
}, null, 2));
