import assert from "node:assert/strict";
import fs from "node:fs";
import { EventEmitter } from "node:events";

import { coordinateWindowsMiniAppStartup } from "./windows-miniapp-startup-coordinator.mjs";

const sink = () => ({ write() {} });
const order = [];
const fakeChild = new EventEmitter();
fakeChild.pid = 1700;
fakeChild.unref = () => {};

const result = await coordinateWindowsMiniAppStartup({
  stdout: sink(),
  stderr: sink(),
  waitForBackendPort: async () => { order.push("backend"); return true; },
  waitForPreflight: async () => { order.push("preflight"); return { allowed: false, startupAction: "stable_tunnel", protectedMode: "stable_tunnel" }; },
  ensureMiniAppBuild: () => { order.push("miniapp-build"); return { action: "reuse", built: false }; },
  ensureGateway: async () => { order.push("gateway"); return { action: "reuse" }; },
  existsSync: () => true,
  spawnImpl: (_exe, _args, options) => {
    order.push("tunnel");
    assert.equal(options.env.KOUROSH_STABLE_TUNNEL_PREFLIGHT_WAIT_MS, "5000");
    assert.equal(options.env.KOUROSH_STABLE_TUNNEL_GATEWAY_WAIT_MS, "5000");
    assert.equal(options.env.KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS, "8000");
    return fakeChild;
  },
});
assert.deepEqual(order, ["backend", "preflight", "miniapp-build", "gateway", "tunnel"]);
assert.equal(result.tunnel, "stable_started");

let gatewayCalls = 0;
const buildFailure = await coordinateWindowsMiniAppStartup({
  stdout: sink(), stderr: sink(),
  waitForBackendPort: async () => true,
  waitForPreflight: async () => ({ allowed: false, startupAction: "stable_tunnel", protectedMode: "stable_tunnel" }),
  ensureMiniAppBuild: () => ({ action: "error", built: false, exitCode: 1 }),
  ensureGateway: async () => { gatewayCalls += 1; return { action: "started" }; },
});
assert.equal(buildFailure.backendReady, true);
assert.equal(buildFailure.miniAppBuild, "error");
assert.equal(buildFailure.gateway, "skipped");
assert.equal(gatewayCalls, 0);

// Local listener must precede optional Settings / Cloud / Telegram initialization.
// This is a structural lifecycle invariant and intentionally stays runnable without tsx/node_modules.
const lifecycle = fs.readFileSync("server/bootstrap/serverLifecycle.ts", "utf8");
const listenIndex = lifecycle.indexOf("app.listen(port, bindHost");
const settingsIndex = lifecycle.indexOf("const runtimeSettings = await getAllSettingsAsObject()");
const cloudIndex = lifecycle.indexOf("initializeCloudConnectorRuntime(runtimeSettings");
const telegramIndex = lifecycle.indexOf("configureTelegramTransportRuntime(runtimeSettings");
assert.ok(listenIndex >= 0 && settingsIndex > listenIndex);
assert.ok(cloudIndex > listenIndex);
assert.ok(telegramIndex > listenIndex);
assert.match(lifecycle, /Optional runtime initialization failed; Local Kourosh remains available/);

const bat = fs.readFileSync("start_https.bat", "utf8");
assert.doesNotMatch(bat, /node scripts\\ensure-miniapp-build\.mjs/i);
assert.ok(bat.indexOf("windows-miniapp-startup-coordinator.mjs") < bat.indexOf("call npm run start:https"));
assert.match(bat, /Local Kourosh does not wait for Mini App build, Tunnel or Cloud connectivity/i);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(pkg.scripts["start:https"], "npm run https:bootstrap && npm run pwa:build:ensure && npm run serve:https");
assert.match(pkg.scripts["pwa:build:ensure"], /ensure-local-pwa-build\.mjs/);
assert.doesNotMatch(pkg.scripts["start:https"], /npm run build(?:\s|$)/);

const coordinator = fs.readFileSync("scripts/windows-miniapp-startup-coordinator.mjs", "utf8");
assert.match(coordinator, /DEFAULT_BACKEND_PORT_WAIT_MS = 30_000/);
assert.match(coordinator, /DEFAULT_PREFLIGHT_WAIT_MS = 5_000/);
assert.doesNotMatch(coordinator, /300_000|5 \* 60_000/);

const stable = fs.readFileSync("scripts/windows-miniapp-stable-tunnel-launcher.mjs", "utf8");
assert.match(stable, /KOUROSH_STABLE_TUNNEL_PREFLIGHT_WAIT_MS/);
assert.match(stable, /KOUROSH_STABLE_TUNNEL_GATEWAY_WAIT_MS/);
assert.match(stable, /KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS/);
assert.doesNotMatch(stable, /timeoutMs: options\.gatewayTimeoutMs \|\| 30_000/);

console.log(JSON.stringify({
  status: "PASS",
  localListenerBeforeOptionalConnectivity: true,
  miniAppBuildDetachedFromLocalLauncher: true,
  miniAppBuildFailureDoesNotStopLocalRuntime: true,
  dailyPwaBuildPolicy: "reuse-valid-dist",
  backendWaitSeconds: 30,
  preflightWaitSeconds: 5,
  stableGatewayWaitSeconds: 5,
  stableHealthWaitSeconds: 8,
  cloudFailureIsolated: true,
}, null, 2));
