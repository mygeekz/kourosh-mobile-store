import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import edge, {
  deriveTelegramSubjectKey,
  openEdgeSession,
  sealEdgeSession,
  validateTelegramInitDataThirdParty,
} from "../deployment/cloudflare-pages/_worker.js";

const b64u = (value) => Buffer.from(value).toString("base64url");
const installationId = `inst_${b64u(randomBytes(18))}`;
const tenantId = "tenant-alpha";
const botId = "123456789";
const publicHost = "miniapp.example.com";
const liveOrigin = "https://live-alpha.example.com";
const connectorKeys = generateKeyPairSync("ed25519");
const connectorPublicPem = connectorKeys.publicKey.export({ format: "pem", type: "spki" }).toString();

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}
class FakeD1 {
  constructor(tenant) {
    this.tenants = new Map([[tenant.installation_id, tenant]]);
    this.snapshots = new Map();
    this.replays = new Map();
  }
  prepare(sql) { return new FakeStatement(this, sql); }
  snapshotKey(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("lower(public_host)")) {
      const host = String(args[0]).toLowerCase();
      return [...this.tenants.values()].find((row) => row.status === "active" && row.public_host.toLowerCase() === host) || null;
    }
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      const row = this.tenants.get(String(args[0]));
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
      if (!current) { this.snapshots.set(key, row); return { meta: { changes: 1 } }; }
      if (current.installation_id === row.installation_id && Number(row.snapshot_version) > Number(current.snapshot_version)) {
        this.snapshots.set(key, row); return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}

const tenantRow = {
  tenant_id: tenantId,
  installation_id: installationId,
  credential_version: 1,
  installation_public_key_pem: connectorPublicPem,
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
  KOUROSH_EDGE_LIVE_TIMEOUT_MS: "800",
};

// Telegram third-party verifier contract: generated Ed25519 fixture using the exact Telegram data-check-string shape.
{
  const tg = generateKeyPairSync("ed25519");
  const publicDer = tg.publicKey.export({ format: "der", type: "spki" });
  const publicHex = Buffer.from(publicDer).subarray(-32).toString("hex");
  const authDate = Math.floor(Date.now() / 1000);
  const fields = [
    ["auth_date", String(authDate)],
    ["query_id", "AAExample"],
    ["user", JSON.stringify({ id: 778899, first_name: "Ali" })],
  ];
  const dataCheck = `${botId}:WebAppData\n${fields.map(([k, v]) => `${k}=${v}`).join("\n")}`;
  const signature = sign(null, Buffer.from(dataCheck), tg.privateKey).toString("base64url");
  const params = new URLSearchParams([...fields, ["hash", "ignored"], ["signature", signature]]);
  const valid = validateTelegramInitDataThirdParty(params.toString(), botId, { publicKeyHex: publicHex, maxAgeSeconds: 300 });
  assert.equal(valid.user.id, 778899);
  const tampered = new URLSearchParams(params); tampered.set("user", JSON.stringify({ id: 778900, first_name: "Ali" }));
  assert.throws(() => validateTelegramInitDataThirdParty(tampered.toString(), botId, { publicKeyHex: publicHex }), /MINIAPP_INIT_DATA_SIGNATURE_INVALID/);
}

const customerData = (name = "Customer Snapshot") => ({
  profile: { displayName: name },
  account: { signedBalance: 250000, code: "debtor", label: "بدهکار", amount: 250000, totalDebit: 500000, totalCredit: 250000, recentEntries: [] },
  installments: { active: [{ id: 10, saleType: "installment", itemsSummary: "Phone", saleDate: "1405/05/20", totalAmount: 1000000, downPayment: 200000, collectedAmount: 300000, remainingAmount: 500000, installmentCount: 4, paidInstallmentCount: 1, remainingInstallmentCount: 3, nextDueDate: "1405/06/01", nextDueAmount: 200000, overdueCount: 0, status: "فعال" }], recentClosed: [], details: [] },
  purchases: [{ ref: "order-1", source: "sales_order", id: 1, transactionDate: "1405/05/20", itemsSummary: "Phone", quantity: 1, totalAmount: 1000000, purchaseType: "installment", purchaseTypeLabel: "اقساطی", invoiceRef: "order-1" }],
  invoices: [],
});

const makeCandidate = (version, data = customerData(), tenant = tenantId) => ({
  schemaVersion: "1", tenantId: tenant, installationId, subjectKind: "customer", localSubjectId: 42, telegramUserId: "778899",
  snapshotVersion: version, generatedAt: new Date().toISOString(), authorizationValidUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), state: "active", data,
});

const signSyncRequest = (candidate, requestId = b64u(randomBytes(18))) => {
  const body = JSON.stringify({ protocolVersion: 1, botId, candidate });
  const bodySha = createHash("sha256").update(body).digest("hex");
  const timestamp = new Date().toISOString();
  const canonical = ["KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1", "POST", "/cloud/v1/miniapp/snapshots", installationId, "1", requestId, timestamp, bodySha].join("\n");
  const signature = sign(null, Buffer.from(canonical), connectorKeys.privateKey).toString("base64url");
  return new Request(`https://${publicHost}/cloud/v1/miniapp/snapshots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kourosh-installation-id": installationId,
      "x-kourosh-credential-version": "1",
      "x-kourosh-request-id": requestId,
      "x-kourosh-timestamp": timestamp,
      "x-kourosh-body-sha256": bodySha,
      "x-kourosh-signature": signature,
    },
    body,
  });
};

const candidateV1 = makeCandidate(1);
const firstSigned = signSyncRequest(candidateV1);
let response = await edge.fetch(firstSigned.clone(), env);
assert.equal(response.status, 200);
assert.equal((await response.json()).data.result, "accepted");

// Persistent replay guard rejects the exact same signed request.
response = await edge.fetch(firstSigned.clone(), env);
assert.equal(response.status, 409);
assert.equal((await response.json()).code, "MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED");

// Same version/content with a fresh signed request is idempotent.
response = await edge.fetch(signSyncRequest(candidateV1), env);
assert.equal(response.status, 200);
assert.equal((await response.json()).data.result, "idempotent");

// Same version with changed content is a version conflict.
response = await edge.fetch(signSyncRequest({ ...candidateV1, data: customerData("Changed") }), env);
assert.equal(response.status, 409);
assert.equal((await response.json()).code, "MINIAPP_SNAPSHOT_SYNC_VERSION_CONFLICT");

// Cross-tenant candidate cannot be written by this installation.
response = await edge.fetch(signSyncRequest(makeCandidate(2, customerData(), "tenant-other")), env);
assert.equal(response.status, 403);
assert.equal((await response.json()).code, "MINIAPP_SNAPSHOT_SYNC_SCOPE_INVALID");

// Newer version atomically replaces prior row.
response = await edge.fetch(signSyncRequest(makeCandidate(2, customerData("Snapshot v2"))), env);
assert.equal(response.status, 200);

// Edge repeats the Phase-5 fail-closed sensitive-field guard before D1 persistence.
response = await edge.fetch(signSyncRequest(makeCandidate(3, { ...customerData(), purchasePrice: 1 })), env);
assert.equal(response.status, 403);
assert.equal((await response.json()).code, "MINIAPP_SNAPSHOT_SYNC_SCOPE_INVALID");

const partnerTelegramUserId = "889900";
const partnerData = {
  profile: { displayName: "Partner Snapshot", type: "supplier" },
  account: { signedBalance: 750000, code: "creditor", label: "بستانکار از فروشگاه", amount: 750000, totalDebit: 250000, totalCredit: 1000000 },
  ledger: { recent: [] },
  supplied: { total: 1, phones: 1, products: 0, totalSupplyAmount: 1200000 },
  phoneSettlement: { total: 1, open: 1, settled: 0, amount: 1200000, paidAmount: 450000, remainingAmount: 750000 },
  purchases: [{ ref: "phone-1", type: "phone", name: "Phone", quantity: 1, unit: "عدد", supplyAmount: 1200000, purchaseDate: "1405/05/21", identifierMasked: "****2345", status: "موجود", settlement: { code: "open", label: "باز", amount: 1200000, paidAmount: 450000, remainingAmount: 750000, lastPaymentDate: null } }],
  phones: { recent: [{ ref: "phone-1", name: "Phone", identifierMasked: "****2345", status: "موجود", purchaseDate: "1405/05/21", settlement: { code: "open", label: "باز", amount: 1200000, paidAmount: 450000, remainingAmount: 750000, lastPaymentDate: null } }], summary: { total: 1, amount: 1200000, paidAmount: 450000, remainingAmount: 750000 } },
};
const partnerCandidate = { ...makeCandidate(1, partnerData), subjectKind: "partner", localSubjectId: 77, telegramUserId: partnerTelegramUserId };
response = await edge.fetch(signSyncRequest(partnerCandidate), env);
assert.equal(response.status, 200);

const subjectKey = deriveTelegramSubjectKey(env, tenantId, botId, "778899");
assert.match(subjectKey, /^sub_/);
assert.equal([...db.snapshots.values()][0].payload_json.includes("telegramUserId"), false);

const baseIdentity = { kind: "customer", subjectId: 0, displayName: "Snapshot v2", telegramUserId: "778899", capabilities: ["customer:read_own"] };
const sessionBase = { v: 1, tenantId, installationId, botId, publicHost, subjectKey, telegramUserId: "778899", identity: baseIdentity, liveOrigin, localSessionToken: null, issuedAt: Date.now(), expiresAt: Date.now() + 60 * 60 * 1000 };
const snapshotToken = await sealEdgeSession(env, sessionBase);
assert.equal((await openEdgeSession(env, snapshotToken)).tenantId, tenantId);
assert.equal(await openEdgeSession(env, snapshotToken.slice(0, -2) + "xx"), null);

// Offline read uses D1 snapshot and labels the response source.
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${snapshotToken}` } }), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");
assert.equal(response.headers.get("x-kourosh-snapshot-version"), "2");
assert.ok(response.headers.get("x-kourosh-snapshot-generated-at"));
assert.ok(response.headers.get("x-kourosh-snapshot-received-at"));
assert.equal((await response.json()).data.customer.fullName, "Snapshot v2");

// Business writes are never accepted by the public edge.
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { method: "POST", headers: { authorization: `Bearer ${snapshotToken}` } }), env);
assert.equal(response.status, 405);
assert.equal((await response.json()).code, "MINIAPP_READ_ONLY");

// Partner offline data preserves the canonical positive-balance semantics and masks identifiers.
const partnerSubjectKey = deriveTelegramSubjectKey(env, tenantId, botId, partnerTelegramUserId);
const partnerIdentity = { kind: "partner", subjectId: 0, displayName: "Partner Snapshot", telegramUserId: partnerTelegramUserId, capabilities: ["partner:read_own"] };
const partnerToken = await sealEdgeSession(env, { ...sessionBase, subjectKey: partnerSubjectKey, telegramUserId: partnerTelegramUserId, identity: partnerIdentity });
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/partner/home`, { headers: { authorization: `Bearer ${partnerToken}` } }), env);
assert.equal(response.status, 200);
const partnerHome = await response.json();
assert.equal(partnerHome.data.account.code, "creditor");
assert.equal(partnerHome.data.account.label, "بستانکار از فروشگاه");
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/partner/phones`, { headers: { authorization: `Bearer ${partnerToken}` } }), env);
assert.equal((await response.json()).data.items[0].identifier, "****2345");

// Identity kind cannot be crossed even inside the same tenant.
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/partner/home`, { headers: { authorization: `Bearer ${snapshotToken}` } }), env);
assert.equal(response.status, 403);

// Revoking the installation invalidates snapshot reads even for a previously issued Edge session.
tenantRow.status = "revoked";
response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${snapshotToken}` } }), env);
assert.equal(response.status, 403);
assert.equal((await response.json()).code, "MINIAPP_EDGE_INSTALLATION_REVOKED");
tenantRow.status = "active";

const originalFetch = globalThis.fetch;
try {
  const liveToken = await sealEdgeSession(env, { ...sessionBase, localSessionToken: "local-live-token" });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { customer: { id: 42, fullName: "LIVE" }, account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0 }, installments: { activeCount: 0, overdueCount: 0, next: null }, lastPurchase: null } }), { status: 200, headers: { "content-type": "application/json" } });
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${liveToken}` } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal((await response.json()).data.customer.fullName, "LIVE");

  // D1 may be unavailable while an already-authenticated live session remains usable.
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${liveToken}` } }), { ...env, KOUROSH_EDGE_DB: undefined });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");

  // A session created from Snapshot can recover to Live while its encrypted initData is still usable.
  let recoveryCalls = 0;
  const recoveryToken = await sealEdgeSession(env, { ...sessionBase, initData: "encrypted-init-data", localSessionToken: null });
  globalThis.fetch = async (target) => {
    recoveryCalls += 1;
    if (String(target).endsWith("/api/miniapp/auth")) return new Response(JSON.stringify({ success: true, data: { sessionToken: "recovered-local-token", identity: { ...baseIdentity, subjectId: 42 }, expiresAt: new Date(Date.now() + 60_000).toISOString() } }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ success: true, data: { customer: { id: 42, fullName: "RECOVERED LIVE" }, account: { signedBalance: 0, code: "settled", label: "تسویه", amount: 0 }, installments: { activeCount: 0, overdueCount: 0, next: null }, lastPurchase: null } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${recoveryToken}` } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");
  assert.equal((await response.json()).data.customer.fullName, "RECOVERED LIVE");
  assert.equal(recoveryCalls, 2);

  // An authoritative live denial never falls back to stale snapshot data.
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: "MINIAPP_CUSTOMER_ACCESS_REQUIRED", message: "denied" }), { status: 403, headers: { "content-type": "application/json" } });
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${liveToken}` } }), env);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("x-kourosh-data-source"), "live");

  // 5xx/transport failure falls back to the safe snapshot.
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: "BACKEND_DOWN" }), { status: 503, headers: { "content-type": "application/json" } });
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/customer/home`, { headers: { authorization: `Bearer ${liveToken}` } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-kourosh-data-source"), "snapshot");

  // Staff never receives a cloud snapshot fallback.
  const staffToken = await sealEdgeSession(env, { ...sessionBase, identity: { kind: "staff", subjectId: 7, displayName: "Admin", telegramUserId: "778899", roleName: "Admin", capabilities: ["staff:executive:read"] }, localSessionToken: "staff-live" });
  response = await edge.fetch(new Request(`https://${publicHost}/api/miniapp/staff/home`, { headers: { authorization: `Bearer ${staffToken}` } }), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "MINIAPP_STAFF_OFFLINE_UNAVAILABLE");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("test-miniapp-edge-v167: PASS");
