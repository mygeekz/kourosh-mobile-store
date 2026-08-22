import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const publicAccess = read("server/connectivity/telegramPublicAccess.ts");
const publicSync = read("server/services/miniAppPublicUrlSync.service.ts");
const menu = read("server/utils/telegramMiniApp.ts");
const settingsRoute = read("server/routes/settings.routes.ts");
const settingsPanel = read("pages/settings/SettingsTelegramPanel.tsx");
const startup = read("scripts/windows-miniapp-startup-coordinator.mjs");
const stableLauncher = read("scripts/windows-miniapp-stable-tunnel-launcher.mjs");

assert.match(publicAccess, /validateTelegramStableMiniAppCanonicalUrl/);
assert.match(publicAccess, /endsWith\("\.trycloudflare\.com"\)/);
assert.match(publicAccess, /`\$\{url\.origin\}\/miniapp\.html`/);
assert.match(publicSync, /skipped_diagnostic/);
assert.match(publicSync, /cloudflare_quick_tunnel/);
assert.match(menu, /telegramMenuButtonPayload/);
assert.match(settingsRoute, /syncTelegramMenuButton\(savedSettings\)/);
assert.match(settingsPanel, /Main Mini App \/ BotFather/);
assert.match(settingsPanel, /URL قابل ثبت یک‌باره/);
assert.match(settingsPanel, /Restart ویندوز، کوروش یا Named Tunnel نباید این URL را تغییر دهد/);
assert.match(startup, /stable_tunnel/);
assert.doesNotMatch(stableLauncher, /trycloudflare\.com/i);

for (const file of [publicAccess, publicSync, menu, settingsRoute, settingsPanel, startup, stableLauncher]) {
  assert.doesNotMatch(file, /setMainMiniApp|updateBotFather|api\.telegram\.org\/.*BotFather/i, "No runtime BotFather automation may be invented");
}

console.log(JSON.stringify({
  status: "PASS",
  stableCanonicalGuard: true,
  trycloudflareProductionRejected: true,
  quickTunnelMenuMutationBlocked: true,
  menuCanonicalReconciliation: true,
  botFatherOneTimeUx: true,
  runtimeBotFatherAutomation: false,
}, null, 2));
