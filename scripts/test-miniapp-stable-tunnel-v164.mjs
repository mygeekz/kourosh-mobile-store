import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import {
  resolveMiniAppLiveOriginUrl,
  resolveMiniAppPublicAccessMode,
  resolveTelegramMiniAppUrl,
} from "../server/connectivity/telegramPublicAccess.ts";
import { resolveMiniAppStableTunnelProvider } from "../server/connectivity/stableTunnelProvider.ts";
import { createMiniAppPublicUrlSyncService } from "../server/services/miniAppPublicUrlSync.service.ts";
import {
  buildMiniAppGatewayRuntimeConfig,
  readMiniAppGatewayRuntimeConfig,
  writeMiniAppGatewayRuntimeConfigFromSettings,
} from "../server/miniapp/miniAppGatewayRuntimeConfig.mjs";
import {
  buildCloudflareNamedTunnelConfig,
  isExpectedCloudflaredNamedTunnelProcess,
  normalizeStableLiveOriginUrl,
  resolveCloudflareNamedTunnelRuntime,
  startOrReuseWindowsStableTunnel,
  writeCloudflareNamedTunnelRuntimeConfig,
} from "./windows-miniapp-stable-tunnel-launcher.mjs";
import { coordinateWindowsMiniAppStartup } from "./windows-miniapp-startup-coordinator.mjs";

process.env.NODE_ENV = "test";
const publicUrl = "https://miniapp.example.com/miniapp.html";
const liveOrigin = "https://live-store.example.com/";
const tunnelId = "123e4567-e89b-42d3-a456-426614174000";
const settings = {
  miniapp_public_access_mode: "stable_tunnel",
  telegram_miniapp_public_url: publicUrl,
  miniapp_live_origin_url: liveOrigin,
  miniapp_stable_tunnel_provider: "cloudflare_named",
};

assert.equal(resolveMiniAppPublicAccessMode(settings, "production"), "stable_tunnel");
assert.equal(resolveTelegramMiniAppUrl(settings, "production"), publicUrl);
assert.equal(resolveMiniAppLiveOriginUrl(settings, "production"), liveOrigin);
assert.equal(resolveMiniAppStableTunnelProvider(settings), "cloudflare_named");
assert.equal(normalizeStableLiveOriginUrl("https://live-store.example.com/miniapp.html"), liveOrigin);
assert.equal(normalizeStableLiveOriginUrl("https://127.0.0.1:4180/"), null);

const preflightService = createMiniAppPublicUrlSyncService({
  getSettings: async () => settings,
  persistSettings: async () => undefined,
  writeRuntimeConfig: () => ({ mode: "stable_tunnel", expectedPublicHost: "live-store.example.com" }),
  syncMenu: async () => ({ state: "pending", message: null }),
  healthCheck: async () => ({ ok: true }),
  sleep: async () => undefined,
});
const preflight = await preflightService.preflight();
assert.equal(preflight.allowed, false, "Stable Production mode must be protected from Quick Tunnel overwrite");
assert.equal(preflight.protectedMode, "stable_tunnel");
assert.equal(preflight.startupAction, "stable_tunnel");
assert.equal(preflight.stableTunnel.publicUrl, publicUrl);
assert.equal(preflight.stableTunnel.liveOriginUrl, liveOrigin);

const gatewayConfig = buildMiniAppGatewayRuntimeConfig(settings);
assert.equal(gatewayConfig.mode, "stable_tunnel");
assert.equal(gatewayConfig.expectedPublicHost, "live-store.example.com", "Gateway Host must follow Live Origin, not BotFather/public Mini App host");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v164-stable-tunnel-"));
try {
  const credentialsFile = path.join(temp, `${tunnelId}.json`);
  fs.writeFileSync(credentialsFile, JSON.stringify({ AccountTag: "account", TunnelSecret: "secret-value", TunnelID: tunnelId }), { mode: 0o600 });
  const configFile = path.join(temp, "runtime", "cloudflare-named-tunnel.yml");
  const runtime = resolveCloudflareNamedTunnelRuntime(preflight, {
    env: {
      HOME: temp,
      KOUROSH_CLOUDFLARE_TUNNEL_ID: tunnelId,
      KOUROSH_CLOUDFLARE_TUNNEL_CREDENTIALS_FILE: credentialsFile,
      KOUROSH_CLOUDFLARE_TUNNEL_CONFIG_PATH: configFile,
    },
  });
  assert.equal(runtime.targetUrl, "http://127.0.0.1:4180");
  const yaml = buildCloudflareNamedTunnelConfig(runtime);
  assert.match(yaml, /service: http:\/\/127\.0\.0\.1:4180/);
  assert.match(yaml, /service: http_status:404/);
  assert.doesNotMatch(yaml, /127\.0\.0\.1:3001|localhost:3001/i);
  assert.doesNotMatch(yaml, /TunnelSecret|secret-value/);
  writeCloudflareNamedTunnelRuntimeConfig(runtime);
  const onDisk = fs.readFileSync(configFile, "utf8");
  assert.equal(onDisk, yaml);

  const runtimeConfigFile = path.join(temp, "miniapp-gateway.json");
  writeMiniAppGatewayRuntimeConfigFromSettings(settings, { configPath: runtimeConfigFile });
  const readBack = readMiniAppGatewayRuntimeConfig({ configPath: runtimeConfigFile });
  assert.equal(readBack.state, "valid");
  assert.equal(readBack.config.mode, "stable_tunnel");
  assert.equal(readBack.config.expectedPublicHost, "live-store.example.com");

  assert.equal(isExpectedCloudflaredNamedTunnelProcess({ commandLine: `cloudflared tunnel --config x.yml run ${tunnelId}` }, tunnelId), true);
  assert.equal(isExpectedCloudflaredNamedTunnelProcess({ commandLine: "cloudflared tunnel --url http://127.0.0.1:4180" }, tunnelId), false);

  let spawnArgs = null;
  const fakeChild = new EventEmitter(); fakeChild.pid = 8080; fakeChild.unref = () => {};
  const started = await startOrReuseWindowsStableTunnel(preflight, {
    allowNonWindows: true,
    env: {
      HOME: temp,
      KOUROSH_CLOUDFLARE_TUNNEL_ID: tunnelId,
      KOUROSH_CLOUDFLARE_TUNNEL_CREDENTIALS_FILE: credentialsFile,
      KOUROSH_CLOUDFLARE_TUNNEL_CONFIG_PATH: configFile,
    },
    waitForGateway: async () => true,
    inspectExisting: async () => [],
    ensureCloudflared: async () => ({ path: "cloudflared.exe", source: "test" }),
    spawnImpl: (_exe, args) => { spawnArgs = args; return fakeChild; },
  });
  assert.equal(started.action, "started");
  assert.deepEqual(spawnArgs, ["tunnel", "--config", configFile, "run", tunnelId]);
  assert.doesNotMatch(spawnArgs.join(" "), /secret-value|TunnelSecret/);
  assert.doesNotMatch(spawnArgs.join(" "), /3001/);

  const manualOnlyPreflight = await createMiniAppPublicUrlSyncService({
    getSettings: async () => ({ miniapp_public_access_mode: "disabled" }),
    persistSettings: async () => undefined,
    writeRuntimeConfig: () => ({ mode: "disabled", expectedPublicHost: null }),
    syncMenu: async () => ({ state: "pending", message: null }),
    healthCheck: async () => ({ ok: true }),
    sleep: async () => undefined,
  }).preflight();
  assert.equal(manualOnlyPreflight.allowed, true);
  assert.equal(manualOnlyPreflight.startupAction, "none", "Quick Tunnel must not auto-start during normal Production startup");
  const explicitQuickPreflight = await createMiniAppPublicUrlSyncService({
    getSettings: async () => ({ miniapp_public_access_mode: "disabled" }),
    persistSettings: async () => undefined,
    writeRuntimeConfig: () => ({ mode: "disabled", expectedPublicHost: null }),
    syncMenu: async () => ({ state: "pending", message: null }),
    healthCheck: async () => ({ ok: true }),
    sleep: async () => undefined,
  }).preflight({ intent: "quick_tunnel" });
  assert.equal(explicitQuickPreflight.startupAction, "quick_tunnel", "Quick Tunnel remains available as an explicit diagnostic helper");

  const output = { write() {} };
  let selectedLauncher = "";
  const coordinatorChild = new EventEmitter(); coordinatorChild.pid = 9090; coordinatorChild.unref = () => {};
  const coordinated = await coordinateWindowsMiniAppStartup({
    stdout: output,
    stderr: output,
    waitForBackendPort: async () => true,
    waitForPreflight: async () => preflight,
    ensureMiniAppBuild: () => ({ action: "reuse", built: false }),
    ensureGateway: async () => ({ action: "reuse" }),
    existsSync: () => true,
    spawnImpl: (_exe, args) => { selectedLauncher = String(args?.[0] || ""); return coordinatorChild; },
  });
  assert.match(selectedLauncher, /windows-miniapp-stable-tunnel-launcher\.mjs$/);
  assert.equal(coordinated.tunnel, "stable_started");

  let quickSpawned = false;
  const stableProtectedQuick = await createMiniAppPublicUrlSyncService({
    getSettings: async () => settings,
    persistSettings: async () => { throw new Error("must not persist"); },
    writeRuntimeConfig: () => { throw new Error("must not write"); },
    syncMenu: async () => ({ state: "pending", message: null }),
    healthCheck: async () => ({ ok: true }),
    sleep: async () => undefined,
  }).sync({ provider: "cloudflare_quick_tunnel", publicUrl: "https://temp.trycloudflare.com/miniapp.html" });
  assert.equal(stableProtectedQuick.skipped, true);
  assert.equal(stableProtectedQuick.protectedMode, "stable_tunnel");
  assert.equal(quickSpawned, false);

  console.log(JSON.stringify({
    status: "PASS",
    stablePublicUrlSeparatedFromLiveOrigin: true,
    quickTunnelCannotOverwriteProduction: true,
    quickTunnelManualOnlyByDefault: true,
    gatewayTargetsLiveOriginHost: true,
    cloudflaredOriginPort: 4180,
    backend3001Exposed: false,
    credentialsInCommandLine: false,
    startupDispatchesStableLauncher: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
