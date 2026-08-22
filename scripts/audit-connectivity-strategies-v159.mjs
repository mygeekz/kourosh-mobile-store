import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

for (const file of [
  "server/telegram/TelegramTransport.ts",
  "server/telegram/DirectTelegramTransport.ts",
  "server/telegram/ProxyTelegramTransport.ts",
  "server/telegram/RelayTelegramTransport.ts",
  "server/telegram/DisabledTelegramTransport.ts",
  "server/telegram/telegramTransportRuntime.ts",
  "server/connectivity/relayProvider.ts",
  "server/connectivity/connectivityStrategies.ts",
  "server/connectivity/telegramPublicAccess.ts",
  "scripts/test-connectivity-strategies-v159.mjs",
]) assert(exists(file), `${file} missing`);

const transport = read("server/telegram/TelegramTransport.ts");
for (const mode of ["disabled", "direct", "proxy", "relay"]) assert(transport.includes(`\"${mode}\"`), `transport mode ${mode} missing`);
assert(transport.includes('raw === "cloud_relay"') && transport.includes('return "relay"'), "legacy cloud_relay must normalize to relay");

const direct = stripComments(read("server/telegram/DirectTelegramTransport.ts"));
assert(!/process\.env\.(?:TG_PROXY|HTTPS_PROXY|HTTP_PROXY)/.test(direct), "Direct transport must not read environment proxy variables");
assert(!/telegram_proxy/.test(direct), "Direct transport must not read app proxy settings");
assert(direct.includes('https://api.telegram.org'), "Direct transport owns official Telegram endpoint");

const proxy = stripComments(read("server/telegram/ProxyTelegramTransport.ts"));
assert(proxy.includes("TELEGRAM_PROXY_NOT_CONFIGURED"), "Proxy mode must fail closed without config");
assert(!/directTelegramTransport|return\s+super\.request\(/.test(proxy), "Proxy mode must not fallback to Direct");

const relay = stripComments(read("server/telegram/RelayTelegramTransport.ts"));
assert(relay.includes("requestTelegramThroughRelay"), "Relay transport must use generic Relay connector");
assert(!relay.includes("api.telegram.org"), "Local Relay transport must not call Telegram directly");

const runtime = read("server/telegram/telegramTransportRuntime.ts");
for (const symbol of ["disabledTelegramTransport", "directTelegramTransport", "proxyTelegramTransport", "relayTelegramTransport"]) assert(runtime.includes(symbol), `${symbol} missing from runtime selector`);

const provider = read("server/connectivity/relayProvider.ts");
assert(provider.includes('"managed_kourosh"') && provider.includes('"custom"'), "Relay providers missing");
assert(provider.includes("custom_relay_control_url") && provider.includes("custom_relay_connector_url"), "Custom Relay URLs missing");
assert(!provider.includes("custom_relay_connector_url || settings.kourosh_cloud_endpoint"), "Custom Relay must not fall back to a legacy managed connector endpoint");
assert(provider.includes("resolveRelayAssignmentProvider") && provider.includes("projectSelectedRelayAssignment"), "Relay readiness must bind assignment metadata to the selected provider");
assert(!/https?:\/\/(?!127\.0\.0\.1|localhost|example\.invalid)[A-Za-z0-9.-]+/i.test(provider), "Relay provider module must not hard-code a production service URL");

const publicAccess = read("server/connectivity/telegramPublicAccess.ts");
for (const mode of ["disabled", "self_hosted", "external_tunnel", "stable_tunnel", "relay"]) assert(publicAccess.includes(`\"${mode}\"`), `Mini App access mode ${mode} missing`);
assert(!/app_base_url|local_base_url/.test(stripComments(publicAccess)), "Mini App resolver must not fallback to app/local base URLs");

const connectorRuntime = read("server/cloud/cloudConnectorRuntime.ts");
assert(connectorRuntime.includes("relayRequiredByStrategies"), "Relay Connector lifecycle must follow selected strategies");
assert(connectorRuntime.includes("if (!readiness.required) return readiness"), "Relay Connector must stay off when no strategy needs relay");

const scopes = read("server/connectivity/settingsScopes.ts");
for (const key of ["relay_provider", "custom_relay_control_url", "custom_relay_connector_url", "miniapp_public_access_mode"]) assert(scopes.includes(`\"${key}\"`), `${key} missing from connectivity settings scope`);

const settingsRoutes = read("server/routes/settings.routes.ts");
assert(settingsRoutes.includes("hasTransportInput") && settingsRoutes.includes("hasMiniAppModeInput") && settingsRoutes.includes("hasRelayProviderInput"), "Settings save must preserve independent scopes");
assert(settingsRoutes.includes("/api/settings/relay-connector/enroll"), "generic Relay enrollment endpoint missing");

const panel = read("pages/settings/SettingsTelegramPanel.tsx");
for (const label of ["غیرفعال", "مستقیم", "پراکسی", "رله", "میزبانی شخصی", "تانل موقت / عیب‌یابی", "تانل پایدار", "ابر کوروش", "رله شخصی"]) assert(panel.includes(label), `Settings UI label missing: ${label}`);
assert((panel.match(/<option value="relay">رله<\/option>/g) || []).length >= 2, "Relay must be selectable before provisioning so Admin can configure/enroll the selected provider");

// Local Store source must not import Linux-only Cloud server runtime lock or use /proc/abstract-socket primitives.
const storeFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(?:ts|tsx|mjs|js)$/.test(entry.name)) storeFiles.push(rel);
  }
};
walk("server");
const linuxLeaks = storeFiles.filter((file) => /cloud\/runtime\/cloudRuntimeState|\/proc\/|abstract unix|cloud-relay\.lock/i.test(read(file)));
assert.deepEqual(linuxLeaks, [], `Local Store graph imports Linux Cloud runtime: ${linuxLeaks.join(", ")}`);

// Custom Relay server is operator-owned/provider-neutral: no Kourosh account/API/domain dependency in runtime source.
const cloudRuntimeFiles = [];
const walkCloud = (dir) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCloud(rel); else if (/\.(?:ts|mjs|js)$/.test(entry.name)) cloudRuntimeFiles.push(rel);
  }
};
walkCloud("cloud");
const hardcodedService = cloudRuntimeFiles.filter((file) => /https?:\/\/(?:[^\s"']*kourosh[^\s"']*)/i.test(read(file)));
assert.deepEqual(hardcodedService, [], `Cloud/Relay runtime hard-codes Kourosh-owned URL: ${hardcodedService.join(", ")}`);

const allStoreSource = storeFiles.map(read).join("\n");
assert(!/tunnel_command|child_process[^\n]*(?:tunnel|cloudflare|ngrok)/i.test(allStoreSource), "Core Store must not execute arbitrary tunnel commands");
assert(!/assertCloudMutationRuntimeSupported/.test(allStoreSource), "Local Store must not invoke Node24-only Cloud mutation runtime policy");

const packageJson = JSON.parse(read("package.json"));
assert(String(packageJson.engines?.node || "").includes(">=24.0.0"), "Store package engine must retain Node 26 compatibility and must not be pinned to Cloud Node24-only policy");
const selfHostedEnv = read("deployment/cloud/self-hosted-relay.env.example");
assert(/example\.invalid/.test(selfHostedEnv) && /KOUROSH_CLOUD_CONTROL_DB_PATH/.test(selfHostedEnv) && /KOUROSH_CLOUD_CONNECTOR_PUBLIC_ENDPOINT/.test(selfHostedEnv), "Provider-neutral self-hosted Relay deployment template missing required operator-owned runtime controls");
assert(/without any Kourosh Cloud account/.test(selfHostedEnv) && !/KOUROSH_(?:CLOUD_)?(?:ACCOUNT|LICENSE|API_KEY|TOKEN)=/.test(selfHostedEnv), "Self-hosted Relay template must explicitly avoid Kourosh account/license/API credentials");

// Preserve v158 security/runtime hardening.
const lockState = read("cloud/runtime/cloudRuntimeState.mjs");
assert(lockState.includes("lockId") && /abstract|unix/i.test(lockState), "v158 atomic runtime lock hardening missing");
const cloudProtocol = read("server/cloud/localCloudConnector.ts");
assert(cloudProtocol.includes("bindTelegramCredential") && cloudProtocol.includes("telegramCredentialHash"), "Bot token memory-only Relay binding missing");

console.log(JSON.stringify({
  ok: true,
  telegramTransportModes: 4,
  miniAppAccessModes: 5,
  relayProviders: ["managed_kourosh", "custom"],
  localStoreLinuxCloudRuntimeImports: linuxLeaks.length,
  hardcodedKouroshServiceUrlsInRelayRuntime: hardcodedService.length,
  directReadsProxyEnv: false,
  miniAppUrlFallbacks: false,
  v158AtomicRuntimeLockPreserved: true,
}, null, 2));
