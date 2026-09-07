import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { MemoryCloudTenantRegistry } from "../cloud/relay-server/tenantRegistry.mjs";
import { createMiniAppGateway } from "./serve-miniapp-gateway.mjs";
import { ensureConnectorCredential } from "../server/cloud/connectorCredentialStore.ts";
import { LocalCloudConnector } from "../server/cloud/localCloudConnector.ts";
import { DirectTelegramTransport } from "../server/telegram/DirectTelegramTransport.ts";
import { resolveCloudConnectorReadiness } from "../server/cloud/cloudConnectorReadiness.ts";

process.env.NODE_ENV = "test";
process.env.TG_PROXY = "";
process.env.HTTPS_PROXY = "";
process.env.HTTP_PROXY = "";

const TOKEN = "123456789:abcdefghijklmnopqrstuvwxyzABCDE";
const INSTALL_A = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
const INSTALL_B = "inst_ZYXWVUTSRQPONMLKJIHGFEDC";
const INSTALL_C = "inst_1234567890abcdefghijklmn";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, timeoutMs = 4000, label = "condition") => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (predicate()) return; await sleep(20); }
  assert.fail(`Timed out waiting for ${label}`);
};
const listen = (server, port = 0) => new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server.address().port)));
const closeHttp = (server) => new Promise((resolve) => server.close(() => resolve()));
const tmpCredential = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-cloud-key-"));
  const identity = ensureConnectorCredential({ privateKeyPath: path.join(dir, "connector.pem") });
  assert(identity);
  assert.equal(fs.statSync(identity.privateKeyPath).mode & 0o777, 0o600);
  return identity;
};
const buildEnvelope = (installationId, type, payload, ttlMs = 10_000, id = randomUUID().replaceAll("-", "")) => {
  const now = Date.now();
  return { protocolVersion: 1, installationId, requestId: id, type, timestamp: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString(), payload };
};

const wssGuardCredential = tmpCredential();
const productionWsConnector = new LocalCloudConnector({
  installationId: INSTALL_A,
  endpoint: "ws://127.0.0.1:65534/connector",
  publicKeyFingerprint: wssGuardCredential.publicKeyFingerprint,
  signChallenge: wssGuardCredential.signChallenge,
  environment: "production",
});
assert.throws(() => productionWsConnector.start(), /requires WSS/);

const telegramRequests = [];
const telegramServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const method = String(req.url || "").split("/").at(-1);
  telegramRequests.push({ method, contentType: String(req.headers["content-type"] || ""), body });
  let seq = null;
  if (String(req.headers["content-type"] || "").includes("application/json") && body.length) {
    try { seq = JSON.parse(body.toString("utf8")).seq ?? null; } catch {}
  }
  if (seq !== null) await sleep((100 - Number(seq)) % 17);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, result: method === "getUpdates" ? [{ update_id: 42, message: { text: "relay" } }] : { method, seq } }));
});
const telegramPort = await listen(telegramServer);
const telegramOrigin = `http://127.0.0.1:${telegramPort}`;

// Direct mode regression can execute without Cloud and without proxy dependencies.
const direct = new DirectTelegramTransport({ apiBaseUrl: telegramOrigin, environment: "test" });
const directGetMe = await direct.request({ botToken: TOKEN, method: "getMe", httpMethod: "GET" });
assert.equal(directGetMe.success, true);
const directSend = await direct.request({ botToken: TOKEN, method: "sendMessage", payload: { chat_id: "1", text: "direct" } });
assert.equal(directSend.success, true);
assert.equal(direct.mode, "direct");

const makeGateway = async (host, tenantLabel) => {
  const api = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const pathname = new URL(req.url || "/", "http://api.invalid").pathname;
    const allowed = pathname === "/api/miniapp/auth" || pathname === "/api/miniapp/me" || pathname.startsWith("/api/miniapp/customer/") || pathname.startsWith("/api/miniapp/partner/") || pathname.startsWith("/api/miniapp/staff/");
    if (pathname.endsWith("/slow")) await sleep(250);
    res.writeHead(allowed ? 200 : 404, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: allowed, tenant: tenantLabel, path: pathname }));
  });
  const apiPort = await listen(api);
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), `kourosh-mini-${tenantLabel}-`));
  fs.mkdirSync(path.join(dist, "assets"));
  fs.writeFileSync(path.join(dist, "miniapp.html"), `<html>${tenantLabel}</html>`);
  fs.writeFileSync(path.join(dist, "kourosh-logo.svg"), "<svg/>");
  fs.writeFileSync(path.join(dist, "assets", "app-12345678.js"), "console.log('mini')");
  const gateway = createMiniAppGateway({ distDir: dist, apiHost: "127.0.0.1", apiPort, publicHost: host, externalProto: "https", logSink: () => {} });
  const port = await listen(gateway);
  return { api, gateway, port };
};

const gatewayA = await makeGateway("store-a.example.invalid", "A");
const gatewayB = await makeGateway("store-b.example.invalid", "B");
const registry = new MemoryCloudTenantRegistry();
const securityEvents = [];
const relay = createCloudRelayServer({
  registry,
  telegramApiBaseUrl: telegramOrigin,
  allowTestTelegramOrigin: true,
  logSink: (event) => securityEvents.push(event),
  limits: { heartbeatTimeoutMs: 3_000, requestTimeoutMs: 2_000, maxPendingPerTenant: 2, maxTelegramBinaryBytes: 64 },
});
const relayPort = await listen(relay.server);
const credA = tmpCredential();
const credB = tmpCredential();
await registry.registerTenant({ installationId: INSTALL_A, publicKeyPem: credA.publicKeyPem, publicKeyFingerprint: credA.publicKeyFingerprint, assignedStoreId: "store-a", assignedPublicUrl: "https://store-a.example.invalid/miniapp.html" });
await registry.registerTenant({ installationId: INSTALL_B, publicKeyPem: credB.publicKeyPem, publicKeyFingerprint: credB.publicKeyFingerprint, assignedStoreId: "store-b", assignedPublicUrl: "https://store-b.example.invalid/miniapp.html" });

const localSecurityEventsA = [];
const connectorA = new LocalCloudConnector({ installationId: INSTALL_A, endpoint: `ws://127.0.0.1:${relayPort}/connector`, publicKeyFingerprint: credA.publicKeyFingerprint, signChallenge: credA.signChallenge, environment: "test", miniAppGatewayOrigin: `http://127.0.0.1:${gatewayA.port}`, heartbeatIntervalMs: 250, backoffBaseMs: 100, backoffMaxMs: 500, logger: (event, meta) => localSecurityEventsA.push({ event, ...(meta || {}) }) });
const connectorB = new LocalCloudConnector({ installationId: INSTALL_B, endpoint: `ws://127.0.0.1:${relayPort}/connector`, publicKeyFingerprint: credB.publicKeyFingerprint, signChallenge: credB.signChallenge, environment: "test", miniAppGatewayOrigin: `http://127.0.0.1:${gatewayB.port}`, heartbeatIntervalMs: 250, backoffBaseMs: 100, backoffMaxMs: 500, logger: () => {} });
connectorA.start(); connectorB.start();
await waitFor(() => connectorA.getStatus().connected && connectorB.getStatus().connected, 4000, "two authenticated tenant connectors");

assert.equal(resolveCloudConnectorReadiness({ kourosh_cloud_enabled: "1", kourosh_cloud_provisioned: "1", installation_id: INSTALL_A, kourosh_cloud_assigned_store_id: "store-a", kourosh_cloud_endpoint: `ws://127.0.0.1:${relayPort}/connector`, kourosh_cloud_credential_configured: "1", kourosh_cloud_connection_state: "connected", kourosh_cloud_telegram_relay_healthy: "1" }, { NODE_ENV: "test" }).state, "connected");
assert.equal(resolveCloudConnectorReadiness({ kourosh_cloud_enabled: "1", kourosh_cloud_provisioned: "1", installation_id: INSTALL_A, kourosh_cloud_assigned_store_id: "store-a", kourosh_cloud_endpoint: `ws://127.0.0.1:${relayPort}/connector`, kourosh_cloud_credential_configured: "1", kourosh_cloud_connection_state: "backoff", kourosh_cloud_last_connected_at: new Date().toISOString() }, { NODE_ENV: "test" }).state, "degraded");

// Local network block: any accidental Local official Telegram request fails. Cloud uses only the mock origin.
const nativeFetch = globalThis.fetch;
let officialTelegramCalls = 0;
globalThis.fetch = async (input, init) => {
  if (String(input).startsWith("https://api.telegram.org")) { officialTelegramCalls += 1; throw new Error("LOCAL_TELEGRAM_NETWORK_BLOCKED"); }
  return nativeFetch(input, init);
};

for (const method of ["getMe", "getUpdates", "sendMessage", "setChatMenuButton"]) {
  const result = await connectorA.requestTelegram({ botToken: TOKEN, method, httpMethod: method === "getMe" ? "GET" : "POST", body: method === "getUpdates" ? { offset: 1, timeout: 25 } : { chat_id: "1", text: "relay" }, timeoutMs: 2_000 });
  assert.equal(result.success, true, `${method} through Cloud Relay`);
  if (method === "getUpdates") assert.equal(result.data.result[0].update_id, 42);
}
const binary = Buffer.from("binary-relay-test");
for (const [method, fieldName] of [["sendPhoto", "photo"], ["sendDocument", "document"]]) {
  const result = await connectorA.requestTelegram({ botToken: TOKEN, method, multipart: { fields: { chat_id: "1", caption: "x" }, attachment: { fieldName, filename: `${fieldName}.bin`, mimeType: "application/octet-stream", encoding: "base64", data: binary.toString("base64") } }, timeoutMs: 2_000 });
  assert.equal(result.success, true, `${method} multipart through Cloud Relay`);
}
assert.equal(officialTelegramCalls, 0, "cloud_relay Local process must not call official Telegram origin");
assert(telegramRequests.some((r) => r.method === "sendPhoto" && r.contentType.includes("multipart/form-data")));
assert(telegramRequests.some((r) => r.method === "sendDocument" && r.contentType.includes("multipart/form-data")));
await assert.rejects(
  connectorA.requestTelegram({ botToken: TOKEN, method: "sendDocument", multipart: { fields: { chat_id: "1" }, attachment: { fieldName: "document", filename: "too-large.bin", mimeType: "application/octet-stream", encoding: "base64", data: Buffer.alloc(65, 7).toString("base64") } }, timeoutMs: 2_000 }),
  (error) => error?.code === "PAYLOAD_TOO_LARGE",
  "Cloud Relay must reject Telegram binary payloads above the configured bound",
);

// 100 concurrent, intentionally out-of-order Telegram responses correlate correctly.
await connectorA.bindTelegramCredential(TOKEN);
const firstCloudConnectionA = (await registry.getTenant(INSTALL_A)).activeConnection;
assert.equal(firstCloudConnectionA.telegramToken, TOKEN, "Bot token may exist only in active Cloud connection memory");
const concurrent = await Promise.all(Array.from({ length: 100 }, (_, seq) => connectorA.requestTelegram({ botToken: TOKEN, method: "sendMessage", body: { chat_id: "1", text: String(seq), seq }, timeoutMs: 3_000 })));
for (let seq = 0; seq < concurrent.length; seq += 1) assert.equal(concurrent[seq].data.result.seq, seq);
assert.equal(connectorA.getStatus().pendingRequests, 0);

const publicRequest = (host, requestPath, method = "GET", body = null) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port: relayPort, path: requestPath, method, headers: { host, "content-type": "application/json" } }, (res) => {
    const chunks = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
  });
  req.on("error", reject); if (body !== null) req.end(body); else req.end();
});

// Host-based tenant isolation + shared Mini App Gateway policy.
for (const [host, expectedTenant] of [["store-a.example.invalid", "A"], ["store-b.example.invalid", "B"]]) {
  const auth = await publicRequest(host, "/api/miniapp/auth", "POST", "{}");
  assert.equal(auth.status, 200); assert.equal(JSON.parse(auth.text).tenant, expectedTenant);
  for (const role of ["customer", "partner", "staff"]) {
    const read = await publicRequest(host, `/api/miniapp/${role}/summary`);
    assert.equal(read.status, 200); assert.equal(JSON.parse(read.text).tenant, expectedTenant);
  }
  const staticPage = await publicRequest(host, "/miniapp.html");
  assert.equal(staticPage.status, 200); assert(staticPage.text.includes(expectedTenant));
}
assert.equal((await publicRequest("store-a.example.invalid", "/api/settings")).status, 404);
assert.equal((await publicRequest("store-a.example.invalid", "/package.json")).status, 404);
assert.equal((await publicRequest("store-a.example.invalid", "/uploads/customer.jpg")).status, 404);
assert.equal((await publicRequest("store-a.example.invalid", "/server/app.ts")).status, 404);
assert.equal((await publicRequest("store-a.example.invalid", "/.env")).status, 404);
assert.equal((await publicRequest("store-a.example.invalid", "/api/miniapp/customer/summary", "POST", "{}")).status, 405);

// Relay backpressure is bounded per tenant; excess public requests fail instead of growing memory.
const slowStatuses = await Promise.all(Array.from({ length: 3 }, () => publicRequest("store-a.example.invalid", "/api/miniapp/customer/slow").then((r) => r.status)));
assert.equal(slowStatuses.filter((status) => status === 503).length, 1);
assert.equal(slowStatuses.filter((status) => status === 200).length, 2);

// Unknown correlation IDs are rejected; duplicate responses are ignored/logged without taking over the tenant.
const forgedResponseId = randomUUID().replaceAll("-", "");
const forgedResponse = buildEnvelope(INSTALL_B, "miniapp_http_response", { status: 200, headers: {}, bodyBase64: "" }, 10_000, forgedResponseId);
connectorB.ws.send(JSON.stringify(forgedResponse));
await waitFor(() => securityEvents.some((event) => event.event === "protocol_rejected" && event.reason === "unknown_request_id"), 1500, "unknown response rejection");
connectorB.ws.send(JSON.stringify(forgedResponse));
await waitFor(() => securityEvents.some((event) => event.event === "protocol_rejected" && event.reason === "duplicate_response"), 1500, "duplicate response log");
assert.equal(connectorB.getStatus().connected, true);

// Unauthenticated connector cannot replace the authenticated tenant connection.
const badCredential = tmpCredential();
const invalidTakeover = new LocalCloudConnector({ installationId: INSTALL_A, endpoint: `ws://127.0.0.1:${relayPort}/connector`, publicKeyFingerprint: credA.publicKeyFingerprint, signChallenge: badCredential.signChallenge, environment: "test", backoffBaseMs: 5_000, logger: () => {} });
invalidTakeover.start(); await sleep(250);
assert.equal(connectorA.getStatus().connected, true, "unauthenticated takeover must not replace active connector");
assert.notEqual(invalidTakeover.getStatus().state, "connected"); invalidTakeover.stop();
assert(securityEvents.some((event) => event.event === "connector_auth_failed"));

// A newly authenticated duplicate replaces the old connection only after auth succeeds.
const replacementA = new LocalCloudConnector({ installationId: INSTALL_A, endpoint: `ws://127.0.0.1:${relayPort}/connector`, publicKeyFingerprint: credA.publicKeyFingerprint, signChallenge: credA.signChallenge, environment: "test", miniAppGatewayOrigin: `http://127.0.0.1:${gatewayA.port}`, heartbeatIntervalMs: 250, backoffBaseMs: 5_000, logger: () => {} });
replacementA.start(); await waitFor(() => replacementA.getStatus().connected, 3000, "authenticated replacement");
await waitFor(() => !connectorA.getStatus().connected, 1500, "old connector replacement close");
assert(securityEvents.some((event) => event.event === "connector_replaced"));
assert.equal(firstCloudConnectionA.telegramToken, null, "disconnect/replacement must clear in-memory Bot token");
connectorA.stop();

// Tampered tenant envelope is rejected; tenant B remains isolated/connected.
const tamper = buildEnvelope(INSTALL_B, "heartbeat", { connectionState: "connected" });
replacementA.ws.send(JSON.stringify(tamper));
await waitFor(() => !replacementA.getStatus().connected, 1500, "tampered installation disconnect");
assert.equal(connectorB.getStatus().connected, true);
replacementA.stop();

// Challenge replay is rejected.
const credC = tmpCredential();
await registry.registerTenant({ installationId: INSTALL_C, publicKeyPem: credC.publicKeyPem, publicKeyFingerprint: credC.publicKeyFingerprint, assignedPublicUrl: "https://store-c.example.invalid/miniapp.html" });

const malformedWs = new WebSocket(`ws://127.0.0.1:${relayPort}/connector`);
let malformedClosed = false; malformedWs.addEventListener("close", () => { malformedClosed = true; }, { once: true });
await new Promise((resolve, reject) => { malformedWs.addEventListener("open", resolve, { once: true }); malformedWs.addEventListener("error", reject, { once: true }); });
malformedWs.send(JSON.stringify(buildEnvelope(INSTALL_C, "connector_auth_hello", {})));
await waitFor(() => malformedClosed, 1500, "malformed hello rejection");

const wrongVersionWs = new WebSocket(`ws://127.0.0.1:${relayPort}/connector`);
let wrongVersionClosed = false; wrongVersionWs.addEventListener("close", () => { wrongVersionClosed = true; }, { once: true });
await new Promise((resolve, reject) => { wrongVersionWs.addEventListener("open", resolve, { once: true }); wrongVersionWs.addEventListener("error", reject, { once: true }); });
const wrongVersionHello = buildEnvelope(INSTALL_C, "connector_auth_hello", { publicKeyFingerprint: credC.publicKeyFingerprint, capabilities: ["telegram_api"] }); wrongVersionHello.protocolVersion = 99;
wrongVersionWs.send(JSON.stringify(wrongVersionHello));
await waitFor(() => wrongVersionClosed, 1500, "unknown protocol version rejection");

const rawWs = new WebSocket(`ws://127.0.0.1:${relayPort}/connector`);
const rawMessages = []; rawWs.addEventListener("message", (event) => rawMessages.push(JSON.parse(String(event.data))));
await new Promise((resolve, reject) => { rawWs.addEventListener("open", resolve, { once: true }); rawWs.addEventListener("error", reject, { once: true }); });
rawWs.send(JSON.stringify(buildEnvelope(INSTALL_C, "connector_auth_hello", { publicKeyFingerprint: credC.publicKeyFingerprint, capabilities: ["telegram_api"] })));
await waitFor(() => rawMessages.some((m) => m.type === "connector_auth_challenge"), 1500, "auth challenge");
const challenge = rawMessages.find((m) => m.type === "connector_auth_challenge");
const proof = `KOUROSH-CLOUD-RELAY-V1\n${INSTALL_C}\n${challenge.payload.challengeId}\n${challenge.payload.nonce}\n${challenge.expiresAt}`;
const authResponse = buildEnvelope(INSTALL_C, "connector_auth_response", { challengeId: challenge.payload.challengeId, signature: credC.signChallenge(proof) });
rawWs.send(JSON.stringify(authResponse));
await waitFor(() => rawMessages.some((m) => m.type === "connector_ready"), 1500, "connector ready");
let replayClosed = false; rawWs.addEventListener("close", () => { replayClosed = true; }, { once: true }); rawWs.send(JSON.stringify(authResponse));
await waitFor(() => replayClosed, 1500, "replayed auth rejection");

// Expired challenge cannot authenticate.
const relayExpired = createCloudRelayServer({ registry, logSink: () => {}, limits: { challengeTtlMs: 100, heartbeatTimeoutMs: 3000 } });
const expiredPort = await listen(relayExpired.server);
const expiredWs = new WebSocket(`ws://127.0.0.1:${expiredPort}/connector`); const expiredMessages = [];
expiredWs.addEventListener("message", (event) => expiredMessages.push(JSON.parse(String(event.data))));
await new Promise((resolve, reject) => { expiredWs.addEventListener("open", resolve, { once: true }); expiredWs.addEventListener("error", reject, { once: true }); });
expiredWs.send(JSON.stringify(buildEnvelope(INSTALL_C, "connector_auth_hello", { publicKeyFingerprint: credC.publicKeyFingerprint, capabilities: ["telegram_api"] })));
await waitFor(() => expiredMessages.length > 0, 1500, "expiring challenge"); const expChallenge = expiredMessages[0];
await sleep(1100);
const expProof = `KOUROSH-CLOUD-RELAY-V1\n${INSTALL_C}\n${expChallenge.payload.challengeId}\n${expChallenge.payload.nonce}\n${expChallenge.expiresAt}`;
let expiredClosed = false; expiredWs.addEventListener("close", () => { expiredClosed = true; }, { once: true });
expiredWs.send(JSON.stringify(buildEnvelope(INSTALL_C, "connector_auth_response", { challengeId: expChallenge.payload.challengeId, signature: credC.signChallenge(expProof) })));
await waitFor(() => expiredClosed, 1500, "expired challenge rejection"); await relayExpired.close();

// Tenant offline public request is bounded and generic.
connectorB.stop(); await waitFor(() => !connectorB.getStatus().connected, 1000, "tenant B stopped");
const offline = await publicRequest("store-b.example.invalid", "/api/miniapp/customer/summary");
assert.equal(offline.status, 503); assert.equal(offline.text, "Service Unavailable");

// Reconnect/backoff restores the authenticated tunnel without restarting Kourosh core.
const reconnectRegistry = new MemoryCloudTenantRegistry(); const reconnectCred = tmpCredential();
await reconnectRegistry.registerTenant({ installationId: INSTALL_A, publicKeyPem: reconnectCred.publicKeyPem, publicKeyFingerprint: reconnectCred.publicKeyFingerprint, assignedPublicUrl: "https://store-a.example.invalid/miniapp.html" });
let relayOne = createCloudRelayServer({ registry: reconnectRegistry, logSink: () => {} }); const reconnectPort = await listen(relayOne.server);
const reconnectConnector = new LocalCloudConnector({ installationId: INSTALL_A, endpoint: `ws://127.0.0.1:${reconnectPort}/connector`, publicKeyFingerprint: reconnectCred.publicKeyFingerprint, signChallenge: reconnectCred.signChallenge, environment: "test", heartbeatIntervalMs: 200, backoffBaseMs: 80, backoffMaxMs: 150, logger: () => {} }); reconnectConnector.start();
await waitFor(() => reconnectConnector.getStatus().connected, 2000, "initial reconnect test connection"); await relayOne.close();
await waitFor(() => reconnectConnector.getStatus().state === "backoff", 1500, "connector backoff");
relayOne = createCloudRelayServer({ registry: reconnectRegistry, logSink: () => {} }); await listen(relayOne.server, reconnectPort);
await waitFor(() => reconnectConnector.getStatus().connected, 3000, "connector reauthentication"); reconnectConnector.stop(); await relayOne.close();

// Missing application heartbeats makes tenant stale and clears active connection.
const staleRegistry = new MemoryCloudTenantRegistry(); const staleCred = tmpCredential();
await staleRegistry.registerTenant({ installationId: INSTALL_A, publicKeyPem: staleCred.publicKeyPem, publicKeyFingerprint: staleCred.publicKeyFingerprint, assignedPublicUrl: "https://store-a.example.invalid/miniapp.html" });
const staleRelay = createCloudRelayServer({ registry: staleRegistry, logSink: () => {}, limits: { heartbeatTimeoutMs: 350 } }); const stalePort = await listen(staleRelay.server);
const staleConnector = new LocalCloudConnector({ installationId: INSTALL_A, endpoint: `ws://127.0.0.1:${stalePort}/connector`, publicKeyFingerprint: staleCred.publicKeyFingerprint, signChallenge: staleCred.signChallenge, environment: "test", heartbeatIntervalMs: 5_000, backoffBaseMs: 5_000, logger: () => {} }); staleConnector.start();
await waitFor(() => staleConnector.getStatus().connected, 1500, "stale connector initial auth"); await waitFor(() => !staleConnector.getStatus().connected, 2000, "stale heartbeat disconnect"); staleConnector.stop(); await staleRelay.close();

assert.equal(JSON.stringify(securityEvents).includes(TOKEN), false, "Cloud security logs must never contain Bot token");
assert.equal(JSON.stringify(localSecurityEventsA).includes(TOKEN), false, "Local connector logs must never contain Bot token");
globalThis.fetch = nativeFetch;
await relay.close();
await closeHttp(gatewayA.gateway); await closeHttp(gatewayA.api); await closeHttp(gatewayB.gateway); await closeHttp(gatewayB.api); await closeHttp(telegramServer);

console.log(JSON.stringify({
  ok: true,
  directMode: "executed",
  cloudTelegramMethods: ["getMe", "getUpdates", "sendMessage", "setChatMenuButton", "sendPhoto", "sendDocument"],
  concurrentCorrelationRequests: 100,
  miniAppRoles: ["customer", "partner", "staff"],
  miniAppBackpressure: "executed",
  telegramBinaryLimit: "executed",
  forbiddenStaticPaths: ["package.json", "uploads", "server", ".env"],
  unknownAndDuplicateResponses: "executed",
  officialTelegramCallsFromBlockedLocalPath: officialTelegramCalls,
  authCases: ["valid", "invalid_signature", "malformed_hello", "unknown_protocol_version", "challenge_replay", "expired_challenge", "duplicate_connection", "unauthenticated_takeover", "installation_tamper"],
  productionWssGuard: "executed",
  tokenMemoryCleanupAndLogRedaction: "executed",
  canonicalDegradedReadiness: "executed",
  reconnect: "executed",
  heartbeatStaleCleanup: "executed"
}, null, 2));
