import { randomBytes } from "node:crypto";
import edge, { deriveTelegramSubjectKey, sealEdgeSession } from "../../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");

export const RC_IDS = Object.freeze({
  tenantId: "tenant-v267-rc",
  installationId: `inst_${b64u(Buffer.from("v267-release-candidate"))}`.slice(0, 29),
  botId: "123456789",
  publicHost: "miniapp.v267.example",
  liveOrigin: "https://live-miniapp.v267.example",
});

// Ensure the deterministic installation id matches the worker contract exactly.
if (!/^inst_[A-Za-z0-9_-]{24}$/.test(RC_IDS.installationId)) throw new Error(`invalid RC installation id: ${RC_IDS.installationId}`);

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}

export class RcFakeD1 {
  constructor(tenant = {}) {
    this.tenant = {
      tenant_id: RC_IDS.tenantId,
      installation_id: RC_IDS.installationId,
      credential_version: 1,
      installation_public_key_pem: "unused-rc-read-test",
      bot_id: RC_IDS.botId,
      public_host: RC_IDS.publicHost,
      live_origin: RC_IDS.liveOrigin,
      status: "active",
      ...tenant,
    };
    this.snapshots = new Map();
    this.failInstallationRead = false;
    this.failSnapshotRead = false;
  }
  prepare(sql) { return new FakeStatement(this, sql); }
  key(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      if (this.failInstallationRead) throw Object.assign(new Error("D1_INSTALLATION_READ_FAILED"), { code: "D1_TEST_FAILURE" });
      return this.tenant.installation_id === String(args[0]) && this.tenant.status === "active" ? this.tenant : null;
    }
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) {
      if (this.failInstallationRead) throw Object.assign(new Error("D1_INSTALLATION_READ_FAILED"), { code: "D1_TEST_FAILURE" });
      return this.tenant.public_host.toLowerCase() === String(args[0]).toLowerCase() && this.tenant.status === "active" ? this.tenant : null;
    }
    if (sql.includes("FROM subject_snapshots")) {
      if (this.failSnapshotRead) throw Object.assign(new Error("D1_SNAPSHOT_READ_FAILED"), { code: "D1_TEST_FAILURE" });
      return this.snapshots.get(this.key(args[0], args[1], args[2])) || null;
    }
    throw new Error(`Unhandled RC first SQL: ${sql}`);
  }
  async run(sql) {
    if (sql.startsWith("DELETE FROM snapshot_sync_replays")) return { meta: { changes: 0 } };
    if (sql.startsWith("INSERT OR IGNORE INTO snapshot_sync_replays")) return { meta: { changes: 1 } };
    if (sql.startsWith("INSERT INTO subject_snapshots")) return { meta: { changes: 1 } };
    throw new Error(`Unhandled RC run SQL: ${sql}`);
  }
}

export const makeRcEnv = (db = new RcFakeD1()) => ({
  KOUROSH_EDGE_DB: db,
  KOUROSH_EDGE_SESSION_KEY: b64u(randomBytes(32)),
  KOUROSH_EDGE_SUBJECT_PEPPER: b64u(randomBytes(32)),
  KOUROSH_EDGE_LIVE_TIMEOUT_MS: "1000",
});

export const rcSnapshotPayload = (kind, displayName) => kind === "customer" ? {
  profile: { displayName },
  account: { signedBalance: 1250000, code: "debtor", label: "بدهکار به فروشگاه", amount: 1250000, totalDebit: 1250000, totalCredit: 0, recentEntries: [] },
  installments: { active: [], recentClosed: [], details: [] },
  purchases: [],
  invoices: [],
} : {
  profile: { displayName, type: "supplier" },
  account: { signedBalance: -880000, code: "creditor", label: "بستانکار از فروشگاه", amount: 880000, totalDebit: 0, totalCredit: 880000 },
  ledger: { recent: [] },
  supplied: { count: 2, amount: 9000000 },
  phoneSettlement: { total: 1, amount: 2000000, paidAmount: 1000000, remainingAmount: 1000000 },
  purchases: [],
  phones: { recent: [], summary: { total: 0, amount: 0, paidAmount: 0, remainingAmount: 0 } },
};

export const installSnapshot = ({ env, db, kind, telegramUserId, state = "active", generatedOffsetMs = -60_000, validForMs = 60 * 60 * 1000, installationId = RC_IDS.installationId, version = 256001, displayName }) => {
  const subjectKey = deriveTelegramSubjectKey(env, RC_IDS.tenantId, RC_IDS.botId, telegramUserId);
  const generatedAtMs = Date.now() + generatedOffsetMs;
  db.snapshots.set(db.key(RC_IDS.tenantId, kind, subjectKey), {
    tenant_id: RC_IDS.tenantId,
    subject_kind: kind,
    subject_key: subjectKey,
    installation_id: installationId,
    snapshot_version: version,
    schema_version: "1",
    state,
    generated_at: new Date(generatedAtMs).toISOString(),
    received_at: new Date(generatedAtMs + 1000).toISOString(),
    authorization_valid_until: new Date(generatedAtMs + validForMs).toISOString(),
    payload_json: state === "active" ? JSON.stringify(rcSnapshotPayload(kind, displayName || `${kind} RC`)) : null,
    content_hash: "b".repeat(64),
  });
  return subjectKey;
};

export const makeIdentity = (kind, telegramUserId, displayName = `${kind} RC`) => ({
  kind,
  subjectId: kind === "staff" ? 9001 : kind === "partner" ? 2001 : 1001,
  displayName,
  telegramUserId,
  capabilities: kind === "staff" ? ["staff:miniapp", "staff:read"] : kind === "partner" ? ["partner:read_own"] : ["customer:read_own"],
});

export const makeSessionToken = async ({ env, kind, telegramUserId, identity = makeIdentity(kind, telegramUserId), localSessionToken = "local-rc-session", liveOrigin = RC_IDS.liveOrigin, subjectKey = null, installationId = RC_IDS.installationId }) => sealEdgeSession(env, {
  v: 1,
  tenantId: RC_IDS.tenantId,
  installationId,
  botId: RC_IDS.botId,
  publicHost: RC_IDS.publicHost,
  subjectKey: subjectKey || deriveTelegramSubjectKey(env, RC_IDS.tenantId, RC_IDS.botId, telegramUserId),
  telegramUserId,
  identity,
  liveOrigin,
  localSessionToken,
  initData: null,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60 * 60 * 1000,
});

export const rcRead = (path, token, options = {}) => edge.fetch(new Request(`https://${RC_IDS.publicHost}${path}`, {
  method: options.method || "GET",
  headers: {
    authorization: `Bearer ${token}`,
    ...(options.origin === false ? {} : { origin: `https://${RC_IDS.publicHost}` }),
    ...(options.headers || {}),
  },
  body: options.body,
}), options.env);

export const jsonBody = async (response) => ({ response, body: await response.json() });

export const withFetch = async (implementation, operation) => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = implementation;
    return await operation();
  } finally {
    globalThis.fetch = previous;
  }
};

export const liveSuccess = (data, status = 200) => async () => new Response(JSON.stringify({ success: status >= 200 && status < 300, data }), {
  status,
  headers: { "content-type": "application/json" },
});

export const liveFailure = (status = 503, code = "LIVE_TEST_FAILURE") => async () => new Response(JSON.stringify({ success: false, code, message: "live test failure" }), {
  status,
  headers: { "content-type": "application/json" },
});

export const liveUnavailable = async () => { throw Object.assign(new Error("origin unavailable"), { code: "ECONNREFUSED" }); };
