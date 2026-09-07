import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("deployment/cloudflare-pages/_worker.js", "utf8");
const client = fs.readFileSync("server/cloud/snapshots/miniAppSnapshotSyncClient.ts", "utf8");

assert.match(worker, /event: "miniapp_edge_storage_error"/);
assert.match(worker, /stage = "storage"/);
assert.match(worker, /snapshot_tenant_lookup/);
assert.match(worker, /snapshot_replay_guard/);
assert.match(worker, /snapshot_upsert/);
assert.match(worker, /sanitizeStorageErrorMessage/);
assert.match(worker, /long-token-redacted/);
assert.doesNotMatch(worker, /payloadJson[\s\S]{0,300}miniapp_edge_storage_error/);
assert.match(client, /miniapp_snapshot_sync_retry[\s\S]{0,320}code: lastCode/);

console.log(JSON.stringify({
  status: "PASS",
  regression: {
    edgeD1ErrorsAreStageTagged: true,
    edgeD1ErrorsAreSanitized: true,
    retryLogsExposeSafeResponseCode: true,
  },
}, null, 2));
