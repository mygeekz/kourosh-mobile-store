import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";

import { coordinateWindowsMiniAppStartup } from "./windows-miniapp-startup-coordinator.mjs";

const output = () => ({ write() {} });
const order = [];
const fakeChild = new EventEmitter();
fakeChild.pid = 4321;
fakeChild.unref = () => {};
const result = await coordinateWindowsMiniAppStartup({
  stdout: output(), stderr: output(), backendPortWaitMs: 12000, preflightWaitMs: 9000,
  waitForBackendPort: async (options) => { order.push(["port", options.timeoutMs]); return true; },
  waitForPreflight: async (options) => { order.push(["preflight", options.timeoutMs]); return { allowed: true }; },
  ensureMiniAppBuild: () => ({ action: "reuse", built: false }),
  ensureGateway: async () => { order.push(["gateway"]); return { action: "started", pid: 99 }; },
  existsSync: () => true,
  spawnImpl: (_exe, _args, options) => { order.push(["tunnel", options.cwd ? true : false]); return fakeChild; },
});
assert.deepEqual(order.map((entry) => entry[0]), ["port", "preflight", "gateway", "tunnel"]);
assert.equal(order[0][1], 12000);
assert.equal(order[1][1], 9000);
assert.equal(result.backendReady, true);
assert.equal(result.preflightReady, true);
assert.equal(result.tunnel, "started");

let gatewayCalls = 0;
let tunnelCalls = 0;
const protectedResult = await coordinateWindowsMiniAppStartup({
  stdout: output(), stderr: output(),
  waitForBackendPort: async () => true,
  waitForPreflight: async () => ({ allowed: false, protectedMode: "self_hosted" }),
  ensureMiniAppBuild: () => ({ action: "reuse", built: false }),
  ensureGateway: async () => { gatewayCalls += 1; return { action: "reuse" }; },
  existsSync: () => true,
  spawnImpl: () => { tunnelCalls += 1; return fakeChild; },
});
assert.equal(gatewayCalls, 1);
assert.equal(tunnelCalls, 0);
assert.equal(protectedResult.tunnel, "protected");

const portFail = await coordinateWindowsMiniAppStartup({
  stdout: output(), stderr: output(),
  waitForBackendPort: async () => { const e = new Error("not ready"); e.code = "KOUROSH_BACKEND_PORT_NOT_READY"; throw e; },
  waitForPreflight: async () => { throw new Error("must not run"); },
  ensureMiniAppBuild: () => ({ action: "reuse", built: false }),
  ensureGateway: async () => { throw new Error("must not run"); },
});
assert.equal(portFail.backendReady, false);
assert.equal(portFail.gateway, "skipped");

const preflightFail = await coordinateWindowsMiniAppStartup({
  stdout: output(), stderr: output(),
  waitForBackendPort: async () => true,
  waitForPreflight: async () => { const cause = new Error("KOUROSH_TUNNEL_PREFLIGHT_HTTP_500"); const e = new Error("sync route failed"); e.code = "KOUROSH_BACKEND_NOT_READY_FOR_TUNNEL_SYNC"; e.cause = cause; throw e; },
  ensureMiniAppBuild: () => ({ action: "reuse", built: false }),
  ensureGateway: async () => { throw new Error("must not run"); },
});
assert.equal(preflightFail.backendReady, true);
assert.equal(preflightFail.preflightReady, false);
assert.equal(preflightFail.gateway, "skipped");

const bat = fs.readFileSync("start_https.bat");
assert.equal(bat[0] === 0xef && bat[1] === 0xbb && bat[2] === 0xbf, false, "start_https.bat must not have UTF-8 BOM");
const batText = bat.toString("utf8");
assert.doesNotMatch(batText, /start\s+"[^"]*"\s+\/B\b/i);
assert.match(batText, /start "KOUROSH MINI APP" \/D "%~dp0" "!NODE_EXE!" "scripts\\windows-miniapp-startup-coordinator\.mjs"/);
assert.doesNotMatch(batText, /node scripts\\ensure-miniapp-build\.mjs/, "start_https must not block Local startup on Mini App build");
assert.doesNotMatch(batText, /call npm run build:miniapp/i, "start_https must not rebuild Mini App unconditionally");
assert.doesNotMatch(batText, /start[^\r\n]*cmd\s+\/k/i);
assert.ok(batText.indexOf("windows-miniapp-startup-coordinator.mjs") < batText.indexOf("call npm run start:https"));

const coordinator = fs.readFileSync("scripts/windows-miniapp-startup-coordinator.mjs", "utf8");
assert.match(coordinator, /DEFAULT_BACKEND_PORT_WAIT_MS = 30_000/);
assert.match(coordinator, /DEFAULT_PREFLIGHT_WAIT_MS = 5_000/);
assert.doesNotMatch(coordinator, /5 \* 60_000|300_000/);

console.log(JSON.stringify({
  startupOrder: order.map((entry) => entry[0]),
  backendPortTimeoutSeconds: 12,
  preflightTimeoutSeconds: 9,
  defaultBackendPortTimeoutSeconds: 30,
  defaultPreflightTimeoutSeconds: 5,
  protectedModeTunnelStarts: tunnelCalls,
  portFailureKeepsLocalRuntimeIndependent: portFail.backendReady === false,
  preflightFailureIsFastAndExplicit: preflightFail.preflightReady === false,
  miniAppBuildEnsureRunsInCoordinator: true,
  unconditionalMiniAppBuildRemoved: true,
  batBom: "none",
  secondCmdVisible: true,
}, null, 2));
