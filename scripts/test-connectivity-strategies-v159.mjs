import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { DirectTelegramTransport } from "../server/telegram/DirectTelegramTransport.ts";
import { ProxyTelegramTransport } from "../server/telegram/ProxyTelegramTransport.ts";
import { disabledTelegramTransport } from "../server/telegram/DisabledTelegramTransport.ts";
import { configureTelegramTransportRuntime, getActiveTelegramTransport, getTelegramTransportRuntimeMode } from "../server/telegram/telegramTransportRuntime.ts";
import { callTelegramBotApi } from "../server/telegramService.ts";
import { resolveTelegramTransportMode } from "../server/telegram/TelegramTransport.ts";
import { resolveMiniAppPublicAccessMode, resolveTelegramMiniAppUrl } from "../server/connectivity/telegramPublicAccess.ts";
import { relayRequiredByStrategies, resolveRelayConnectorUrl, resolveRelayControlUrl, resolveRelayProvider } from "../server/connectivity/relayProvider.ts";
import { resolveConnectivityStrategies } from "../server/connectivity/connectivityStrategies.ts";
import { pickLocalAccessSettings, pickTelegramSettings } from "../server/connectivity/settingsScopes.ts";
import { initializeCloudConnectorRuntime, stopCloudConnectorRuntime, getLocalCloudConnector } from "../server/cloud/cloudConnectorRuntime.ts";
import { ensureConnectorCredential } from "../server/cloud/connectorCredentialStore.ts";
import { enrollCloudConnector } from "../server/cloud/cloudEnrollment.ts";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { PersistentCloudTenantRegistry } from "../cloud/control-plane/PersistentCloudTenantRegistry.mjs";
import { initializeCloudControlDatabase } from "../cloud/operations/cloudControlLifecycle.mjs";
import { createControlPlaneHttpHandler } from "../cloud/control-plane/controlPlaneApi.mjs";
import { createMiniAppGateway } from "./serve-miniapp-gateway.mjs";
import { createKouroshServerStarter } from "../server/bootstrap/serverLifecycle.ts";

process.env.NODE_ENV = "test";
const TOKEN = "123456789:abcdefghijklmnopqrstuvwxyzABCDE";
const INSTALL = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, timeoutMs = 4000, label = "condition") => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (predicate()) return; await sleep(20); }
  assert.fail(`Timed out waiting for ${label}`);
};
const listen = (server, port = 0) => new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(() => resolve()));

// --- Canonical modes + v158 compatibility normalization.
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: "disabled" }), "disabled");
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: "direct" }), "direct");
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: "proxy" }), "proxy");
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: "relay" }), "relay");
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: "cloud_relay" }), "relay");
assert.equal(resolveMiniAppPublicAccessMode({ miniapp_public_access_mode: "external_tunnel" }, "test"), "external_tunnel");
assert.equal(resolveMiniAppPublicAccessMode({ telegram_public_access_mode: "cloud_managed" }, "test"), "relay");
assert.equal(resolveRelayProvider({ telegram_transport_mode: "cloud_relay" }), "managed_kourosh");
assert.equal(resolveRelayProvider({ relay_provider: "custom" }), "custom");

// URL source isolation: no app/local fallback in any Mini App mode.
assert.equal(resolveTelegramMiniAppUrl({ miniapp_public_access_mode: "disabled", app_base_url: "https://app.example.invalid", local_base_url: "https://local.home.arpa" }, "test"), null);
assert.equal(resolveTelegramMiniAppUrl({ miniapp_public_access_mode: "self_hosted", app_base_url: "https://app.example.invalid" }, "test"), null);
assert.equal(resolveTelegramMiniAppUrl({ miniapp_public_access_mode: "external_tunnel", local_base_url: "https://local.home.arpa" }, "test"), null);
assert.equal(resolveTelegramMiniAppUrl({ miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html" }, "test"), "https://tunnel.example.invalid/miniapp.html");

// --- Direct is actually direct, even when all historical environment proxy variables are set.
let directTargetRequests = 0;
const telegramTarget = http.createServer((req, res) => {
  directTargetRequests += 1;
  const method = String(req.url || "").split("/").at(-1);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, result: { method } }));
});
const telegramPort = await listen(telegramTarget);
const telegramOrigin = `http://127.0.0.1:${telegramPort}`;
process.env.TG_PROXY = "http://127.0.0.1:1";
process.env.HTTPS_PROXY = "http://127.0.0.1:1";
process.env.HTTP_PROXY = "http://127.0.0.1:1";
const direct = new DirectTelegramTransport({ apiBaseUrl: telegramOrigin, environment: "test" });
direct.setProxy("http://127.0.0.1:2");
const directResult = await direct.request({ botToken: TOKEN, method: "getMe", httpMethod: "GET" });
assert.equal(directResult.success, true);
assert.equal(directTargetRequests, 1, "Direct must ignore app/env proxy configuration");

// Proxy strategy owns the explicit app proxy and performs a single proxy-network attempt only.
class ProxyProbeTransport extends ProxyTelegramTransport {
  attempts = [];
  fail = false;
  async requestWithNetwork(request, options = {}) {
    this.attempts.push({ method: request.method, proxyUrl: options.proxyUrl });
    return this.fail ? { success: false, errorCode: "TELEGRAM_NETWORK_ERROR", message: "proxy-down" } : { success: true, data: { ok: true } };
  }
}
const proxyProbe = new ProxyProbeTransport({ apiBaseUrl: telegramOrigin, environment: "test" });
assert.equal((await proxyProbe.request({ botToken: TOKEN, method: "getMe" })).errorCode, "TELEGRAM_PROXY_NOT_CONFIGURED");
proxyProbe.setProxy("http://127.0.0.1:18080");
assert.equal((await proxyProbe.request({ botToken: TOKEN, method: "getMe" })).success, true);
assert.deepEqual(proxyProbe.attempts, [{ method: "getMe", proxyUrl: "http://127.0.0.1:18080" }]);
proxyProbe.fail = true;
const proxyFailed = await proxyProbe.request({ botToken: TOKEN, method: "getUpdates" });
assert.equal(proxyFailed.success, false);
assert.equal(proxyProbe.attempts.length, 2, "Proxy failure must not trigger a hidden second Direct attempt");

const disabled = await disabledTelegramTransport.request({ botToken: TOKEN, method: "getMe" });
assert.equal(disabled.errorCode, "TELEGRAM_DISABLED");

// Runtime selector keeps business facade transport-agnostic.
configureTelegramTransportRuntime({ telegram_transport_mode: "disabled" });
assert.equal(getTelegramTransportRuntimeMode(), "disabled");
assert.equal(getActiveTelegramTransport().mode, "disabled");
configureTelegramTransportRuntime({ telegram_transport_mode: "direct", telegram_proxy: "http://127.0.0.1:1" });
assert.equal(getActiveTelegramTransport().mode, "direct");
configureTelegramTransportRuntime({ telegram_transport_mode: "proxy", telegram_proxy: "http://127.0.0.1:18080" });
assert.equal(getActiveTelegramTransport().mode, "proxy");
configureTelegramTransportRuntime({ telegram_transport_mode: "relay" });
assert.equal(getActiveTelegramTransport().mode, "relay");

// Relay lifecycle is selected by strategy, not by the mere presence of old Cloud metadata.
stopCloudConnectorRuntime();
initializeCloudConnectorRuntime({ telegram_transport_mode: "direct", miniapp_public_access_mode: "disabled", kourosh_cloud_provisioned: "1" });
assert.equal(getLocalCloudConnector(), null);
initializeCloudConnectorRuntime({ telegram_transport_mode: "proxy", telegram_proxy: "http://127.0.0.1:18080", miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html", kourosh_cloud_provisioned: "1" });
assert.equal(getLocalCloudConnector(), null);
configureTelegramTransportRuntime({ telegram_transport_mode: "disabled", miniapp_public_access_mode: "disabled" });
initializeCloudConnectorRuntime({ telegram_transport_mode: "disabled", miniapp_public_access_mode: "disabled" });
assert.equal(getActiveTelegramTransport().mode, "disabled");
assert.equal(getLocalCloudConnector(), null, "All external connectivity disabled must remain a valid Local-only runtime");

// Local backend starter remains Cloud-optional: zero Relay config + all external connectivity disabled still reaches app.listen.
let localListenCalls = 0;
let localPollingCalls = 0;
const localStarter = createKouroshServerStarter({
  app: { listen: (_port, _host, cb) => { localListenCalls += 1; cb?.(); return {}; } },
  port: 3001,
  bindHost: "127.0.0.1",
  getDbInstance: async () => ({}),
  runPendingMigrations: async () => undefined,
  ensureReminderRulesTables: async () => undefined,
  startReportSchedulers: async () => undefined,
  startOutboxWorker: () => undefined,
  startAutoSendScheduler: () => undefined,
  startCustomerTelegramNotifyScheduler: () => undefined,
  autoConfigureTelegramUpdateMode: async () => undefined,
  startTelegramPolling: async () => { localPollingCalls += 1; },
  getAllSettingsAsObject: async () => ({ telegram_transport_mode: "disabled", miniapp_public_access_mode: "disabled", relay_provider: "managed_kourosh", backup_enabled: "0" }),
  updateSetting: async () => undefined,
  initializeCloudConnectorRuntime,
  configureTelegramTransportRuntime,
  startDailyBackupJob: () => undefined,
});
localStarter();
await waitFor(() => localListenCalls === 1, 2000, "Local backend listener with all external connectivity disabled");
assert.equal(getLocalCloudConnector(), null);
assert.equal(getActiveTelegramTransport().mode, "disabled");
assert.equal(localPollingCalls, 1, "Lifecycle may invoke polling starter, but disabled transport prevents Telegram network runtime inside polling runtime");

// Independence matrix: only Relay strategies require the connector.
const matrix = [
  ["direct", "disabled", false], ["direct", "self_hosted", false], ["direct", "external_tunnel", false], ["direct", "relay", true],
  ["proxy", "disabled", false], ["proxy", "self_hosted", false], ["proxy", "external_tunnel", false], ["proxy", "relay", true],
  ["relay", "disabled", true], ["relay", "self_hosted", true], ["relay", "external_tunnel", true], ["relay", "relay", true],
];
for (const [telegramMode, miniAppMode, needsRelay] of matrix) {
  const settings = { telegram_transport_mode: telegramMode, miniapp_public_access_mode: miniAppMode };
  assert.equal(relayRequiredByStrategies(settings), needsRelay, `${telegramMode}+${miniAppMode}`);
  const resolved = resolveConnectivityStrategies(settings, { NODE_ENV: "test" });
  assert.equal(resolved.relay.required, needsRelay);
  assert.equal(resolved.telegram.mode, telegramMode);
  assert.equal(resolved.miniApp.mode, miniAppMode);
}

// Settings scopes remain independent, including Local/PWA separation.
const telegramOnly = pickTelegramSettings({ telegram_transport_mode: "proxy", telegram_proxy: "http://proxy", local_hostname: "do-not-touch", qr_public_base_url: "https://qr.example.invalid" });
assert.deepEqual(telegramOnly, { telegram_transport_mode: "proxy", telegram_proxy: "http://proxy" });
const miniAppOnly = pickTelegramSettings({ miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html", local_domain_suffix: "do-not-touch" });
assert.deepEqual(miniAppOnly, { miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html" });
const providerOnly = pickTelegramSettings({ relay_provider: "custom" });
assert.deepEqual(providerOnly, { relay_provider: "custom" });
assert.deepEqual(pickLocalAccessSettings({ local_hostname: "shop", telegram_transport_mode: "relay", miniapp_public_access_mode: "relay" }), { local_hostname: "shop" });

// Custom Relay URLs are provider-owned/runtime-configurable and never fall through to managed endpoints.
const customSettings = { relay_provider: "custom", custom_relay_control_url: "https://control.custom.example.invalid/", custom_relay_connector_url: "wss://connector.custom.example.invalid/connector" };
assert.equal(resolveRelayControlUrl(customSettings, { NODE_ENV: "production", KOUROSH_CLOUD_CONTROL_PLANE_URL: "https://managed.example.invalid/" }), "https://control.custom.example.invalid/");
assert.equal(resolveRelayConnectorUrl(customSettings, { NODE_ENV: "production", KOUROSH_CLOUD_CONNECTOR_ENDPOINT: "wss://managed.example.invalid/connector" }), "wss://connector.custom.example.invalid/connector");
assert.equal(resolveRelayConnectorUrl({ relay_provider: "custom", kourosh_cloud_endpoint: "wss://managed.example.invalid/connector" }, { NODE_ENV: "production", KOUROSH_CLOUD_CONNECTOR_ENDPOINT: "wss://managed.example.invalid/connector" }), null, "Custom Relay must never inherit a legacy/managed connector endpoint");
assert.equal(resolveTelegramMiniAppUrl({ relay_provider: "custom", miniapp_public_access_mode: "relay", kourosh_cloud_provisioned: "1", kourosh_cloud_assigned_public_url: "https://managed.example.invalid/miniapp.html" }, "test"), null, "Custom Relay must not reuse a managed provider public assignment");

// --- Custom/Self-hosted Relay E2E: same secure protocol, no Kourosh-managed endpoint.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v159-custom-relay-"));
process.env.KOUROSH_CLOUD_RUNTIME_DIR = path.join(tmp, "runtime");
process.env.KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH = path.join(tmp, "runtime", "connector.pem");
process.env.KOUROSH_MINIAPP_RELAY_SECRET_PATH = path.join(tmp, "runtime", "miniapp-secret");
process.env.KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH = path.join(tmp, "runtime", "miniapp-assignment.json");
const credential = ensureConnectorCredential({ privateKeyPath: process.env.KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH });
assert(credential);

const api = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://api.invalid").pathname;
  const allowed = pathname === "/api/miniapp/auth" || pathname.startsWith("/api/miniapp/customer/") || pathname.startsWith("/api/miniapp/partner/") || pathname.startsWith("/api/miniapp/staff/");
  res.writeHead(allowed ? 200 : 404, { "content-type": "application/json" });
  res.end(JSON.stringify({ success: allowed, path: pathname, source: "local-backend" }));
});
const apiPort = await listen(api);
const dist = path.join(tmp, "dist-miniapp");
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
fs.writeFileSync(path.join(dist, "miniapp.html"), "<html>custom-relay-miniapp</html>");
fs.writeFileSync(path.join(dist, "kourosh-logo.svg"), "<svg/>");
fs.writeFileSync(path.join(dist, "assets", "app-12345678.js"), "console.log('mini')");
// Self-hosted and External Tunnel both terminate at the same safe Local Mini App Gateway without Relay.
const requestLocal = (port, host, requestPath = "/api/miniapp/customer/summary") => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port, path: requestPath, method: "GET", headers: { host } }, (res) => {
    const chunks = []; res.on("data", (chunk) => chunks.push(chunk)); res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
  });
  req.on("error", reject); req.end();
});
const selfHostedGateway = createMiniAppGateway({ distDir: dist, apiHost: "127.0.0.1", apiPort, publicHost: "self.example.invalid", externalProto: "https", logSink: () => {} });
const selfHostedPort = await listen(selfHostedGateway);
stopCloudConnectorRuntime();
initializeCloudConnectorRuntime({ telegram_transport_mode: "direct", miniapp_public_access_mode: "self_hosted", telegram_miniapp_public_url: "https://self.example.invalid/miniapp.html" });
assert.equal(getLocalCloudConnector(), null);
assert.equal((await requestLocal(selfHostedPort, "self.example.invalid")).status, 200, "Self-hosted Mini App should use Local Gateway with no Relay");

const tunnelGateway = createMiniAppGateway({ distDir: dist, apiHost: "127.0.0.1", apiPort, publicHost: "tunnel.example.invalid", externalProto: "https", logSink: () => {} });
const tunnelGatewayPort = await listen(tunnelGateway);
const tunnelServer = http.createServer((incoming, outgoing) => {
  const upstream = http.request({ host: "127.0.0.1", port: tunnelGatewayPort, path: incoming.url, method: incoming.method, headers: { ...incoming.headers, host: "tunnel.example.invalid" } }, (upstreamResponse) => {
    outgoing.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers); upstreamResponse.pipe(outgoing);
  });
  upstream.on("error", () => { outgoing.statusCode = 502; outgoing.end("bad gateway"); }); incoming.pipe(upstream);
});
const tunnelPort = await listen(tunnelServer);
initializeCloudConnectorRuntime({ telegram_transport_mode: "proxy", telegram_proxy: "http://127.0.0.1:18080", miniapp_public_access_mode: "external_tunnel", telegram_miniapp_public_url: "https://tunnel.example.invalid/miniapp.html" });
assert.equal(getLocalCloudConnector(), null);
assert.equal((await requestLocal(tunnelPort, "public-tunnel-simulator.invalid")).status, 200, "External Tunnel simulation should reach Local Gateway with no Relay");

const gateway = createMiniAppGateway({ distDir: dist, apiHost: "127.0.0.1", apiPort, gatewayMode: "cloud_relay_internal", relaySecretPath: process.env.KOUROSH_MINIAPP_RELAY_SECRET_PATH, relayAssignmentPath: process.env.KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH, logSink: () => {} });
const gatewayPort = await listen(gateway);
process.env.KOUROSH_MINIAPP_GATEWAY_ORIGIN = `http://127.0.0.1:${gatewayPort}`;

let relayTelegramRequests = 0;
const relayTelegramOrigin = http.createServer((req, res) => {
  relayTelegramRequests += 1;
  const method = String(req.url || "").split("/").at(-1);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, result: method === "getUpdates" ? [{ update_id: 159 }] : { method } }));
});
const relayTelegramPort = await listen(relayTelegramOrigin);
const controlDbPath = path.join(tmp, "custom-relay-control.sqlite");
initializeCloudControlDatabase({ config: { runtimeDataDir: tmp, controlDbPath, backupDir: path.join(tmp, "backups") } });
const registry = new PersistentCloudTenantRegistry({ dbPath: controlDbPath });
const relay = createCloudRelayServer({ registry, telegramApiBaseUrl: `http://127.0.0.1:${relayTelegramPort}`, allowTestTelegramOrigin: true, logSink: () => {} });
const relayPort = await listen(relay.server);
const customConnectorUrl = `ws://127.0.0.1:${relayPort}/connector`;
const enrollment = registry.createEnrollmentCode({ purpose: "enroll" });
const controlHandler = createControlPlaneHttpHandler({ registry, environment: "test", publicBaseDomain: "example.invalid", connectorEndpoint: customConnectorUrl, log: () => {} });
const controlServer = http.createServer((req, res) => void controlHandler(req, res, { clientIp: req.socket.remoteAddress }));
const controlPort = await listen(controlServer);
const customControlUrl = `http://127.0.0.1:${controlPort}/`;
const enrolled = await enrollCloudConnector({ installationId: INSTALL, enrollmentCode: enrollment.code, controlPlaneUrl: customControlUrl, expectedConnectorEndpoint: customConnectorUrl, privateKeyPath: process.env.KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH });
assert.equal(enrolled.connectorEndpoint, customConnectorUrl);
assert.equal((await registry.getTenant(INSTALL))?.publicKeyFingerprint, credential.publicKeyFingerprint, "Custom Relay enrollment must bind the existing local Ed25519 identity");
const assignedPublicUrl = enrolled.assignedPublicUrl;
const relaySettings = {
  telegram_transport_mode: "relay",
  miniapp_public_access_mode: "relay",
  relay_provider: "custom",
  relay_assignment_provider: "custom",
  custom_relay_control_url: customControlUrl,
  custom_relay_connector_url: customConnectorUrl,
  installation_id: INSTALL,
  kourosh_cloud_enabled: "1",
  kourosh_cloud_provisioned: "1",
  kourosh_cloud_assigned_store_id: enrolled.assignedStoreId,
  kourosh_cloud_assigned_public_url: assignedPublicUrl,
  kourosh_cloud_endpoint: customConnectorUrl,
  kourosh_cloud_credential_configured: "1",
  kourosh_cloud_connection_state: "connecting",
};
initializeCloudConnectorRuntime(relaySettings);
await waitFor(() => Boolean(getLocalCloudConnector()?.getStatus().connected), 4000, "custom relay connector");
configureTelegramTransportRuntime(relaySettings);
for (const method of ["getMe", "getUpdates", "sendMessage"]) {
  const result = await callTelegramBotApi(TOKEN, method, method === "getUpdates" ? { offset: 1 } : { chat_id: "1", text: "custom" });
  assert.equal(result.success, true, `${method} through custom Relay`);
}
assert.equal(relayTelegramRequests, 3);

const publicRequest = (requestPath, method = "GET", body = null) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port: relayPort, path: requestPath, method, headers: { host: new URL(assignedPublicUrl).host, "content-type": "application/json" } }, (res) => {
    const chunks = []; res.on("data", (chunk) => chunks.push(chunk)); res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
  });
  req.on("error", reject); if (body === null) req.end(); else req.end(body);
});
for (const role of ["customer", "partner", "staff"]) {
  const result = await publicRequest(`/api/miniapp/${role}/summary`);
  assert.equal(result.status, 200, `${role} through custom Relay`);
  assert.equal(JSON.parse(result.text).source, "local-backend");
}
assert.equal((await publicRequest("/api/settings")).status, 404, "custom Relay must not expose full Local API");

stopCloudConnectorRuntime();
await relay.close();
await close(controlServer);
registry.close();
await close(gateway); await close(selfHostedGateway); await close(tunnelGateway); await close(tunnelServer); await close(api); await close(relayTelegramOrigin); await close(telegramTarget);

console.log(JSON.stringify({
  ok: true,
  telegramModes: ["disabled", "direct", "proxy", "relay"],
  miniAppModes: ["disabled", "self_hosted", "external_tunnel", "relay"],
  directTargetRequests,
  proxyProbeAttempts: proxyProbe.attempts.length,
  proxyFailureDirectFallbackAttempts: 0,
  strategyMatrixCases: matrix.length,
  relayConnectorAttemptsWhenNotRequired: 0,
  localBackendWithoutRelay: "started",
  customRelayEnrollment: "executed",
  customRelayTelegramMethods: ["getMe", "getUpdates", "sendMessage"],
  customRelayMiniAppRoles: ["customer", "partner", "staff"],
  selfHostedMiniApp: "executed",
  externalTunnelMiniApp: "executed",
  customRelayUsesManagedEndpoint: false,
}, null, 2));
