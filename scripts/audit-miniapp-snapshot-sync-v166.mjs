import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "server/cloud/snapshots/miniAppSnapshotSyncProtocol.ts",
  "server/cloud/snapshots/miniAppSnapshotSyncReplayGuard.ts",
  "server/cloud/snapshots/miniAppSnapshotSyncReceiver.ts",
  "server/cloud/snapshots/miniAppSnapshotSyncClient.ts",
];
const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");

assert.match(source, /KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1/);
assert.match(source, /Ed25519|ed25519/);
assert.match(source, /bodySha256|body_sha256|sha256/i);
assert.match(source, /credentialVersion/);
assert.match(source, /REPLAY|replay/);
assert.match(source, /backoff/i);
assert.match(source, /maxAttempts/);
assert.match(source, /queueMicrotask/);
assert.match(source, /createMiniAppSnapshotSyncClientFromConnectorCredential/);
assert.match(source, /createIfMissing: false/);
assert.match(source, /tenantId/);
assert.match(source, /allowedBotIds/);
assert.match(source, /authorizationValidUntil|Snapshot/);
assert.doesNotMatch(source, /api\.telegram\.org/);
assert.doesNotMatch(source, /purchasePrice\s*:/);
assert.doesNotMatch(source, /grossProfit\s*:/);
assert.doesNotMatch(source, /D1Database|wrangler|cloudflare:workers|@cloudflare\/workers-types/);
assert.doesNotMatch(source, /127\.0\.0\.1:3001/);

const startupFiles = ["start_https.bat", "scripts/windows-miniapp-startup-coordinator.mjs"]
  .map((file) => fs.readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(startupFiles, /miniAppSnapshotSync|snapshot-sync|cloud\/v1\/miniapp\/snapshots/i, "Phase 6 must not auto-enable Cloud snapshot writes during normal startup");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert(packageJson.scripts["test:miniapp-snapshot-sync-v166"]);
assert(packageJson.scripts["audit:miniapp-snapshot-sync-v166"]);

console.log("audit-miniapp-snapshot-sync-v166: PASS");
