import assert from "node:assert/strict";
import { createCloudRelayServer } from "../cloud/relay-server/relayServer.mjs";
import { MemoryCloudTenantRegistry } from "../cloud/relay-server/tenantRegistry.mjs";
import { validateCloudRelayEnvelopeRuntime } from "../server/cloud/cloudRelayProtocolRuntime.mjs";
import { validateCloudRelayEnvelope } from "../server/cloud/cloudRelayProtocol.ts";

process.env.NODE_ENV = "test";
const INSTALL = "inst_ABCDEFGHIJKLMNOPQRSTUVWX";
const REQUEST = "abcdefghijklmnop";
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const now = Date.now();
const base = { protocolVersion: 1, installationId: INSTALL, requestId: REQUEST, type: "connector_auth_hello", timestamp: new Date(now).toISOString(), expiresAt: new Date(now + 10_000).toISOString(), payload: { publicKeyFingerprint: "ed25519_x", capabilities: [] } };
const cases = [
  { name: "unsupported_version", mutate: (x) => ({ ...x, protocolVersion: 2 }), code: "UNSUPPORTED_PROTOCOL_VERSION" },
  { name: "unknown_type", mutate: (x) => ({ ...x, type: "unknown_type" }), code: "UNKNOWN_MESSAGE_TYPE" },
  { name: "expired", mutate: (x) => ({ ...x, timestamp: new Date(now - 20_000).toISOString(), expiresAt: new Date(now - 1).toISOString() }), code: "EXPIRED_MESSAGE" },
  { name: "far_future", mutate: (x) => ({ ...x, timestamp: new Date(now + 31_000).toISOString(), expiresAt: new Date(now + 40_000).toISOString() }), code: "FUTURE_TIMESTAMP" },
  { name: "expiry_before_timestamp", mutate: (x) => ({ ...x, timestamp: new Date(now + 5_000).toISOString(), expiresAt: new Date(now + 4_000).toISOString() }), code: "INVALID_EXPIRY_ORDER" },
  { name: "ttl_too_large", mutate: (x) => ({ ...x, timestamp: new Date(now).toISOString(), expiresAt: new Date(now + 120_001).toISOString() }), code: "TTL_TOO_LARGE" },
];

for (const testCase of cases) {
  const message = testCase.mutate(base);
  const runtime = validateCloudRelayEnvelopeRuntime(message, undefined, now);
  const typed = validateCloudRelayEnvelope(message, undefined, now);
  assert.equal(runtime.ok, false, `${testCase.name}: runtime must reject`);
  assert.equal(typed.ok, false, `${testCase.name}: TS helper must reject`);
  assert.equal(runtime.code, testCase.code, `${testCase.name}: runtime code`);
  assert.equal(typed.code, testCase.code, `${testCase.name}: TS/runtime parity`);
}

const relay = createCloudRelayServer({ registry: new MemoryCloudTenantRegistry(), logSink: () => {}, limits: { authDeadlineMs: 1500 } });
const port = await listen(relay.server);
const rejectedByActualRelay = async (message) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/connector`);
  const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("Relay did not reject invalid envelope.")); }, 2500);
  ws.addEventListener("open", () => ws.send(JSON.stringify(message)), { once: true });
  ws.addEventListener("close", () => { clearTimeout(timer); resolve(true); }, { once: true });
  ws.addEventListener("error", () => {}, { once: true });
});
for (const testCase of cases) assert.equal(await rejectedByActualRelay(testCase.mutate(base)), true, `${testCase.name}: actual relay rejection`);
await relay.close();
console.log(JSON.stringify({ protocolValidation: "PASS", sharedRuntimeValidator: true, actualRelayClockWindowCases: cases.map((c) => c.name) }, null, 2));
