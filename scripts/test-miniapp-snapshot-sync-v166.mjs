import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import { generateConnectorCredentialMaterial, persistConnectorPrivateKey } from "../server/cloud/connectorCredentialStore.ts";
import { createInMemoryMiniAppSnapshotStore } from "../server/cloud/snapshots/inMemoryMiniAppSnapshotStore.ts";
import {
  createMiniAppSnapshotSyncClient,
  createMiniAppSnapshotSyncClientFromConnectorCredential,
  createMiniAppSnapshotSyncQueue,
} from "../server/cloud/snapshots/miniAppSnapshotSyncClient.ts";
import {
  createSignedMiniAppSnapshotSyncRequest,
  deriveMiniAppSnapshotSubjectKey,
  MINIAPP_SNAPSHOT_SYNC_PATH,
} from "../server/cloud/snapshots/miniAppSnapshotSyncProtocol.ts";
import { createMiniAppSnapshotSyncReceiver } from "../server/cloud/snapshots/miniAppSnapshotSyncReceiver.ts";
import { createMiniAppSnapshotSyncReplayGuard } from "../server/cloud/snapshots/miniAppSnapshotSyncReplayGuard.ts";

const installationId = "inst_abcdefghijklmnopqrstuvwx";
const tenantId = "tenant_store_001";
const botId = "8123456789";
const telegramUserId = "123456789";
const credentialVersion = 3;
const subjectKeySecret = Buffer.alloc(32, 7);
const baseTime = new Date("2026-08-14T13:00:00.000Z");

const candidate = {
  schemaVersion: "1",
  tenantId,
  installationId,
  subjectKind: "customer",
  localSubjectId: 7,
  telegramUserId,
  snapshotVersion: 1,
  generatedAt: baseTime.toISOString(),
  authorizationValidUntil: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
  state: "active",
  data: {
    profile: { displayName: "مشتری نمونه" },
    account: {
      signedBalance: 9000,
      code: "debtor",
      label: "بدهکار",
      amount: 9000,
      totalDebit: 12000,
      totalCredit: 3000,
      recentEntries: [],
    },
    installments: { active: [], recentClosed: [], details: [] },
    purchases: [],
    invoices: [],
  },
};

const credential = generateConnectorCredentialMaterial();
const store = createInMemoryMiniAppSnapshotStore();
const replay = createMiniAppSnapshotSyncReplayGuard({ now: () => baseTime.getTime() });
const logs = [];
const receiver = createMiniAppSnapshotSyncReceiver({
  authorizeInstallation: async (requestedInstallationId) => requestedInstallationId === installationId ? {
    installationId,
    tenantId,
    publicKeyPem: credential.publicKeyPem,
    credentialVersion,
    status: "active",
    allowedBotIds: [botId],
  } : null,
  subjectKeySecret,
  replayGuard: replay,
  snapshotStore: store,
  now: () => baseTime,
  logger: (event, meta) => logs.push({ event, meta }),
});

const signed = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_abcdefghijklmnop",
});

const accepted = await receiver.handle({ ...signed, headers: signed.headers });
assert.equal(accepted.status, 200);
assert.equal(accepted.body.code, "MINIAPP_SNAPSHOT_SYNC_ACCEPTED");
assert.equal(accepted.body.data?.result, "inserted");
assert.equal(store.size(), 1);

const expectedSubjectKey = deriveMiniAppSnapshotSubjectKey({ secret: subjectKeySecret, tenantId, botId, telegramUserId });
const stored = store.get(tenantId, "customer", expectedSubjectKey);
assert(stored);
assert.equal(stored.subjectKey, expectedSubjectKey);
assert.doesNotMatch(JSON.stringify(stored), new RegExp(telegramUserId));
assert.doesNotMatch(JSON.stringify(stored), /localSubjectId/);
assert.doesNotMatch(JSON.stringify(logs), new RegExp(telegramUserId));
assert.doesNotMatch(JSON.stringify(logs), /signature|privateKey|subjectKey/i);

const replayed = await receiver.handle({ ...signed, headers: signed.headers });
assert.equal(replayed.status, 409);
assert.equal(replayed.body.code, "MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED");

const originalSignature = signed.headers["x-kourosh-signature"];
const badSignatureHeaders = { ...signed.headers, "x-kourosh-signature": `${originalSignature.startsWith("A") ? "B" : "A"}${originalSignature.slice(1)}` };
const badSignature = await receiver.handle({ ...signed, headers: badSignatureHeaders });
assert.equal(badSignature.status, 401);
assert.equal(badSignature.body.code, "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID");

const tampered = { ...signed, body: signed.body.replace("مشتری نمونه", "دستکاری") };
const tamperedResponse = await receiver.handle(tampered);
assert.equal(tamperedResponse.status, 401);
assert.equal(tamperedResponse.body.code, "MINIAPP_SNAPSHOT_SYNC_BODY_HASH_MISMATCH");

const staleSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: new Date(baseTime.getTime() - 10 * 60 * 1000),
  requestId: "request_stale_abcdefghijk",
});
const staleResponse = await receiver.handle(staleSigned);
assert.equal(staleResponse.status, 401);
assert.equal(staleResponse.body.code, "MINIAPP_SNAPSHOT_SYNC_TIMESTAMP_INVALID");

const wrongTenantCandidate = { ...candidate, tenantId: "tenant_other_002", snapshotVersion: 2 };
const wrongTenantSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate: wrongTenantCandidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_wrongtenant_abcdef",
});
const wrongTenantResponse = await receiver.handle(wrongTenantSigned);
assert.equal(wrongTenantResponse.status, 403);
assert.equal(wrongTenantResponse.body.code, "MINIAPP_SNAPSHOT_SYNC_TENANT_MISMATCH");

const wrongBotSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId: "9123456789",
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_wrongbot_abcdefghij",
});
const wrongBotResponse = await receiver.handle(wrongBotSigned);
assert.equal(wrongBotResponse.status, 403);
assert.equal(wrongBotResponse.body.code, "MINIAPP_SNAPSHOT_SYNC_BOT_NOT_ALLOWED");

const wrongVersionSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId,
  installationId,
  credentialVersion: credentialVersion + 1,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_wrongversion_abcdef",
});
const wrongVersionResponse = await receiver.handle(wrongVersionSigned);
assert.equal(wrongVersionResponse.status, 401);
assert.equal(wrongVersionResponse.body.code, "MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_VERSION_MISMATCH");

const idempotentSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_idempotent_abcdefg",
});
const idempotent = await receiver.handle(idempotentSigned);
assert.equal(idempotent.status, 200);
assert.equal(idempotent.body.data?.result, "idempotent");

const newerCandidate = { ...candidate, snapshotVersion: 2, generatedAt: new Date(baseTime.getTime() + 1_000).toISOString(), authorizationValidUntil: new Date(baseTime.getTime() + 60 * 60 * 1000 + 1_000).toISOString() };
const newerSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate: newerCandidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_newerversion_abcdef",
});
const updated = await receiver.handle(newerSigned);
assert.equal(updated.status, 200);
assert.equal(updated.body.data?.result, "updated");
assert.equal(store.get(tenantId, "customer", expectedSubjectKey)?.snapshotVersion, 2);

const oldSigned = createSignedMiniAppSnapshotSyncRequest({
  candidate,
  botId,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  now: baseTime,
  requestId: "request_oldversion_abcdefgh",
});
const staleVersion = await receiver.handle(oldSigned);
assert.equal(staleVersion.status, 409);
assert.equal(staleVersion.body.code, "MINIAPP_SNAPSHOT_SYNC_STALE_REJECTED");

let temporaryFailures = 2;
let receivedRequestIds = [];
const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk.toString("utf8");
  receivedRequestIds.push(String(req.headers["x-kourosh-request-id"] || ""));
  if (temporaryFailures > 0) {
    temporaryFailures -= 1;
    res.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ success: false, code: "TEMPORARY_UNAVAILABLE" }));
    return;
  }
  const result = await receiver.handle({ method: req.method || "", path: new URL(req.url || "/", "http://127.0.0.1").pathname, headers: req.headers, body });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address === "object");
const delays = [];
let clockTick = 0;
const client = createMiniAppSnapshotSyncClient({
  endpoint: `http://127.0.0.1:${address.port}`,
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  environment: "test",
  requestTimeoutMs: 2_000,
  maxAttempts: 5,
  backoffBaseMs: 1_000,
  random: () => 0.5,
  sleep: async (ms) => { delays.push(ms); },
  now: () => new Date(baseTime.getTime() + (++clockTick) * 100),
});
const retryCandidate = { ...newerCandidate, snapshotVersion: 3, generatedAt: new Date(baseTime.getTime() + 2_000).toISOString(), authorizationValidUntil: new Date(baseTime.getTime() + 60 * 60 * 1000 + 2_000).toISOString() };
const clientResult = await client.syncCandidate(retryCandidate, { botId });
assert.equal(clientResult.ok, true);
assert.equal(clientResult.attempts, 3);
assert.deepEqual(delays, [1000, 2000]);
assert.equal(new Set(receivedRequestIds).size, 3, "each retry must use a fresh request id");
assert(receivedRequestIds.every(Boolean));
await new Promise((resolve) => server.close(resolve));

let failedFetchCalls = 0;
const boundedClient = createMiniAppSnapshotSyncClient({
  endpoint: "http://127.0.0.1:9999",
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  environment: "test",
  fetchImpl: async () => { failedFetchCalls += 1; throw Object.assign(new Error("offline"), { code: "ECONNREFUSED" }); },
  maxAttempts: 3,
  random: () => 0.5,
  sleep: async () => {},
  now: () => baseTime,
});
const boundedResult = await boundedClient.syncCandidate(retryCandidate, { botId });
assert.equal(boundedResult.ok, false);
assert.equal(boundedResult.attempts, 3);
assert.equal(failedFetchCalls, 3);

assert.throws(() => createMiniAppSnapshotSyncClient({
  endpoint: "http://example.com",
  installationId,
  credentialVersion,
  signCanonical: credential.signChallenge,
  environment: "production",
}), /requires HTTPS/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v166-credential-"));
const privateKeyPath = path.join(tempDir, "connector.pem");
persistConnectorPrivateKey(credential.privateKeyPem, { privateKeyPath });
const credentialClient = createMiniAppSnapshotSyncClientFromConnectorCredential({
  endpoint: "http://127.0.0.1:9998",
  installationId,
  credentialVersion,
  privateKeyPath,
  environment: "test",
  fetchImpl: async () => new Response(JSON.stringify({ success: true, code: "MINIAPP_SNAPSHOT_SYNC_ACCEPTED" }), { status: 200, headers: { "content-type": "application/json" } }),
  maxAttempts: 1,
  now: () => baseTime,
});
const credentialResult = await credentialClient.syncCandidate(retryCandidate, { botId });
assert.equal(credentialResult.ok, true);
const missingKeyPath = path.join(tempDir, "missing.pem");
assert.throws(() => createMiniAppSnapshotSyncClientFromConnectorCredential({
  endpoint: "http://127.0.0.1:9998",
  installationId,
  credentialVersion,
  privateKeyPath: missingKeyPath,
  environment: "test",
}), /Existing Cloud Connector credential is required/);
assert.equal(fs.existsSync(missingKeyPath), false, "snapshot sync must not silently create a new connector credential");
fs.rmSync(tempDir, { recursive: true, force: true });

const queuedVersions = [];
let releaseQueue;
const gate = new Promise((resolve) => { releaseQueue = resolve; });
let firstQueueCall = true;
const queue = createMiniAppSnapshotSyncQueue({
  concurrency: 1,
  syncCandidate: async (queuedCandidate) => {
    queuedVersions.push(queuedCandidate.snapshotVersion);
    if (firstQueueCall) { firstQueueCall = false; await gate; }
    return { ok: true, status: 200, code: "MINIAPP_SNAPSHOT_SYNC_ACCEPTED", attempts: 1 };
  },
});
const q1 = queue.enqueue({ ...candidate, snapshotVersion: 10 }, { botId });
assert.equal(q1.accepted, true);
await new Promise((resolve) => queueMicrotask(resolve));
const q2 = queue.enqueue({ ...candidate, snapshotVersion: 11 }, { botId });
const q3 = queue.enqueue({ ...candidate, snapshotVersion: 12 }, { botId });
assert.equal(q2.accepted, true);
assert.equal(q3.status, "coalesced");
releaseQueue();
await queue.flush();
assert.deepEqual(queuedVersions, [10, 12], "pending updates for the same subject must coalesce to the newest version");

assert.equal(MINIAPP_SNAPSHOT_SYNC_PATH, "/cloud/v1/miniapp/snapshots");
console.log("test-miniapp-snapshot-sync-v166: PASS");
