import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const types = read("types.ts");
assert.match(types, /telegram_transport_mode\?: 'disabled' \| 'direct' \| 'proxy' \| 'relay'/);
assert.match(types, /miniapp_public_access_mode\?: 'disabled' \| 'self_hosted' \| 'external_tunnel' \| 'stable_tunnel' \| 'relay'/);

const workspace = read("pages/settings/SettingsWorkspaceSection.tsx");
assert.match(workspace, /if \(tab === 'telegram'\)[\s\S]{0,180}handleTelegramSettingsSubmit/,
  "Bottom Settings footer must use the Telegram/Mini App scoped save path on the telegram tab");

const routes = read("server/routes/settings.routes.ts");
assert.match(routes, /savedSettings = await getAllSettingsAsObject\(\)/,
  "Runtime config publication must be based on settings re-read after persistence");
assert.match(routes, /MINIAPP_SETTINGS_PERSISTENCE_MISMATCH/);
assert.ok(routes.indexOf("persistScopedSettings(scoped)") < routes.indexOf("savedSettings = await getAllSettingsAsObject()"));
assert.ok(routes.indexOf("savedSettings = await getAllSettingsAsObject()") < routes.indexOf("writeMiniAppGatewayRuntimeConfigFromSettings(savedSettings)"));

const eslint = read("eslint.config.js");
for (const fragment of ["dist-miniapp/**", "coverage/**", "temp/**", "cache/**", "cloud/**/*"]) assert.ok(eslint.includes(fragment), `ESLint config missing ${fragment}`);
assert.match(eslint, /\.\.\.globals\.node/, "Node runtime files must receive Node globals");
for (const runtimeGlobal of ["fetch", "FormData", "Blob", "AbortController"]) assert.ok(eslint.includes(runtimeGlobal), `Modern Node runtime global missing ${runtimeGlobal}`);

const launcher = read("scripts/windows-miniapp-gateway-launcher.mjs");
assert.match(launcher, /Get-NetTCPConnection/);
assert.match(launcher, /Get-CimInstance Win32_Process/);
assert.match(launcher, /isExpectedKouroshMiniAppGatewayProcess/);
assert.doesNotMatch(launcher, /taskkill|Stop-Process|kill\s+\/f/i, "Launcher must never kill an unknown listener");

const bat = fs.readFileSync(path.join(root, "start_https.bat"));
assert.equal(bat.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, "start_https.bat must not contain UTF-8 BOM");
const batText = bat.toString("utf8");
assert.match(batText, /npm run build:miniapp/);
assert.match(batText, /windows-miniapp-gateway-launcher\.mjs/);
assert.doesNotMatch(batText, /cmd\s+\/k/i);

for (const file of fs.readdirSync(root).filter((name) => name.toLowerCase().endsWith(".bat"))) {
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file} must not contain UTF-8 BOM`);
}

assert.equal(exists("dist-miniapp"), false, "Generated dist-miniapp must not be part of source audit input");
console.log(JSON.stringify({ ok: true, settingsFooterScopedSave: true, persistedRuntimeRecheck: true, eslintGeneratedArtifactsExcluded: true, cloudMjsEnvironmentConfigured: true, windowsBatNoBom: true, duplicateGatewayPolicySource: true }, null, 2));
