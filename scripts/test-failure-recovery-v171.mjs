import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import edge, { deriveTelegramSubjectKey, sealEdgeSession } from "../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");
const installationId = `inst_${b64u(randomBytes(18))}`;
const tenantId = "tenant-recovery";
const botId = "123456789";
const publicHost = "miniapp.recovery.example";
const liveOrigin = "https://live-recovery.example";

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}
class FakeD1 {
  constructor(tenant) {
    this.tenant = tenant;
    this.snapshots = new Map();
  }
  prepare(sql) { return new FakeStatement(this, sql); }
  key(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) {
      return this.tenant.status === "active" && this.tenant.public_host.toLowerCase() === String(args[0]).toLowerCase() ? this.tenant : null;
    }
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      return this.tenant.status === "active" && this.tenant.installation_id === String(args[0]) ? this.tenant : null;
    }
    if (sql.includes("FROM subject_snapshots")) return this.snapshots.get(this.key(args[0], args[1], args[2])) || null;
    throw new Error(`Unhandled first SQL: ${sql}`);
  }
  async run(sql) {
    if (sql.startsWith("DELETE FROM snapshot_sync_replays")) return { meta: { changes: 0 } };
    if (sql.startsWith("INSERT OR IGNORE INTO snapshot_sync_replays")) return { meta: { changes: 1 } };
    if (sql.startsWith("INSERT INTO subject_snapshots")) return { meta: { changes: 1 } };
    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}
class ThrowingD1 {
  prepare() { throw Object.assign(new Error("D1 unavailable"), { code: "D1_UNAVAILABLE" }); }
}

const tenantRow = {
  tenant_id: tenantId,
  installation_id: installationId,
  credential_version: 1,
  installation_public_key_pem: "unused-for-read-tests",
  bot_id: botId,
  public_host: publicHost,
  live_origin: liveOrigin,
  status: "active",
};
const db = new FakeD1(tenantRow);
const env = {
  KOUROSH_EDGE_DB: db,
  KOUROSH_EDGE_SESSION_KEY: b64u(randomBytes(32)),
  KOUROSH_EDGE_SUBJECT_PEPPER: b64u(randomBytes(32)),
  KOUROSH_EDGE_LIVE_TIMEOUT_MS: "500",
};
const telegramUserId = "778899";
const subjectKey = deriveTelegramSubjectKey(env, tenantId, botId, telegramUserId);
const baseData = {
  profile: { displayName: "Recovery Snapshot" },
  account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0, totalDebit: 0, totalCredit: 0, recentEntries: [] },
  installments: { active: [], recentClosed: [], details: [] },
  purchases: [],
  invoices: [],
};
const writeSnapshot = ({ generatedAt = new Date().toISOString(), validUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(), version = 1 } = {}) => {
  db.snapshots.set(db.key(tenantId, "customer", subjectKey), {
    tenant_id: tenantId,
    subject_kind: "customer",
    subject_key: subjectKey,
    installation_id: installationId,
    snapshot_version: version,
    schema_version: "1",
    state: "active",
    generated_at: generatedAt,
    received_at: generatedAt,
    authorization_valid_until: validUntil,
    payload_json: JSON.stringify(baseData),
    content_hash: "a".repeat(64),
  });
};
writeSnapshot();

const identity = { kind: "customer", subjectId: 0, displayName: "Recovery Snapshot", telegramUserId, capabilities: ["customer:read_own"] };
const sessionBase = {
  v: 1, tenantId, installationId, botId, publicHost, subjectKey, telegramUserId, identity, liveOrigin,
  localSessionToken: "local-session", initData: null, issuedAt: Date.now(), expiresAt: Date.now() + 60 * 60 * 1000,
};
const liveToken = await sealEdgeSession(env, sessionBase);
const requestFor = (token = liveToken) => new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${token}` } });
const json = async (response) => ({ response, body: await response.json() });

const originalFetch = globalThis.fetch;
try {
  // Store shutdown / Internet outage / Tunnel disconnect are all transport-unavailable states.
  for (const [scenario, error] of [
    ["store_shutdown", Object.assign(new TypeError("connect ECONNREFUSED"), { code: "ECONNREFUSED" })],
    ["internet_outage", new TypeError("fetch failed")],
    ["tunnel_disconnect", Object.assign(new TypeError("connection reset"), { code: "ECONNRESET" })],
  ]) {
    globalThis.fetch = async () => { throw error; };
    const result = await json(await edge.fetch(requestFor(), env));
    assert.equal(result.response.status, 200, scenario);
    assert.equal(result.response.headers.get("x-kourosh-data-source"), "snapshot", scenario);
    assert.equal(result.body.data.customer.fullName, "Recovery Snapshot", scenario);
  }

  // Store restart: a session created offline can re-authenticate and return to Live.
  const offlineToken = await sealEdgeSession(env, { ...sessionBase, localSessionToken: null, initData: "encrypted-init-data" });
  let restartCalls = 0;
  globalThis.fetch = async (target) => {
    restartCalls += 1;
    if (String(target).endsWith("/api/miniapp/auth")) {
      return new Response(JSON.stringify({ success: true, data: { sessionToken: "recovered", identity: { ...identity, subjectId: 1 }, expiresAt: new Date(Date.now() + 60_000).toISOString() } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, data: { customer: { id: 1, fullName: "RECOVERED LIVE" }, account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0 }, installments: { activeCount: 0, overdueCount: 0, next: null }, lastPurchase: null } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  let result = await json(await edge.fetch(requestFor(offlineToken), env));
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(result.body.data.customer.fullName, "RECOVERED LIVE");
  assert.equal(restartCalls, 2);

  // D1 unavailable + Store unavailable must be explicit 503, never generic 500 or partial data.
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  result = await json(await edge.fetch(requestFor(), { ...env, KOUROSH_EDGE_DB: new ThrowingD1() }));
  assert.equal(result.response.status, 503);
  assert.equal(result.body.code, "MINIAPP_EDGE_STORAGE_UNAVAILABLE");
  assert.equal(result.response.headers.get("retry-after"), "2");

  // D1 unavailable does not block a valid already-authenticated Live path.
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { customer: { id: 1, fullName: "LIVE WITHOUT D1" }, account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0 }, installments: { activeCount: 0, overdueCount: 0, next: null }, lastPurchase: null } }), { status: 200, headers: { "content-type": "application/json" } });
  result = await json(await edge.fetch(requestFor(), { ...env, KOUROSH_EDGE_DB: new ThrowingD1() }));
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get("x-kourosh-data-source"), "live");

  // Snapshot missing: fail closed.
  db.snapshots.clear();
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  result = await json(await edge.fetch(requestFor(), env));
  assert.equal(result.response.status, 503);
  assert.equal(result.body.code, "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE");

  // Snapshot stale/expired: fail closed and still expose provenance for truthful UI.
  writeSnapshot({ generatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), validUntil: new Date(Date.now() - 1_000).toISOString(), version: 2 });
  result = await json(await edge.fetch(requestFor(), env));
  assert.equal(result.response.status, 503);
  assert.equal(result.body.code, "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED");
  assert.equal(result.response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(result.response.headers.get("x-kourosh-snapshot-version"), "2");
} finally {
  globalThis.fetch = originalFetch;
}

// Worker/Cloud/Telegram failures are external and must not precede the Local listener.
const lifecycle = fs.readFileSync("server/bootstrap/serverLifecycle.ts", "utf8");
const listenAt = lifecycle.indexOf("app.listen(port, bindHost");
assert.ok(listenAt >= 0);
for (const marker of [
  "initializeCloudConnectorRuntime(runtimeSettings",
  "configureTelegramTransportRuntime(runtimeSettings",
  "autoConfigureTelegramUpdateMode()",
  "startTelegramPolling()",
]) assert.ok(lifecycle.indexOf(marker) > listenAt, `${marker} must be optional after Local listener`);
assert.match(lifecycle, /Local Kourosh will continue without Relay/);
assert.match(lifecycle, /Local Kourosh will continue without Telegram/);
assert.match(lifecycle, /Local Kourosh remains available/);

// Local launcher must not depend on Edge/Worker/D1 deployment readiness.
const bat = fs.readFileSync("start_https.bat", "utf8");
assert.match(bat, /Local Kourosh does not wait for Mini App build, Tunnel or Cloud connectivity/i);
assert.doesNotMatch(bat, /wrangler|cloudflare pages deploy|d1 execute/i);

console.log(JSON.stringify({
  status: "PASS",
  scenarios: {
    storeShutdown: "snapshot_fallback",
    internetOutage: "snapshot_fallback",
    tunnelDisconnect: "snapshot_fallback",
    storeRestart: "live_recovery",
    d1UnavailableOffline: "503_retryable_fail_closed",
    d1UnavailableLive: "live_continues",
    snapshotMissing: "503_fail_closed",
    snapshotExpired: "503_fail_closed_with_provenance",
    workerCloudFailure: "local_runtime_independent",
    telegramTimeoutFailure: "local_listener_independent",
  },
}, null, 2));
