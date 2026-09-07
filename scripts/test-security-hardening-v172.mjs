import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import edge, { deriveTelegramSubjectKey, openEdgeSession, sealEdgeSession } from "../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");
const makeInstallationId = () => `inst_${b64u(randomBytes(18))}`;
const keysA = generateKeyPairSync("ed25519");
const keysB = generateKeyPairSync("ed25519");
const tenantA = {
  tenant_id: "tenant-security-a",
  installation_id: makeInstallationId(),
  credential_version: 1,
  installation_public_key_pem: keysA.publicKey.export({ format: "pem", type: "spki" }).toString(),
  bot_id: "123456789",
  public_host: "miniapp-a.security.example",
  live_origin: "https://live-a.security.example",
  status: "active",
};
const tenantB = {
  tenant_id: "tenant-security-b",
  installation_id: makeInstallationId(),
  credential_version: 1,
  installation_public_key_pem: keysB.publicKey.export({ format: "pem", type: "spki" }).toString(),
  bot_id: "223456789",
  public_host: "miniapp-b.security.example",
  live_origin: "https://live-b.security.example",
  status: "active",
};

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}
class FakeD1 {
  constructor(rows) {
    this.tenants = new Map(rows.map((row) => [row.installation_id, row]));
    this.snapshots = new Map();
    this.replays = new Map();
  }
  prepare(sql) { return new FakeStatement(this, sql); }
  snapshotKey(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) {
      const host = String(args[0] || "").toLowerCase();
      return [...this.tenants.values()].find((row) => row.status === "active" && row.public_host.toLowerCase() === host) || null;
    }
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      const row = this.tenants.get(String(args[0] || ""));
      return row?.status === "active" ? row : null;
    }
    if (sql.includes("FROM subject_snapshots")) return this.snapshots.get(this.snapshotKey(args[0], args[1], args[2])) || null;
    throw new Error(`Unhandled first SQL: ${sql}`);
  }
  async run(sql, args) {
    if (sql.startsWith("DELETE FROM snapshot_sync_replays")) {
      const cutoff = String(args[0]);
      for (const [key, row] of this.replays) if (row.expires_at <= cutoff) this.replays.delete(key);
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("INSERT OR IGNORE INTO snapshot_sync_replays")) {
      const key = `${args[0]}\0${args[1]}`;
      if (this.replays.has(key)) return { meta: { changes: 0 } };
      this.replays.set(key, { installation_id: args[0], request_id: args[1], expires_at: args[2], created_at: args[3] });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith("INSERT INTO subject_snapshots")) {
      const row = {
        tenant_id: args[0], subject_kind: args[1], subject_key: args[2], installation_id: args[3], snapshot_version: args[4],
        schema_version: args[5], state: args[6], generated_at: args[7], received_at: args[8], authorization_valid_until: args[9],
        payload_json: args[10], content_hash: args[11],
      };
      const key = this.snapshotKey(row.tenant_id, row.subject_kind, row.subject_key);
      const current = this.snapshots.get(key);
      if (!current || (current.installation_id === row.installation_id && Number(row.snapshot_version) > Number(current.snapshot_version))) {
        this.snapshots.set(key, row);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}

const db = new FakeD1([tenantA, tenantB]);
let assetCalls = 0;
const env = {
  KOUROSH_EDGE_DB: db,
  KOUROSH_EDGE_SESSION_KEY: b64u(randomBytes(32)),
  KOUROSH_EDGE_SUBJECT_PEPPER: b64u(randomBytes(32)),
  KOUROSH_EDGE_LIVE_TIMEOUT_MS: "500",
  ASSETS: { fetch: async () => { assetCalls += 1; return new Response("asset", { status: 200, headers: { "content-type": "text/plain" } }); } },
};

const customerData = (name) => ({
  profile: { displayName: name },
  account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0, totalDebit: 0, totalCredit: 0, recentEntries: [] },
  installments: { active: [], recentClosed: [], details: [] },
  purchases: [],
  invoices: [],
});
const partnerData = (name) => ({
  profile: { displayName: name, type: "supplier" },
  account: { signedBalance: 1, code: "creditor", label: "بستانکار از فروشگاه", amount: 1, totalDebit: 0, totalCredit: 1 },
  ledger: { recent: [] }, supplied: { total: 0, phones: 0, products: 0, totalSupplyAmount: 0 },
  phoneSettlement: { total: 0, open: 0, settled: 0, amount: 0, paidAmount: 0, remainingAmount: 0 },
  purchases: [], phones: { recent: [], summary: { total: 0, amount: 0, paidAmount: 0, remainingAmount: 0 } },
});

const putSnapshot = ({ tenant, kind, telegramUserId, data, version = 1 }) => {
  const subjectKey = deriveTelegramSubjectKey(env, tenant.tenant_id, tenant.bot_id, telegramUserId);
  const now = new Date().toISOString();
  db.snapshots.set(db.snapshotKey(tenant.tenant_id, kind, subjectKey), {
    tenant_id: tenant.tenant_id, subject_kind: kind, subject_key: subjectKey, installation_id: tenant.installation_id,
    snapshot_version: version, schema_version: "1", state: "active", generated_at: now, received_at: now,
    authorization_valid_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), payload_json: JSON.stringify(data), content_hash: "a".repeat(64),
  });
  return subjectKey;
};

const userA = "700001";
const userB = "700002";
const syncUser = "799999";
const partnerAUser = "800001";
const partnerBUser = "800002";
const customerAKey = putSnapshot({ tenant: tenantA, kind: "customer", telegramUserId: userA, data: customerData("Customer A") });
const customerBKey = putSnapshot({ tenant: tenantA, kind: "customer", telegramUserId: userB, data: customerData("Customer B") });
const partnerAKey = putSnapshot({ tenant: tenantA, kind: "partner", telegramUserId: partnerAUser, data: partnerData("Partner A") });
const partnerBKey = putSnapshot({ tenant: tenantA, kind: "partner", telegramUserId: partnerBUser, data: partnerData("Partner B") });
assert.notEqual(customerAKey, customerBKey);
assert.notEqual(partnerAKey, partnerBKey);

const identity = (kind, telegramUserId, subjectId = 1) => ({
  kind, subjectId, displayName: `${kind}-${telegramUserId}`, telegramUserId,
  ...(kind === "staff" ? { roleName: "Admin" } : {}),
  capabilities: kind === "customer" ? ["customer:read_own"] : kind === "partner" ? ["partner:read_own"] : ["staff:executive:read"],
});
const session = async ({ tenant = tenantA, kind = "customer", telegramUserId = userA, subjectKey = customerAKey, localSessionToken = null, initData = null, subjectId = 1 }) => sealEdgeSession(env, {
  v: 1, tenantId: tenant.tenant_id, installationId: tenant.installation_id, botId: tenant.bot_id, publicHost: tenant.public_host,
  subjectKey, telegramUserId, identity: identity(kind, telegramUserId, subjectId), liveOrigin: tenant.live_origin,
  localSessionToken, initData, issuedAt: Date.now(), expiresAt: Date.now() + 60 * 60 * 1000,
});

const signedCandidate = ({ tenant = tenantA, keys = keysA, credentialVersion = tenant.credential_version, candidateTenant = tenant.tenant_id, version = 10, reqId = b64u(randomBytes(18)), signatureMutator = null }) => {
  const candidate = {
    schemaVersion: "1", tenantId: candidateTenant, installationId: tenant.installation_id, subjectKind: "customer", localSubjectId: 1,
    telegramUserId: syncUser, snapshotVersion: version, generatedAt: new Date().toISOString(),
    authorizationValidUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), state: "active", data: customerData(`signed-${version}`),
  };
  const body = JSON.stringify({ protocolVersion: 1, botId: tenant.bot_id, candidate });
  const bodySha = createHash("sha256").update(body).digest("hex");
  const timestamp = new Date().toISOString();
  const canonical = ["KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1", "POST", "/cloud/v1/miniapp/snapshots", tenant.installation_id, String(credentialVersion), reqId, timestamp, bodySha].join("\n");
  let signature = sign(null, Buffer.from(canonical), keys.privateKey).toString("base64url");
  if (signatureMutator) signature = signatureMutator(signature);
  return new Request(`https://${tenant.public_host}/cloud/v1/miniapp/snapshots`, {
    method: "POST", headers: {
      "content-type": "application/json",
      "x-kourosh-installation-id": tenant.installation_id,
      "x-kourosh-credential-version": String(credentialVersion), "x-kourosh-request-id": reqId,
      "x-kourosh-timestamp": timestamp, "x-kourosh-body-sha256": bodySha, "x-kourosh-signature": signature,
    }, body,
  });
};

const readJson = async (response) => ({ response, body: await response.json() });

// Invalid signature/auth and old installation credentials fail closed.
let result = await readJson(await edge.fetch(signedCandidate({ version: 11, signatureMutator: (sig) => `${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}` }), env));
assert.equal(result.response.status, 401);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID");

tenantA.credential_version = 2;
result = await readJson(await edge.fetch(signedCandidate({ credentialVersion: 1, version: 12 }), env));
assert.equal(result.response.status, 401);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID");
tenantA.credential_version = 1;

// Cross-tenant signed candidate is rejected even with a valid installation signature.
result = await readJson(await edge.fetch(signedCandidate({ candidateTenant: tenantB.tenant_id, version: 13 }), env));
assert.equal(result.response.status, 403);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_SCOPE_INVALID");

// Exact signed-request replay is rejected persistently.
const replayRequest = signedCandidate({ version: 14 });
assert.equal((await edge.fetch(replayRequest.clone(), env)).status, 200);
result = await readJson(await edge.fetch(replayRequest.clone(), env));
assert.equal(result.response.status, 409);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED");

const customerAToken = await session({ kind: "customer", telegramUserId: userA, subjectKey: customerAKey });
const partnerAToken = await session({ kind: "partner", telegramUserId: partnerAUser, subjectKey: partnerAKey });
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => { throw new TypeError("offline"); };

  // Cross-customer selector injection cannot change the encrypted subject scope.
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home?subjectKey=${encodeURIComponent(customerBKey)}`, { headers: { authorization: `Bearer ${customerAToken}` } }), env));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.customer.fullName, "Customer A");

  // Cross-partner selector injection cannot change the encrypted subject scope.
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/partner/home?subjectKey=${encodeURIComponent(partnerBKey)}`, { headers: { authorization: `Bearer ${partnerAToken}` } }), env));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.partner.name, "Partner A");

  // Cross-kind access remains denied.
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/partner/home`, { headers: { authorization: `Bearer ${customerAToken}` } }), env));
  assert.equal(result.response.status, 403);

  // Host-bound bearer replay is rejected; X-Forwarded-Host is never trusted.
  result = await readJson(await edge.fetch(new Request(`https://${tenantB.public_host}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${customerAToken}`, "x-forwarded-host": tenantA.public_host } }), env));
  assert.equal(result.response.status, 403);
  assert.equal(result.body.code, "MINIAPP_EDGE_HOST_MISMATCH");
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${customerAToken}`, "x-forwarded-host": tenantB.public_host } }), env));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.customer.fullName, "Customer A");

  // Browser-origin mismatch is denied even on the correct hostname.
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${customerAToken}`, origin: "https://evil.example" } }), env));
  assert.equal(result.response.status, 403);
  assert.equal(result.body.code, "MINIAPP_EDGE_ORIGIN_MISMATCH");

  // Tampered encrypted session cannot be opened or used.
  const tampered = `${customerAToken.slice(0, -2)}${customerAToken.endsWith("aa") ? "bb" : "aa"}`;
  assert.equal(await openEdgeSession(env, tampered), null);
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${tampered}` } }), env));
  assert.equal(result.response.status, 401);

  // Role downgrade / unlink 4xx from Local is authoritative and can never fall back to cloud data.
  const staffToken = await session({ kind: "staff", telegramUserId: "900001", subjectKey: deriveTelegramSubjectKey(env, tenantA.tenant_id, tenantA.bot_id, "900001"), localSessionToken: "staff-live", subjectId: 7 });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: "MINIAPP_STAFF_AUTH_INVALID", message: "role downgraded" }), { status: 401, headers: { "content-type": "application/json" } });
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/staff/home`, { headers: { authorization: `Bearer ${staffToken}` } }), env));
  assert.equal(result.response.status, 401);
  assert.equal(result.response.headers.get("x-kourosh-data-source"), "live");

  // The same authoritative 401 rule applies during Offline -> Live re-authentication.
  const staffRecoveryToken = await session({ kind: "staff", telegramUserId: "900001", subjectKey: deriveTelegramSubjectKey(env, tenantA.tenant_id, tenantA.bot_id, "900001"), localSessionToken: null, initData: "encrypted-init-data", subjectId: 7 });
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/staff/home`, { headers: { authorization: `Bearer ${staffRecoveryToken}` } }), env));
  assert.equal(result.response.status, 401);
  assert.equal(result.response.headers.get("x-kourosh-data-source"), "live");

  // Re-authentication identity swapping is rejected rather than accepted or snapshotted.
  const recoveryToken = await session({ kind: "customer", telegramUserId: userA, subjectKey: customerAKey, localSessionToken: null, initData: "encrypted-init-data" });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { sessionToken: "wrong-user", identity: identity("customer", userB, 2), expiresAt: new Date(Date.now() + 60_000).toISOString() } }), { status: 200, headers: { "content-type": "application/json" } });
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${recoveryToken}` } }), env));
  assert.equal(result.response.status, 502);
  assert.equal(result.body.code, "MINIAPP_LIVE_IDENTITY_INVALID");
} finally {
  globalThis.fetch = originalFetch;
}

// Cloud API abuse: fail closed on methods, unexpected namespaces, query tricks, content types and oversized bodies.
result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/customer/home`, { method: "POST", headers: { authorization: `Bearer ${customerAToken}` } }), env));
assert.equal(result.response.status, 405);
assert.equal(result.body.code, "MINIAPP_READ_ONLY");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/admin`, { method: "POST" }), env));
assert.equal(result.response.status, 404);
assert.equal(result.body.code, "MINIAPP_API_ROUTE_NOT_FOUND");
assert.equal(assetCalls, 0);

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/cloud/internal`, { method: "POST" }), env));
assert.equal(result.response.status, 404);
assert.equal(result.body.code, "MINIAPP_CLOUD_ROUTE_NOT_FOUND");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/miniapp.html`, { method: "POST" }), env));
assert.equal(result.response.status, 405);
assert.equal(result.body.code, "MINIAPP_STATIC_METHOD_NOT_ALLOWED");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/auth?tenant=${tenantB.tenant_id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: "x" }) }), env));
assert.equal(result.response.status, 400);
assert.equal(result.body.code, "MINIAPP_AUTH_QUERY_NOT_ALLOWED");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/api/miniapp/auth`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), env));
assert.equal(result.response.status, 415);
assert.equal(result.body.code, "MINIAPP_CONTENT_TYPE_REQUIRED");

result = await readJson(await edge.fetch(new Request(`https://evil.security.example/api/miniapp/auth`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-host": tenantA.public_host }, body: JSON.stringify({ initData: "x" }) }), env));
assert.equal(result.response.status, 503);
assert.equal(result.body.code, "MINIAPP_EDGE_TENANT_NOT_CONFIGURED");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/cloud/v1/miniapp/snapshots?tenant=${tenantB.tenant_id}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env));
assert.equal(result.response.status, 400);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_QUERY_NOT_ALLOWED");

result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/cloud/v1/miniapp/snapshots`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), env));
assert.equal(result.response.status, 415);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_CONTENT_TYPE_REQUIRED");

const oversized = JSON.stringify({ x: "x".repeat(545 * 1024) });
result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/cloud/v1/miniapp/snapshots`, { method: "POST", headers: { "content-type": "application/json" }, body: oversized }), env));
assert.equal(result.response.status, 413);
assert.equal(result.body.code, "MINIAPP_SNAPSHOT_SYNC_BODY_TOO_LARGE");

// Secret leakage: user-controlled secret material must not be reflected into responses or exception logs.
const secretMarkers = ["BOT_TOKEN_SECRET_MARKER", "PRIVATE_KEY_SECRET_MARKER", "RAW_INIT_DATA_SECRET_MARKER", userA];
const logged = [];
const originalConsoleError = console.error;
console.error = (...args) => logged.push(JSON.stringify(args));
try {
  const throwingEnv = { ...env, ASSETS: { fetch: async () => { throw new Error(secretMarkers.join("|")); } } };
  result = await readJson(await edge.fetch(new Request(`https://${tenantA.public_host}/secret-test.txt`), throwingEnv));
  assert.equal(result.response.status, 500);
  const exposed = `${JSON.stringify(result.body)}\n${logged.join("\n")}`;
  for (const marker of secretMarkers) assert.equal(exposed.includes(marker), false, `secret leaked: ${marker}`);
} finally {
  console.error = originalConsoleError;
}

// Backend security authority remains fresh on every Mini App request, especially Staff role downgrade.
const localRoutes = fs.readFileSync("server/routes/miniapp.routes.ts", "utf8");
assert.match(localRoutes, /loadFreshMiniAppIdentityBinding\(identity\.kind, identity\.subjectId, identity\.telegramUserId\)/);
assert.match(localRoutes, /loadFreshStaffAuthorizationResult\(identity\.subjectId, identity\.telegramUserId\)/);
assert.match(localRoutes, /revokeCurrentMiniAppSession\(req\)/);
assert.match(localRoutes, /app\.use\("\/api\/miniapp\/staff", \.\.\.staffGuards\)/);
const gateway = fs.readFileSync("server/miniapp/miniAppGatewayPolicy.mjs", "utf8");
assert.match(gateway, /pathname === "\/api\/miniapp\/auth" \? "POST" : "GET"/);
assert.match(gateway, /API_PATH_NOT_ALLOWED/);

console.log(JSON.stringify({
  status: "PASS",
  phase: 12,
  security: {
    crossTenant: "rejected",
    crossCustomer: "subject_scope_bound",
    crossPartner: "subject_scope_bound",
    roleDowngrade: "authoritative_4xx_no_snapshot",
    tokenReplay: "sync_replay_and_cross_host_bearer_rejected",
    invalidSnapshotSignature: "rejected",
    oldInstallationCredential: "rejected",
    hostSpoofing: "url_host_bound_x_forwarded_host_ignored",
    cloudApiAbuse: "fail_closed",
    writeAttempts: "read_only",
    secretLeakage: "not_reflected_or_logged",
  },
}, null, 2));
