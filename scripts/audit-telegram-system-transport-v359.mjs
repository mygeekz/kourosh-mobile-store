import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const transportTypes = read("server/telegram/TelegramTransport.ts");
assert.match(transportTypes, /TelegramTransportMode = "disabled" \| "direct" \| "system" \| "proxy" \| "relay"/);
assert.match(transportTypes, /raw === "system"/);

const runtime = read("server/telegram/telegramTransportRuntime.ts");
assert.match(runtime, /systemTelegramTransport/);
assert.match(runtime, /mode === "system"/);
assert.match(runtime, /resetSystemTelegramTransportDiscovery/);

const systemTransport = read("server/telegram/SystemTelegramTransport.ts");
for (const required of [
  "HTTPS_PROXY",
  "ALL_PROXY",
  "DefaultWebProxy",
  "ProxyEnable",
  "ProxyServer",
  "winhttp",
  "System / VPN network route",
  'method: "getMe"',
  "timeoutMs: Math.min(6_000",
]) assert.ok(systemTransport.includes(required), `System Telegram transport missing ${required}`);
assert.match(systemTransport, /windows_default/);
assert.match(systemTransport, /windows_user/);
assert.match(systemTransport, /winhttp/);
assert.match(systemTransport, /system_network/);
assert.match(systemTransport, /redactProxy/);

const direct = read("server/telegram/DirectTelegramTransport.ts");
assert.match(direct, /redactTelegramBotTokenFromText/);
assert.match(direct, /\/bot\[REDACTED\]\//);

const panel = read("pages/settings/SettingsTelegramPanel.tsx");
assert.match(panel, /<option value="system">VPN \/ پراکسی سیستم<\/option>/);
assert.match(panel, /DefaultWebProxy|Proxy محیط Node/);
assert.match(panel, /telegramTransportMode === 'system'/);

const controller = read("pages/settings/SettingsController.tsx");
assert.match(controller, /\['disabled', 'direct', 'system', 'proxy', 'relay'\]/);

const panelTypes = read("pages/settings/settingsPanelTypes.ts");
assert.match(panelTypes, /telegram_transport_mode\?: 'disabled' \| 'direct' \| 'system' \| 'proxy' \| 'relay'/);
const rootTypes = read("types.ts");
assert.match(rootTypes, /telegram_transport_mode\?: 'disabled' \| 'direct' \| 'system' \| 'proxy' \| 'relay'/);

const settingsRoutes = read("server/routes/settings.routes.ts");
assert.match(settingsRoutes, /if \(transportMode === "proxy"\)/, "Manual proxy validation must stay proxy-only");

const control = read("server/routes/telegramControl.routes.ts");
assert.match(control, /getSystemTelegramTransportStatus/);
assert.match(control, /systemRoute/);

const release = read("KOUROSH_SOURCE_VERSION").trim();
const releaseNumber = Number(release.replace(/^v/, ""));
assert.ok(Number.isInteger(releaseNumber) && releaseNumber >= 359, `KOUROSH_SOURCE_VERSION must be v359 or successor; found ${release}`);
console.log(JSON.stringify({
  ok: true,
  release,
  systemTransport: true,
  windowsDefaultProxy: true,
  windowsRegistryProxy: true,
  winHttpProxy: true,
  envProxy: true,
  tunFallback: true,
  longPollingPreflight: true,
  botTokenLogRedaction: true,
  settingsUi: true,
}, null, 2));
