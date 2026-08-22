import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import edge, { deriveTelegramSubjectKey, sealEdgeSession } from "../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");
const installationId = `inst_${b64u(randomBytes(18))}`;
const tenantId = "tenant-v192-offline";
const botId = "123456789";
const publicHost = "miniapp.v192.example";
const liveOrigin = "https://live-miniapp.v192.example";

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}
class FakeD1 {
  constructor(tenant) { this.tenant = tenant; this.snapshots = new Map(); }
  prepare(sql) { return new FakeStatement(this, sql); }
  key(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) {
      return this.tenant.public_host.toLowerCase() === String(args[0]).toLowerCase() && this.tenant.status === "active" ? this.tenant : null;
    }
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      return this.tenant.installation_id === String(args[0]) && this.tenant.status === "active" ? this.tenant : null;
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

const tenantRow = {
  tenant_id: tenantId,
  installation_id: installationId,
  credential_version: 1,
  installation_public_key_pem: "unused-read-only-test",
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
const generatedAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const payload = {
  profile: { displayName: "Offline User" },
  account: { signedBalance: 1250000, code: "debtor", label: "بدهکار به فروشگاه", amount: 1250000, totalDebit: 1250000, totalCredit: 0, recentEntries: [] },
  installments: { active: [], recentClosed: [], details: [] },
  purchases: [],
  invoices: [],
};
db.snapshots.set(db.key(tenantId, "customer", subjectKey), {
  tenant_id: tenantId,
  subject_kind: "customer",
  subject_key: subjectKey,
  installation_id: installationId,
  snapshot_version: 192001,
  schema_version: "1",
  state: "active",
  generated_at: generatedAt,
  received_at: generatedAt,
  authorization_valid_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  payload_json: JSON.stringify(payload),
  content_hash: "a".repeat(64),
});

const identity = { kind: "customer", subjectId: 1, displayName: "Offline User", telegramUserId, capabilities: ["customer:read_own"] };
const token = await sealEdgeSession(env, {
  v: 1,
  tenantId,
  installationId,
  botId,
  publicHost,
  subjectKey,
  telegramUserId,
  identity,
  liveOrigin,
  localSessionToken: "local-session-that-is-now-offline",
  initData: null,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60 * 60 * 1000,
});
const request = () => new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${token}` } });
const originalFetch = globalThis.fetch;
try {
  // A Cloudflare/Tunnel-style HTML error must be treated as Live unavailable, not
  // forwarded to the Mini App as an invalid service response.
  globalThis.fetch = async () => new Response("<!doctype html><title>origin offline</title>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
  let response = await edge.fetch(request(), env);
  let body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(response.headers.get("x-kourosh-snapshot-version"), "192001");
  assert.equal(response.headers.get("x-kourosh-snapshot-generated-at"), generatedAt);
  assert.equal(body.data.customer.fullName, "Offline User");

  globalThis.fetch = async () => new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } });
  response = await edge.fetch(request(), env);
  body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(body.data.customer.fullName, "Offline User");
} finally {
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({
  status: "PASS",
  scenarios: {
    invalidHtmlLiveResponse: "snapshot_fallback",
    tunnelHtml502: "snapshot_fallback",
    snapshotGeneratedAtHeader: generatedAt,
  },
}, null, 2));
