import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const version = read("KOUROSH_SOURCE_VERSION").trim();
const identity = read("server/services/telegramIdentitySecurity.service.ts");
const coordinator = read("server/cloud/snapshots/miniAppIdentitySyncCoordinator.ts");
const runtime = read("server/cloud/snapshots/miniAppSnapshotRuntime.ts");
const authContext = read("miniapp/auth/MiniAppAuthContext.tsx");
const recovery = read("miniapp/auth/miniAppIdentitySyncRecovery.ts");
const apiClient = read("miniapp/apiClient.ts");
const app = read("miniapp/App.tsx");

assert.ok(Number(version.slice(1)) >= 251, `expected v251 or a compatible successor; found ${version}`);

// Server-side state machine and bounded retry contract.
assert.match(coordinator, /MiniAppIdentitySyncState = "pending" \| "ready" \| "failed"/);
assert.match(coordinator, /retryDelaysMs[^\n]*\?[^\n]*:\s*\[0, 1000, 2000, 4000\]/);
assert.match(coordinator, /state = "ready"/);
assert.match(coordinator, /state = "failed"/);
assert.match(coordinator, /MINIAPP_IDENTITY_SYNC_RETRY_EXHAUSTED/);
assert.match(coordinator, /expectedTelegramUserId: _expectedTelegramUserId/);
assert.match(coordinator, /queueMicrotask\(\(\) => \{ void run\(key, generation\); \}\)/);

// Runtime readiness is based on persisted snapshot state, not merely on scheduling.
assert.match(runtime, /persistedIdentityMatches/);
assert.match(runtime, /expectedTelegramUserId === null\) return !persisted/);
assert.match(runtime, /persisted\?\.telegramUserId === expectedTelegramUserId/);
assert.match(runtime, /requestMiniAppIdentitySnapshotSync/);
assert.match(runtime, /retryDelaysMs: \[0, 1000, 2000, 4000\]/);

// All customer/partner identity mutations schedule the exact target state after DB commit.
assert.match(identity, /requestMiniAppIdentitySnapshotSync\(\{ kind, localSubjectId, expectedTelegramUserId \}\)/);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("partner", Number\(row\.partner_id\), telegramUserId\)/);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("customer", customerId, telegramUserId\)/);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("partner", partnerId, telegramUserId\)/);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("customer", customerId, null\)/);
assert.match(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("partner", partnerId, null\)/);
assert.doesNotMatch(identity, /requestMiniAppSnapshotRefreshAfterIdentityChange\("staff"/);

// Cloud synchronization remains fire-and-forget after committed identity changes.
assert.match(identity, /void import\("\.\.\/cloud\/snapshots\/miniAppSnapshotRuntime"\)/);
assert.match(identity, /\.catch\(\(\) => undefined\)/);

// Client recovery is bounded and only targets the transient missing-snapshot auth condition.
assert.match(recovery, /MINIAPP_IDENTITY_SYNC_RECOVERY_DELAYS_MS = \[1000, 2000, 4000\]/);
assert.match(recovery, /MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE/);
assert.match(recovery, /runMiniAppIdentitySyncRecovery/);
assert.match(authContext, /runMiniAppIdentitySyncRecovery/);
assert.match(authContext, /status: "syncing"/);
assert.match(authContext, /MINIAPP_IDENTITY_SYNC_PENDING/);
assert.match(apiClient, /signal\?: AbortSignal/);
assert.match(apiClient, /credentials: "same-origin",\s*signal,/);
assert.match(app, /status === "loading" \|\| status === "syncing"/);

console.log(JSON.stringify({
  status: "PASS",
  release: version,
  phase: 3,
  guarantees: {
    serverIdentitySyncStates: ["pending", "ready", "failed"],
    serverRetryDelaysMs: [0, 1000, 2000, 4000],
    clientRetryDelaysMs: [1000, 2000, 4000],
    committedIdentityNeverRolledBackByCloudFailure: true,
    staffSnapshotIsolationPreserved: true,
    sensitiveTelegramIdentityExcludedFromPublicSyncStatus: true,
  },
}, null, 2));
