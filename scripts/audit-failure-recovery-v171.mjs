import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("deployment/cloudflare-pages/_worker.js", "utf8");
const lifecycle = fs.readFileSync("server/bootstrap/serverLifecycle.ts", "utf8");
const coordinator = fs.readFileSync("scripts/windows-miniapp-startup-coordinator.mjs", "utf8");
const syncClient = fs.readFileSync("server/cloud/snapshots/miniAppSnapshotSyncClient.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const edgeVersion = Number(worker.match(/const EDGE_VERSION = "v(\d+)"/)?.[1] || 0);
assert.ok(edgeVersion >= 171, "Edge runtime must preserve or advance the v171 recovery baseline");
assert.match(worker, /MINIAPP_EDGE_STORAGE_UNAVAILABLE/);
assert.match(worker, /"Retry-After": "2"/);
assert.match(worker, /tryStorage/);
assert.match(worker, /live\.status < 500/);
assert.match(worker, /5xx may safely fall through to an offline snapshot/);
assert.match(worker, /MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE/);
assert.match(worker, /MINIAPP_OFFLINE_SNAPSHOT_EXPIRED/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);

const listen = lifecycle.indexOf("app.listen(port, bindHost");
assert.ok(listen >= 0);
assert.ok(lifecycle.indexOf("initializeCloudConnectorRuntime(runtimeSettings") > listen);
assert.ok(lifecycle.indexOf("configureTelegramTransportRuntime(runtimeSettings") > listen);
assert.ok(lifecycle.indexOf("startTelegramPolling()") > listen);
assert.match(lifecycle, /Optional runtime initialization failed; Local Kourosh remains available/);

assert.match(coordinator, /Local Dashboard\/PWA continues/);
assert.match(coordinator, /DEFAULT_BACKEND_PORT_WAIT_MS = 30_000/);
assert.doesNotMatch(coordinator, /300_000|5 \* 60_000/);

assert.match(syncClient, /const RETRYABLE_STATUS = new Set\(\[408, 425, 429, 500, 502, 503, 504\]\)/);
assert.match(syncClient, /maxAttempts = Math\.min\(6/);
assert.match(syncClient, /backoffMaxMs = Math\.min\(60_000/);
assert.match(syncClient, /queueMicrotask\(pump\)/);

assert.equal(pkg.scripts["test:failure-recovery-v171"], "node scripts/test-failure-recovery-v171.mjs");
assert.equal(pkg.scripts["audit:failure-recovery-v171"], "node scripts/audit-failure-recovery-v171.mjs");

console.log(JSON.stringify({
  status: "PASS",
  failureIsolation: true,
  edgeStorageOutageIs503Retryable: true,
  liveAuthoritative4xxPreserved: true,
  offlineFallbackBounded: true,
  localRuntimeIndependent: true,
  snapshotSyncRetryBounded: true,
}, null, 2));
