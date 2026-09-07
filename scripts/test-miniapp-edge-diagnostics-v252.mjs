import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import edge, { deriveTelegramSubjectKey } from "../deployment/cloudflare-pages/_worker.js";
import { createSignedMiniAppDiagnosticsRequest } from "../server/cloud/snapshots/miniAppDiagnosticsProtocol.ts";

const b64u = (value) => Buffer.from(value).toString("base64url");
const installationId = `inst_${b64u(randomBytes(18))}`;
const tenantId = "tenant-v252-diagnostics";
const botId = "123456789";
const publicHost = "miniapp-v252.example.com";
const liveOrigin = "https://live-v252.example.com";
const telegramUserId = "778899";
const connectorKeys = generateKeyPairSync("ed25519");
const connectorPublicPem = connectorKeys.publicKey.export({ format: "pem", type: "spki" }).toString();

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}
class FakeD1 {
  constructor(tenant) { this.tenant = tenant; this.snapshots = new Map(); this.replays = new Set(); }
  prepare(sql) { return new FakeStatement(this, sql); }
  key(tenant, kind, subject) { return `${tenant}\0${kind}\0${subject}`; }
  async first(sql, args) {
    if (sql.includes("FROM tenant_installations") && sql.includes("installation_id = ?")) {
      return this.tenant.installation_id === String(args[0]) && this.tenant.status === "active" ? this.tenant : null;
    }
    if (sql.includes("FROM subject_snapshots")) return this.snapshots.get(this.key(args[0], args[1], args[2])) || null;
    throw new Error(`Unhandled first SQL: ${sql}`);
  }
  async run(sql, args) {
    if (sql.startsWith("DELETE FROM snapshot_sync_replays")) return { meta: { changes: 0 } };
    if (sql.startsWith("INSERT OR IGNORE INTO snapshot_sync_replays")) {
      const key = `${args[0]}\0${args[1]}`;
      if (this.replays.has(key)) return { meta: { changes: 0 } };
      this.replays.add(key); return { meta: { changes: 1 } };
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
  KOUROSH_EDGE_SUBJECT_PEPPER: b64u(randomBytes(32)),
};
const subjectKey = deriveTelegramSubjectKey(env, tenantId, botId, telegramUserId);
const generatedAt = new Date(Date.now() - 60_000).toISOString();
const receivedAt = new Date().toISOString();
db.snapshots.set(db.key(tenantId, "partner", subjectKey), {
  tenant_id: tenantId,
  subject_kind: "partner",
  subject_key: subjectKey,
  installation_id: installationId,
  snapshot_version: 252001,
  schema_version: "1",
  state: "active",
  generated_at: generatedAt,
  received_at: receivedAt,
  authorization_valid_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  payload_json: JSON.stringify({ shouldNeverLeak: true, financial: 123456 }),
  content_hash: "a".repeat(64),
});

const makeRequest = (userId = telegramUserId, requestId) => {
  const signed = createSignedMiniAppDiagnosticsRequest({
    installationId,
    credentialVersion: 1,
    botId,
    subjectKind: "partner",
    telegramUserId: userId,
    requestId,
    signCanonical: (canonical) => sign(null, Buffer.from(canonical, "utf8"), connectorKeys.privateKey).toString("base64url"),
  });
  return new Request(`https://${publicHost}${signed.path}`, { method: signed.method, headers: signed.headers, body: signed.body });
};

const first = makeRequest();
let response = await edge.fetch(first.clone(), env);
assert.equal(response.status, 200);
let body = await response.json();
assert.equal(body.success, true);
assert.equal(body.data.snapshot.present, true);
assert.equal(body.data.snapshot.snapshotVersion, 252001);
assert.equal(body.data.snapshot.receivedAt, receivedAt);
assert.ok(body.data.edgeVersion);
const serialized = JSON.stringify(body);
assert.equal(serialized.includes("shouldNeverLeak"), false);
assert.equal(serialized.includes("financial"), false);
assert.equal(serialized.includes(subjectKey), false);
assert.equal(serialized.includes(telegramUserId), false);

response = await edge.fetch(first.clone(), env);
body = await response.json();
assert.equal(response.status, 409);
assert.equal(body.code, "MINIAPP_DIAGNOSTIC_REPLAY_REJECTED");

response = await edge.fetch(makeRequest("778900"), env);
body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.data.snapshot.present, false);

const tampered = makeRequest("778901");
const tamperedBody = JSON.parse(await tampered.clone().text());
tamperedBody.telegramUserId = "778902";
response = await edge.fetch(new Request(tampered.url, { method: "POST", headers: tampered.headers, body: JSON.stringify(tamperedBody) }), env);
body = await response.json();
assert.equal(response.status, 401);
assert.equal(body.code, "MINIAPP_DIAGNOSTIC_BODY_HASH_INVALID");

console.log(JSON.stringify({ status: "PASS", metadataOnly: true, replayGuard: true, signedProbe: true, missingSnapshotSafe: true }, null, 2));
