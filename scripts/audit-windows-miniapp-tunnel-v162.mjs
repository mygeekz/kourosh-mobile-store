import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const bytes = (file) => fs.readFileSync(path.join(root, file));

for (const file of fs.readdirSync(root).filter((name) => name.toLowerCase().endsWith(".bat"))) {
  assert.equal(bytes(file).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file} must not contain UTF-8 BOM`);
}

const httpsBat = read("start_https.bat");
const startupCoordinator = fs.existsSync(path.join(root, "scripts", "windows-miniapp-startup-coordinator.mjs"))
  ? read("scripts/windows-miniapp-startup-coordinator.mjs")
  : "";
assert.match(httpsBat, /windows-miniapp-startup-coordinator\.mjs/, "HTTPS launcher must defer Mini App startup until Backend readiness");
assert.match(startupCoordinator, /windows-miniapp-gateway-launcher\.mjs/, "Startup coordinator must reuse the existing Gateway launcher");
assert.match(startupCoordinator, /start_tunnel\.bat/, "Tunnel helper must remain optional");
assert.match(startupCoordinator, /KOUROSH_SKIP_MINIAPP_TUNNEL/i, "Tunnel helper must remain explicitly skippable");
assert.doesNotMatch(httpsBat, /cmd\s+\/k/i, "Nested cmd /k launcher is forbidden");

const tunnelBat = read("start_tunnel.bat");
assert.match(tunnelBat, /windows-miniapp-tunnel-launcher\.mjs/);
assert.doesNotMatch(tunnelBat, /powershell/i, "Cloudflared must not be piped through Windows PowerShell 5.1");

const helper = read("scripts/windows-miniapp-tunnel-launcher.mjs");
for (const fragment of [
  "http://127.0.0.1:4180",
  "cloudflared-windows-amd64.exe",
  "tools\", \"cloudflared\"",
  "miniapp_public_url.txt",
  "--no-autoupdate",
  "--url",
  "Get-CimInstance Win32_Process",
  "your quick tunnel has been created!",
  "api.trycloudflare.com",
  "createQuickTunnelOutputParser",
  "quickTunnelAttemptsExhausted",
]) assert.ok(helper.includes(fragment), `Tunnel helper missing ${fragment}`);
assert.match(helper, /RESERVED_TRYCLOUDFLARE_HOSTS/);
assert.match(helper, /maxAttempts[^\n]*3|Math\.min\(3/);
assert.match(helper, /2_000/);
assert.match(helper, /4_000/);
assert.doesNotMatch(helper, /127\.0\.0\.1:3001/, "Quick Tunnel must never expose backend port 3001");
assert.doesNotMatch(helper, /BOT_TOKEN|telegram_bot_token|initData|Authorization:\s*Bearer/i, "Tunnel helper must not reference application secrets");

const test = read("scripts/test-windows-miniapp-tunnel-v162.mjs");
assert.ok(test.includes('Post "https://api.trycloudflare.com/tunnel": context deadline exceeded'), "Real Windows API-timeout log must be regression-tested");
assert.ok(test.includes("Client.Timeout exceeded while awaiting headers"));
assert.ok(test.includes("chunk-boundary-host"));
assert.ok(test.includes("failedClipboard"));
assert.ok(test.includes("exhaustedAttempts"));

const gitignore = read(".gitignore");
assert.match(gitignore, /miniapp_public_url\.txt/);
assert.match(gitignore, /tools\/cloudflared\/cloudflared\.exe/);
assert.equal(fs.existsSync(path.join(root, "miniapp_public_url.txt")), false, "Generated public URL must not be committed");
assert.equal(fs.existsSync(path.join(root, "tools", "cloudflared", "cloudflared.exe")), false, "cloudflared.exe must not be bundled");

console.log(JSON.stringify({
  ok: true,
  batNoBom: true,
  gatewayLauncherReused: true,
  optionalTunnelHook: true,
  noNestedCmdK: true,
  nativeCommandErrorAvoidedByDirectSpawn: true,
  cloudflareIsolatedToWindowsHelper: true,
  targetOnlyGateway4180: true,
  reservedApiHostRejectedBySource: true,
  successMarkerParserPresent: true,
  boundedRetryPresent: true,
  realWindowsFailureRegressionPresent: true,
  chunkBoundaryRegressionPresent: true,
  failedSideEffectRegressionPresent: true,
  generatedUrlExcluded: true,
  cloudflaredBinaryExcluded: true,
}, null, 2));
