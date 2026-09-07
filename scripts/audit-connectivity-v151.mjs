import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const walk = (dir) => {
  const output = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(rel));
    else output.push(rel);
  }
  return output;
};

// v151 Local/Public separation invariants must survive the operational Cloud work in v152.
const localHelper = read("server/utils/localSettingsHelpers.ts");
const localRoutes = read("server/routes/localSettings.routes.ts");
assert.match(localHelper, /FRESH_LOCAL_DOMAIN_SUFFIX = "home\.arpa"/);
assert.match(localHelper, /LEGACY_LOCAL_DOMAIN_SUFFIXES = new Set\(\["localhost", "local"\]\)/);
assert.match(localHelper, /if \(!preserveLegacy\) return "";/);
assert.doesNotMatch(localHelper, /return cleaned \|\| "localhost"/);
assert.match(localRoutes, /resolveStoredLegacyShortcut/);
assert.match(localRoutes, /LOCAL_LAN_ADDRESS_UNAVAILABLE/);

const miniAccess = read("server/connectivity/telegramPublicAccess.ts");
for (const forbiddenFallback of ["app_base_url", "public_app_base_url", "local_base_url", "qr_public_base_url"]) {
  assert.equal(miniAccess.includes(forbiddenFallback), false, `Mini App resolver must not reference ${forbiddenFallback}.`);
}
assert.match(miniAccess, /"disabled" \| "self_hosted" \| "external_tunnel" \| "stable_tunnel" \| "relay"/);
assert.match(miniAccess, /resolveCloudConnectorReadiness/);
assert.match(miniAccess, /relay\.assignedPublicUrl/);

const settingsScopes = read("server/connectivity/settingsScopes.ts");
assert.match(settingsScopes, /LOCAL_ACCESS_SETTING_KEYS/);
assert.match(settingsScopes, /key\.startsWith\("telegram_"\)/);
assert.match(settingsScopes, /key\.startsWith\("kourosh_cloud_"\)/);
const settingsRoutes = read("server/routes/settings.routes.ts");
assert.match(settingsRoutes, /\/api\/settings\/local-access/);
assert.match(settingsRoutes, /\/api\/settings\/telegram/);

const settingsController = read("pages/settings/SettingsController.tsx");
assert.match(settingsController, /mergeGenericSettingsBaseline/);
assert.match(settingsController, /key\.startsWith\('local_'\)[\s\S]*key\.startsWith\('telegram_'\)[\s\S]*key\.startsWith\('kourosh_cloud_'\)/);
const localPanel = read("pages/settings/SettingsLocalPanel.tsx");
assert.match(localPanel, /دسترسی محلی و PWA/);
assert.doesNotMatch(localPanel, /telegram_miniapp_public_url|kourosh_cloud_|BotFather/);
const businessPanel = read("pages/settings/SettingsBusinessPanel.tsx");
assert.match(businessPanel, /آدرس پایه Web App عمومی \(Legacy\)/);
assert.match(businessPanel, /qr_public_base_url/);

// Telegram business code remains behind the same facade, but v152 may select Direct or Cloud Relay.
const telegramFacade = read("server/telegramService.ts");
assert.doesNotMatch(telegramFacade, /api\.telegram\.org/);
assert.match(telegramFacade, /getActiveTelegramTransport\(\)\.request/);
assert.doesNotMatch(telegramFacade, /directTelegramTransport/);
const polling = read("server/utils/telegramPollingRuntime.ts");
assert.doesNotMatch(polling, /api\.telegram\.org|node-fetch/);
assert.match(polling, /callTelegramBotApi/);
assert.match(polling, /timeout: 25[\s\S]*timeoutMs: 30_000/);
const updateSource = read("server/telegram/telegramUpdateSource.ts");
for (const source of ["polling", "webhook", "cloud_relay"]) assert.match(updateSource, new RegExp(`"${source}"`));
assert.match(updateSource, /businessHandler\(normalizeTelegramUpdate\(update\)\)/);

const runtimeFiles = ["server", "cloud", "pages", "miniapp", "utils"].flatMap(walk).filter((file) =>
  /\.(?:ts|tsx|js|mjs|cjs)$/.test(file) && !file.includes("/tests/") && !/\.test\./.test(file),
);
const endpointOwners = runtimeFiles.filter((file) => read(file).includes("https://api.telegram.org"));
assert.deepEqual(endpointOwners.sort(), ["cloud/relay-server/relayServer.mjs", "server/telegram/DirectTelegramTransport.ts"].sort());

const directTransport = read("server/telegram/DirectTelegramTransport.ts");
const proxyTransport = read("server/telegram/ProxyTelegramTransport.ts");
assert.match(directTransport, /TG_TIMEOUT_MS = 12_000/);
assert.doesNotMatch(directTransport.replace(/^\s*\/\/.*$/gm, ""), /process\.env\.(TG_PROXY|HTTPS_PROXY|HTTP_PROXY)/);
assert.match(directTransport, /request\.multipart[\s\S]*FormData/);
assert.match(proxyTransport, /TELEGRAM_PROXY_NOT_CONFIGURED/);
assert.match(proxyTransport, /requestWithNetwork/);
assert.doesNotMatch(proxyTransport.replace(/^\s*\/\/.*$/gm, ""), /directTelegramTransport\s*\.|shouldRetryWithoutProxy/i);

const installIdentity = read("server/connectivity/installationIdentity.ts");
assert.match(installIdentity, /randomBytes\(18\)/);
assert.match(installIdentity, /INSTALLATION_ID_SETTING_KEY = "installation_id"/);
assert.doesNotMatch(installIdentity, /store_name|domain|telegram|bot|ip/i);

const boundaries = read("server/connectivity/runtimeBoundaries.ts");
assert.match(boundaries, /bindHost: "127\.0\.0\.1", port: 3001/);
assert.match(boundaries, /defaultPort: 5173/);
assert.match(boundaries, /bindHost: "127\.0\.0\.1", port: 4180/);
assert.match(boundaries, /outboundOnly: true, tlsPorts: \[443\][\s\S]*publicListener: false/);

console.log("Connectivity v151 invariant audit passed under v159 (Local/Public isolation, legacy local-domain safety, scoped Settings, transport-agnostic business handler, explicit Direct/Proxy behavior and runtime boundaries)." );
