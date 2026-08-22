import assert from "node:assert/strict";
import fs from "node:fs";

import { writeMiniAppEdgeLiveLog } from "../deployment/cloudflare-pages/_worker.js";
import {
  EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION,
  ensureWindowsMiniAppGateway,
} from "./windows-miniapp-gateway-launcher.mjs";

const read = (file) => fs.readFileSync(file, "utf8");
const availability = read("miniapp/reference/miniAppDataAvailability.ts");
const context = read("miniapp/dataAvailability/MiniAppDataAvailabilityContext.tsx");
const queryHook = read("miniapp/hooks/useMiniAppQuery.ts");
const partnerHome = read("miniapp/pages/PartnerHome.tsx");
const worker = read("deployment/cloudflare-pages/_worker.js");
const gateway = read("scripts/serve-miniapp-gateway.mjs");

assert.match(availability, /title:\s*"فروشگاه آنلاین است"/);
assert.match(availability, /title:\s*"فروشگاه آفلاین است"/);
assert.match(availability, /اطلاعات همگام‌شده/);
assert.match(context, /options\.primary === false/);
assert.match(context, /current\.requestPath !== path/);
assert.match(queryHook, /availability\?: "primary" \| "secondary"/);
assert.match(queryHook, /clearAvailability\(path\)/);
assert.match(partnerHome, /availability: "secondary"/);
assert.match(partnerHome, /\/api\/miniapp\/partner\/home/);

for (const event of [
  "live_auth_success",
  "live_auth_timeout",
  "live_auth_5xx",
  "live_read_success",
  "live_read_timeout",
  "live_read_5xx",
]) assert.match(worker, new RegExp(`"${event}"`));
assert.match(worker, /reason:\s*errorName === "TimeoutError" \|\| errorName === "AbortError" \? "timeout" : "network_error"/);

const liveLogs = [];
writeMiniAppEdgeLiveLog("live_read_timeout", {
  requestId: "safe_request_id_123456",
  route: "/api/miniapp/partner/home?financial=secret",
  durationMs: 1501,
  telegramUserId: "672412513",
  token: "must-not-appear",
  amount: 514_300_000,
}, (line) => liveLogs.push(line));
assert.equal(liveLogs.length, 1);
assert.match(liveLogs[0], /"event":"live_read_timeout"/);
assert.match(liveLogs[0], /"route":"\/api\/miniapp\/partner\/home"/);
assert.doesNotMatch(liveLogs[0], /financial|672412513|must-not-appear|514300000/);

assert.equal(EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION, "v197");
assert.match(gateway, /X-Kourosh-Gateway-Version/);

const expectedProcess = {
  listening: true,
  pid: 1940,
  name: "node.exe",
  commandLine: `node ${process.cwd().replace(/\\/g, "/")}/scripts/serve-miniapp-gateway.mjs`,
};

const reused = await ensureWindowsMiniAppGateway({
  allowNonWindows: true,
  inspectPortOwner: async () => expectedProcess,
  probeVersion: async () => "v197",
});
assert.equal(reused.action, "reuse");
assert.equal(reused.pid, 1940);

let inspectCount = 0;
let stoppedPid = null;
let spawned = false;
const restarted = await ensureWindowsMiniAppGateway({
  allowNonWindows: true,
  inspectPortOwner: async () => {
    inspectCount += 1;
    return inspectCount === 1 ? expectedProcess : { ...expectedProcess, pid: 1950 };
  },
  probeVersion: async () => (spawned ? "v197" : null),
  stopExpectedProcess: async (pid) => { stoppedPid = pid; },
  waitForPortRelease: async () => true,
  spawnGateway: () => {
    spawned = true;
    return { pid: 1950, unref() {} };
  },
  waitForPort: async () => true,
});
assert.equal(stoppedPid, 1940);
assert.equal(restarted.action, "restarted_incompatible");
assert.equal(restarted.restartReason, "version_missing");
assert.equal(restarted.version, "v197");

let unexpectedStopped = false;
await assert.rejects(
  ensureWindowsMiniAppGateway({
    allowNonWindows: true,
    inspectPortOwner: async () => ({ listening: true, pid: 88, name: "other.exe", commandLine: "other.exe --listen 4180" }),
    stopExpectedProcess: async () => { unexpectedStopped = true; },
  }),
  (error) => error?.code === "MINIAPP_GATEWAY_PORT_IN_USE",
);
assert.equal(unexpectedStopped, false);

console.log(JSON.stringify({
  status: "PASS",
  release: "v197",
  freshSnapshotMarksStoreOnline: true,
  primaryRequestOwnsAvailabilityBadge: true,
  secondaryHomeRequestCannotOverwriteBadge: true,
  safeLiveProxyObservability: true,
  incompatibleOwnedGatewaySelfHeals: true,
  unrelatedPortOwnerIsNeverStopped: true,
}, null, 2));
