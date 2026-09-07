import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const bat = read("start_https.bat");
const coordinator = read("scripts/windows-miniapp-startup-coordinator.mjs");
const lifecycle = read("server/bootstrap/serverLifecycle.ts");
const stable = read("scripts/windows-miniapp-stable-tunnel-launcher.mjs");
const pwaEnsure = read("scripts/ensure-local-pwa-build.mjs");
const miniEnsure = read("scripts/ensure-miniapp-build.mjs");

assert.doesNotMatch(bat, /node scripts\\ensure-miniapp-build\.mjs/i);
assert.match(bat, /Local Kourosh does not wait for Mini App build, Tunnel or Cloud connectivity/i);
assert.match(coordinator, /ensureMiniAppBuild/);
assert.match(coordinator, /DEFAULT_BACKEND_PORT_WAIT_MS = 30_000/);
assert.match(coordinator, /DEFAULT_PREFLIGHT_WAIT_MS = 5_000/);
assert.match(lifecycle, /Mandatory local startup ends here/);
assert.ok(lifecycle.indexOf("app.listen(port, bindHost") < lifecycle.indexOf("initializeCloudConnectorRuntime(runtimeSettings"));
assert.ok(lifecycle.indexOf("app.listen(port, bindHost") < lifecycle.indexOf("configureTelegramTransportRuntime(runtimeSettings"));
assert.match(stable, /KOUROSH_STABLE_TUNNEL_HEALTH_WAIT_MS/);
assert.match(pwaEnsure, /Valid production output found; reusing dist\/ without rebuild/);
assert.match(miniEnsure, /Production bundle is ready; reusing dist-miniapp\//);
for (const text of [bat, coordinator, lifecycle, stable]) assert.doesNotMatch(text, /300\s*second|300_000|5\s*\*\s*60_000/i);

console.log(JSON.stringify({ status: "PASS", phase: 10, customCssTouched: false }, null, 2));
