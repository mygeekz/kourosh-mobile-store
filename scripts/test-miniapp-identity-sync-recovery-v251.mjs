import assert from "node:assert/strict";
import {
  MINIAPP_IDENTITY_SYNC_RECOVERY_DELAYS_MS,
  runMiniAppIdentitySyncRecovery,
} from "../miniapp/auth/miniAppIdentitySyncRecovery.ts";

assert.deepEqual([...MINIAPP_IDENTITY_SYNC_RECOVERY_DELAYS_MS], [1000, 2000, 4000]);

// Transient Edge snapshot gap: three failures are retried, fourth attempt succeeds.
{
  const delays = [];
  const pending = [];
  let attempts = 0;
  const result = await runMiniAppIdentitySyncRecovery({
    attempt: async () => {
      attempts += 1;
      if (attempts < 4) throw { code: "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE" };
      return { ok: true };
    },
    getErrorCode: (error) => String(error?.code || "") || null,
    sleep: async (ms) => { delays.push(ms); },
    onPending: ({ attemptNumber, nextDelayMs }) => pending.push({ attemptNumber, nextDelayMs }),
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [1000, 2000, 4000]);
  assert.deepEqual(pending, [
    { attemptNumber: 1, nextDelayMs: 1000 },
    { attemptNumber: 2, nextDelayMs: 2000 },
    { attemptNumber: 3, nextDelayMs: 4000 },
  ]);
}

// Non-target auth failures are never delayed or masked.
{
  let attempts = 0;
  let sleeps = 0;
  const expected = { code: "MINIAPP_ACCOUNT_UNLINKED" };
  await assert.rejects(
    runMiniAppIdentitySyncRecovery({
      attempt: async () => { attempts += 1; throw expected; },
      getErrorCode: (error) => String(error?.code || "") || null,
      sleep: async () => { sleeps += 1; },
    }),
    (error) => error === expected,
  );
  assert.equal(attempts, 1);
  assert.equal(sleeps, 0);
}

// Retry budget is bounded: after the recovery window, the original Edge error wins.
{
  let attempts = 0;
  const expected = { code: "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE", marker: "final" };
  await assert.rejects(
    runMiniAppIdentitySyncRecovery({
      attempt: async () => { attempts += 1; throw expected; },
      getErrorCode: (error) => String(error?.code || "") || null,
      delaysMs: [0, 0, 0],
      sleep: async () => {},
    }),
    (error) => error === expected,
  );
  assert.equal(attempts, 4);
}

console.log(JSON.stringify({
  status: "PASS",
  phase: "v251",
  clientRecovery: {
    retryDelaysMs: [1000, 2000, 4000],
    maximumAuthAttempts: 4,
    onlyMissingOfflineSnapshotIsRetried: true,
    originalFailurePreservedAfterBudget: true,
  },
}, null, 2));
