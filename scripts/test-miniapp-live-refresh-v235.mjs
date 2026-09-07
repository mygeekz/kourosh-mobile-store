import assert from "node:assert/strict";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { startOrReuseWindowsStableTunnel } from "./windows-miniapp-stable-tunnel-launcher.mjs";

const query = fs.readFileSync("miniapp/hooks/useMiniAppQuery.ts", "utf8");
const status = fs.readFileSync("miniapp/components/MiniAppDataAvailabilityStatus.tsx", "utf8");
const tunnel = fs.readFileSync("scripts/windows-miniapp-stable-tunnel-launcher.mjs", "utf8");
const settingsRoutes = fs.readFileSync("server/routes/settings.routes.ts", "utf8");

assert.match(query, /PRIMARY_REFRESH_INTERVAL_MS\s*=\s*60_000/);
assert.match(query, /visibilitychange/);
assert.match(query, /window\.addEventListener\("focus"/);
assert.match(query, /preserveCurrent/);
assert.match(status, /setInterval\(\(\) => setNowMs\(Date\.now\(\)\), 30_000\)/);
assert.match(status, /useMiniAppAvailabilityViewModel\(nowMs\)/);
assert.match(settingsRoutes, /kickStableTunnelRuntimeAfterSettingsSave\(savedSettings\)/);

const configIndex = tunnel.indexOf("const config = (options.writeConfig || writeCloudflareNamedTunnelRuntimeConfig)(runtime, options);");
const inspectIndex = tunnel.indexOf("const processes = await (options.inspectExisting || inspectExistingCloudflared)(options);");
assert.ok(configIndex >= 0 && inspectIndex > configIndex, "Stable tunnel config must be written before process reuse is considered");

const fakeChild = new EventEmitter();
fakeChild.pid = 9191;
fakeChild.unref = () => {};
let stoppedPid = null;
let inspectCount = 0;
const restarted = await startOrReuseWindowsStableTunnel({ startupAction: "stable_tunnel", stableTunnel: { provider: "cloudflare_named", configured: true } }, {
  allowNonWindows: true,
  waitForGateway: async () => true,
  resolveRuntime: () => ({ tunnelId: "123e4567-e89b-42d3-a456-426614174000", credentialsFile: "/tmp/x", configFile: "/tmp/x.yml", liveOriginUrl: "https://live.example.com/", targetUrl: "http://127.0.0.1:4180" }),
  writeConfig: () => ({ configFile: "/tmp/x.yml", hostname: "live.example.com" }),
  inspectExisting: async () => {
    inspectCount += 1;
    return inspectCount === 1 ? [{ pid: 8181, commandLine: "cloudflared tunnel --config /tmp/x.yml run 123e4567-e89b-42d3-a456-426614174000" }] : [];
  },
  checkExistingHealth: async () => false,
  stopExpectedProcess: async (pid) => { stoppedPid = pid; },
  ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
  spawnImpl: () => fakeChild,
  sleepImpl: async () => undefined,
});
assert.equal(stoppedPid, 8181);
assert.equal(restarted.action, "restarted_unhealthy");
assert.equal(restarted.restartReason, "live_origin_unhealthy");

console.log(JSON.stringify({
  status: "PASS",
  release: "v235",
  primaryMiniAppRefresh: true,
  refreshOnFocusAndVisibility: true,
  snapshotClockReevaluation: true,
  staleTunnelConfigReusePrevented: true,
  unhealthyOwnedTunnelSelfHeals: true,
  settingsSaveKicksStableTunnel: true,
}, null, 2));
