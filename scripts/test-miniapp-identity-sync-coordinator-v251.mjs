import assert from "node:assert/strict";
import { createMiniAppIdentitySyncCoordinator } from "../server/cloud/snapshots/miniAppIdentitySyncCoordinator.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Link: starts pending, retries, and becomes ready only when the exact persisted
// Telegram identity is visible after reconciliation.
{
  let reconciliations = 0;
  let persistedTelegramUserId = null;
  const coordinator = createMiniAppIdentitySyncCoordinator({
    retryDelaysMs: [0, 0, 0, 0],
    sleep: async () => {},
    randomId: () => "op-link",
    reconcile: async () => {
      reconciliations += 1;
      if (reconciliations === 2) persistedTelegramUserId = "700100200";
    },
    isSatisfied: (target) => target.operation === "link" && persistedTelegramUserId === target.expectedTelegramUserId,
    getLastErrorCode: () => reconciliations < 2 ? "MINIAPP_SNAPSHOT_SYNC_NETWORK_ERROR" : null,
  });
  const requested = coordinator.request({ kind: "partner", localSubjectId: 42, operation: "link", expectedTelegramUserId: "700100200" });
  assert.equal(requested.state, "pending");
  assert.equal(requested.attempts, 0);
  assert.equal(requested.maxAttempts, 4);
  await tick(); await tick();
  const status = coordinator.getStatus("partner", 42);
  assert.equal(status?.state, "ready");
  assert.equal(status?.attempts, 2);
  assert.equal(status?.lastErrorCode, null);
  assert.ok(status?.readyAt);
  assert.equal("expectedTelegramUserId" in status, false, "public status must not expose Telegram identity");
}

// Failure: after the bounded four attempts the operation is explicitly failed.
{
  let reconciliations = 0;
  const coordinator = createMiniAppIdentitySyncCoordinator({
    retryDelaysMs: [0, 0, 0, 0],
    sleep: async () => {},
    randomId: () => "op-fail",
    reconcile: async () => { reconciliations += 1; },
    isSatisfied: () => false,
    getLastErrorCode: () => "MINIAPP_SNAPSHOT_SYNC_TIMEOUT",
  });
  coordinator.request({ kind: "customer", localSubjectId: 7, operation: "link", expectedTelegramUserId: "700300400" });
  await tick(); await tick();
  const status = coordinator.getStatus("customer", 7);
  assert.equal(reconciliations, 4);
  assert.equal(status?.state, "failed");
  assert.equal(status?.attempts, 4);
  assert.equal(status?.lastErrorCode, "MINIAPP_SNAPSHOT_SYNC_TIMEOUT");
  assert.ok(status?.failedAt);
}

// Eventual safety net: a failed operation becomes ready if periodic reconciliation
// later makes the persisted snapshot state satisfy the requested identity change.
{
  let revoked = false;
  const coordinator = createMiniAppIdentitySyncCoordinator({
    retryDelaysMs: [0],
    sleep: async () => {},
    randomId: () => "op-unlink",
    reconcile: async () => {},
    isSatisfied: (target) => target.operation === "unlink" && revoked,
    getLastErrorCode: () => "MINIAPP_SNAPSHOT_SYNC_NETWORK_ERROR",
  });
  coordinator.request({ kind: "partner", localSubjectId: 91, operation: "unlink", expectedTelegramUserId: null });
  await tick();
  assert.equal(coordinator.getStatus("partner", 91)?.state, "failed");
  revoked = true;
  const recovered = coordinator.getStatus("partner", 91);
  assert.equal(recovered?.state, "ready");
  assert.equal(recovered?.failedAt, null);
  assert.ok(recovered?.readyAt);
}

// Supersession: a newer operation for the same subject owns the final status.
{
  let linked = false;
  let releaseFirst;
  const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
  let calls = 0;
  const coordinator = createMiniAppIdentitySyncCoordinator({
    retryDelaysMs: [0, 0],
    sleep: async () => {},
    randomId: (() => { let id = 0; return () => `op-${++id}`; })(),
    reconcile: async () => {
      calls += 1;
      if (calls === 1) await firstBlocked;
    },
    isSatisfied: (target) => target.operation === "unlink" ? true : linked,
  });
  coordinator.request({ kind: "customer", localSubjectId: 15, operation: "link", expectedTelegramUserId: "700500600" });
  await tick();
  const newer = coordinator.request({ kind: "customer", localSubjectId: 15, operation: "unlink", expectedTelegramUserId: null });
  releaseFirst();
  await tick(); await tick();
  const status = coordinator.getStatus("customer", 15);
  assert.equal(status?.operationId, newer.operationId);
  assert.equal(status?.operation, "unlink");
  assert.equal(status?.state, "ready");
}

console.log(JSON.stringify({
  status: "PASS",
  phase: "v251",
  identitySync: {
    boundedAttempts: 4,
    linkPendingReady: true,
    explicitFailedState: true,
    periodicRecoveryObserved: true,
    supersededOperationsCanceled: true,
    telegramIdentityNotExposedInStatus: true,
  },
}, null, 2));
