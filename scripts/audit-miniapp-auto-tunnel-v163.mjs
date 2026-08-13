import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const syncService = read("server/services/miniAppPublicUrlSync.service.ts");
const menuService = read("server/services/telegramMenuSync.service.ts");
const telegramMiniApp = read("server/utils/telegramMiniApp.ts");
const authContext = read("miniapp/auth/MiniAppAuthContext.tsx");
const syncRoutes = read("server/routes/miniAppPublicSync.routes.ts");
const routeRegistry = read("server/routes/authRouteRegistry.ts");
const settingsRoutes = read("server/routes/settings.routes.ts");
const tunnel = read("scripts/windows-miniapp-tunnel-launcher.mjs");
const panel = read("pages/settings/SettingsTelegramPanel.tsx");
const partner = read("server/services/miniAppPartner.service.ts");

assert.match(syncRoutes, /req\.socket\.remoteAddress/, "Runtime handoff must be loopback-gated using the actual socket peer");
assert.match(syncRoutes, /LOCAL_RUNTIME_LOOPBACK_REQUIRED/, "Non-loopback runtime handoff must fail closed");
assert.match(routeRegistry, /registerMiniAppPublicSyncRoutes\(app\)/, "Loopback sync route must be registered before dashboard auth gate");
assert.match(syncService, /updateMultipleSettings/, "Automatic URL sync must use the existing transactional Settings repository, not raw SQLite");
assert.doesNotMatch(syncService, /trycloudflare\.com/i, "Backend sync logic must remain provider-independent");
assert.match(syncService, /currentMode === "self_hosted" \|\| currentMode === "relay"/, "Self-hosted and Relay configurations must be protected from automatic temporary-tunnel overwrite");
assert.match(syncService, /writeRuntimeConfig\(saved\)/, "Settings sync must regenerate Gateway runtime config");
assert.match(syncService, /expectedHost !== hostname/, "Gateway expectedPublicHost must match the new public hostname before READY");
assert.match(syncService, /healthBackoffMs = \[0, 1_000, 2_000, 3_000, 5_000\]/, "Public health check must use bounded propagation retries");
assert.match(syncService, /contentType\.includes\("text\/html"\)/, "Public health check must verify Mini App HTML content type");
assert.match(menuService, /transportMode === "disabled"/, "Disabled Telegram transport must result in pending state without an API call");
const disabledIndex = menuService.indexOf('transportMode === "disabled"');
const apiCallIndex = menuService.indexOf('deps.callApi');
assert.ok(disabledIndex >= 0 && apiCallIndex > disabledIndex, "No hidden Direct Telegram call is allowed before disabled-mode guard");
assert.match(menuService, /setChatMenuButton/, "Menu sync must be a Telegram capability using setChatMenuButton");
assert.match(menuService, /getChatMenuButton/, "Menu sync must read back Telegram state before reporting synchronized");
assert.match(telegramMiniApp, /buildTelegramMiniAppWebAppUrl/, "Rotating tunnel launch buttons must use the current canonical Mini App URL");
assert.match(telegramMiniApp, /return webAppUrl \? \{ text, web_app: \{ url: webAppUrl \} \} : null;/, "Bot-generated Mini App buttons must use direct web_app URLs, not BotFather Main Mini App links");
assert.match(authContext, /kourosh_start/, "Direct web_app launch hint must be consumed after Telegram authentication");
assert.match(authContext, /resolveMiniAppLaunch\(directLaunchHint, auth\.identity\.kind\)/, "Direct launch hints must remain role-compatible and navigation-only");
assert.match(menuService, /configureTransport\(settings\)/, "Menu sync must use the configured explicit Telegram transport");
assert.match(tunnel, /syncValidatedPublicUrlWithKourosh/, "Tunnel provider must hand validated URLs to Kourosh sync rather than requiring manual Settings paste");
assert.doesNotMatch(tunnel, /\[ACTION\] Paste this URL/, "Manual URL paste must no longer be the normal workflow");
assert.match(tunnel, /waitForKouroshTunnelSyncPreflight/, "Tunnel helper must reconcile with Local Backend before starting provider work");
assert.match(settingsRoutes, /miniapp-public-sync\/status/, "Admin Settings must expose runtime/derived public sync status");
assert.match(panel, /Telegram Menu:/, "Settings UI must show Telegram Menu sync status without exposing internals");
assert.match(panel, /Mini App عمومی:/, "Settings UI must show simple public Mini App status");
assert.match(partner, /signedBalance > 0[\s\S]{0,180}code: "creditor"/, "Positive Partner balance semantic correction must remain intact");
assert.doesNotMatch(syncService + menuService + syncRoutes, /telegram_bot_token[^\n]*console|console[^\n]*telegram_bot_token/i, "New sync code must not log Bot Token");

console.log(JSON.stringify({
  status: "PASS",
  providerIndependentBackend: true,
  loopbackOnlyHandoff: true,
  selfHostedRelayProtected: true,
  disabledTelegramNoHiddenCall: true,
  partnerSemanticsPreserved: true,
}, null, 2));
