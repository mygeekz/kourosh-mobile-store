import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import edge, { deriveTelegramSubjectKey, sealEdgeSession } from "../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");
const ids = {
  tenantId: "tenant-v362-test",
  installationId: `inst_${b64u(Buffer.from("v362-manager-snapshot"))}`.slice(0, 29),
  botId: "123456789",
  publicHost: "miniapp.v362.example",
  liveOrigin: "https://live.v362.example",
};
if (!/^inst_[A-Za-z0-9_-]{24}$/.test(ids.installationId)) throw new Error(`bad installation id ${ids.installationId}`);

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  first() { return this.db.first(this.sql, this.args); }
  run() { return this.db.run(this.sql, this.args); }
}
class D1 {
  constructor() {
    this.tenant = {
      tenant_id: ids.tenantId,
      installation_id: ids.installationId,
      credential_version: 1,
      installation_public_key_pem: "unused",
      bot_id: ids.botId,
      public_host: ids.publicHost,
      live_origin: ids.liveOrigin,
      status: "active",
    };
    this.manager = new Map();
  }
  prepare(sql) { return new Statement(this, sql); }
  key(tenant, subject) { return `${tenant}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) return String(args[0]) === ids.installationId ? this.tenant : null;
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) return String(args[0]).toLowerCase() === ids.publicHost ? this.tenant : null;
    if (sql.includes("FROM manager_snapshots")) return this.manager.get(this.key(args[0], args[1])) || null;
    if (sql.includes("FROM subject_snapshots")) return null;
    throw new Error(`Unhandled first SQL: ${sql}`);
  }
  async run(sql) {
    if (sql.startsWith("DELETE FROM snapshot_sync_replays")) return { meta: { changes: 0 } };
    if (sql.startsWith("INSERT OR IGNORE INTO snapshot_sync_replays")) return { meta: { changes: 1 } };
    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}

const db = new D1();
const env = {
  KOUROSH_EDGE_DB: db,
  KOUROSH_EDGE_SESSION_KEY: b64u(randomBytes(32)),
  KOUROSH_EDGE_SUBJECT_PEPPER: b64u(randomBytes(32)),
  KOUROSH_EDGE_LIVE_TIMEOUT_MS: "1000",
};
const telegramId = "930001";
const subjectKey = deriveTelegramSubjectKey(env, ids.tenantId, ids.botId, telegramId);
const now = Date.now();
const managerData = {
  profile: { displayName: "مدیر تست", roleName: "Manager" },
  permissions: ["dashboard.read", "sales.read", "customers.read", "customers.ledger.read", "partners.read", "partners.ledger.read", "installments.read", "repairs.read", "inventory.read"],
  dashboard: { generatedAt: new Date(now).toISOString(), widgets: { sales: { todayAmount: 1200000 } } },
  sales: { today: { totalRevenue: 1200000, totalTransactions: 2, averageSaleValue: 600000 } },
  customers: {
    directory: { items: [{ id: 10, fullName: "مشتری تست", currentBalance: 500000 }], summary: { total: 1 } },
    details: { "10": { id: 10, fullName: "مشتری تست", currentBalance: 500000 } },
    ledger: { "10": { items: [{ id: 1, description: "فروش", debit: 500000, credit: 0, balance: 500000 }], page: 1, pageSize: 20, total: 1 } },
    purchases: {}, installments: {},
  },
  partners: {
    directory: { items: [{ id: 20, name: "همکار تست", currentBalance: -300000 }], summary: { total: 1 } },
    details: { "20": { id: 20, name: "همکار تست", currentBalance: -300000 } },
    ledger: {}, purchases: {}, settlements: {}, accounting: {},
  },
  dues: {}, installmentDetails: {}, repairs: { items: [] }, inventoryPhones: { items: [] }, notifications: { items: [], unreadCount: 0 },
};
db.manager.set(db.key(ids.tenantId, subjectKey), {
  tenant_id: ids.tenantId,
  subject_kind: "manager",
  subject_key: subjectKey,
  installation_id: ids.installationId,
  snapshot_version: 362001,
  schema_version: "1",
  state: "active",
  generated_at: new Date(now - 60_000).toISOString(),
  received_at: new Date(now - 59_000).toISOString(),
  authorization_valid_until: new Date(now + 30 * 60_000).toISOString(),
  payload_json: JSON.stringify(managerData),
  content_hash: "a".repeat(64),
});

const identity = {
  kind: "staff", subjectId: 999, displayName: "مدیر تست", telegramUserId: telegramId, roleName: "Manager",
  capabilities: ["staff:executive:read"], permissions: [...managerData.permissions],
  workspaces: [{ kind: "manager", subjectId: 999, displayName: "مدیر تست", roleName: "Manager", capabilities: ["staff:executive:read"], permissions: [...managerData.permissions] }],
};
const token = await sealEdgeSession(env, {
  v: 1, tenantId: ids.tenantId, installationId: ids.installationId, botId: ids.botId, publicHost: ids.publicHost,
  subjectKey, telegramUserId: telegramId, identity, liveOrigin: ids.liveOrigin, localSessionToken: "local-session", initData: null,
  issuedAt: now, expiresAt: now + 30 * 60_000,
});
const request = (path, method = "GET") => new Request(`https://${ids.publicHost}${path}`, { method, headers: { authorization: `Bearer ${token}`, origin: `https://${ids.publicHost}` } });
const json = async (response) => ({ response, body: await response.json() });
const withFetch = async (fn, op) => { const prev = globalThis.fetch; globalThis.fetch = fn; try { return await op(); } finally { globalThis.fetch = prev; } };
const live = (status, payload = {}) => async () => new Response(JSON.stringify({ success: status >= 200 && status < 300, ...(status >= 200 && status < 300 ? { data: payload } : { code: payload.code || "LIVE_FAIL", message: "live failed" }) }), { status, headers: { "content-type": "application/json" } });

// Live 5xx -> manager snapshot read.
await withFetch(live(503), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/dashboard"), env));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(body.data.widgets.sales.todayAmount, 1200000);
});

// Customer ledger is readable from the permission-filtered manager snapshot.
await withFetch(live(503), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/customers/10/ledger?page=1&pageSize=20"), env));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
  assert.equal(body.data.items[0].balance, 500000);
});

// Live 403 is authoritative and must NOT fall back to stale cloud authority.
await withFetch(live(403, { code: "MINIAPP_MANAGER_PERMISSION_REQUIRED" }), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/dashboard"), env));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal(body.code, "MINIAPP_MANAGER_PERMISSION_REQUIRED");
});

// Profit permission is enforced from the snapshot itself, not from UI/session metadata.
await withFetch(live(503), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/partners/20/accounting-breakdown"), env));
  assert.equal(response.status, 403);
  assert.equal(body.code, "MINIAPP_MANAGER_PERMISSION_REQUIRED");
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
});

// Manager mutation remains live-only and never mutates a snapshot.
await withFetch(async () => { throw Object.assign(new Error("offline"), { code: "ECONNREFUSED" }); }, async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/notifications/read-all", "POST"), env));
  assert.equal(response.status, 503);
  assert.equal(body.code, "MINIAPP_STAFF_OFFLINE_UNAVAILABLE");
  assert.notEqual(response.headers.get("x-kourosh-data-source"), "snapshot");
});

// An existing Manager session cannot keep reading an expired authorization lease.
const activeManager = db.manager.get(db.key(ids.tenantId, subjectKey));
db.manager.set(db.key(ids.tenantId, subjectKey), { ...activeManager, authorization_valid_until: new Date(now - 60_000).toISOString() });
await withFetch(live(503), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/dashboard"), env));
  assert.equal(response.status, 503);
  assert.equal(body.code, "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED");
});
db.manager.set(db.key(ids.tenantId, subjectKey), activeManager);

// Revoked snapshot is fail-closed.
const current = db.manager.get(db.key(ids.tenantId, subjectKey));
db.manager.set(db.key(ids.tenantId, subjectKey), { ...current, state: "revoked", payload_json: null, snapshot_version: 362002 });
await withFetch(live(503), async () => {
  const { response, body } = await json(await edge.fetch(request("/api/miniapp/manager/dashboard"), env));
  assert.equal(response.status, 403);
  assert.equal(body.code, "MINIAPP_ACCOUNT_UNLINKED");
});

console.log(JSON.stringify({ status: "PASS", release: "v362", tests: 7, managerOfflineRead: true, live4xxAuthoritative: true, mutationLiveOnly: true, expiredLeaseFailClosed: true, revokeFailClosed: true }, null, 2));
