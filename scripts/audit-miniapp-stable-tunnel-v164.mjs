import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const publicAccess = read("server/connectivity/telegramPublicAccess.ts");
const provider = read("server/connectivity/stableTunnelProvider.ts");
const gatewayConfig = read("server/miniapp/miniAppGatewayRuntimeConfig.mjs");
const syncService = read("server/services/miniAppPublicUrlSync.service.ts");
const stableLauncher = read("scripts/windows-miniapp-stable-tunnel-launcher.mjs");
const quickLauncher = read("scripts/windows-miniapp-tunnel-launcher.mjs");
const coordinator = read("scripts/windows-miniapp-startup-coordinator.mjs");
const settings = read("server/routes/settings.routes.ts");

assert.match(publicAccess, /"stable_tunnel"/);
assert.match(publicAccess, /miniapp_live_origin_url/);
assert.match(provider, /cloudflare_named/);
assert.doesNotMatch(provider, /trycloudflare\.com|cfargotunnel\.com/i, "Core provider resolver must not hard-code Cloudflare hostnames");
assert.match(gatewayConfig, /mode === "stable_tunnel" \? settings\.miniapp_live_origin_url : settings\.telegram_miniapp_public_url/);
assert.match(syncService, /currentMode === "self_hosted" \|\| currentMode === "relay" \|\| currentMode === "stable_tunnel"/);
assert.match(syncService, /startupAction: publicUrl && liveOriginUrl && provider === "cloudflare_named" \? "stable_tunnel"/);
assert.match(stableLauncher, /DEFAULT_TARGET_URL = "http:\/\/127\.0\.0\.1:4180"/);
assert.match(stableLauncher, /http_status:404/);
assert.match(stableLauncher, /MINIAPP_BACKEND_DIRECT_EXPOSURE_FORBIDDEN/);
assert.doesNotMatch(stableLauncher, /--token|TUNNEL_TOKEN/, "v164 local Named Tunnel launcher must not put a remotely-managed tunnel token in source or CLI");
assert.match(stableLauncher, /Tunnel credentials remain local and are never printed/);
assert.match(quickLauncher, /development\/test helper only/);
assert.match(coordinator, /stableTunnelLauncher/);
assert.match(coordinator, /startupAction === "stable_tunnel"/);
assert.match(settings, /INVALID_MINIAPP_LIVE_ORIGIN_URL/);
assert.doesNotMatch(stableLauncher + syncService, /127\.0\.0\.1:3001[^\n]*(service|--url)/i);

console.log(JSON.stringify({
  status: "PASS",
  providerIndependentMode: "stable_tunnel",
  cloudflareAdapterIsolated: true,
  publicAndLiveUrlsSeparated: true,
  quickTunnelPreservedForDiagnostics: true,
  port3001NotTunnelOrigin: true,
  noTunnelTokenInCli: true,
}, null, 2));
