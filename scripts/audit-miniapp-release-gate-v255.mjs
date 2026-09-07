import assert from "node:assert/strict";
import fs from "node:fs";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("config/quality/miniapp-release-gate-v255.json"));
const runner = read("scripts/verify-miniapp-release-v255.mjs");
const recovery = read("scripts/test-miniapp-live-recovery-v236.mjs");
const autoTunnel = read("scripts/audit-miniapp-auto-tunnel-v163.mjs");

assert.ok(Number(KOUROSH_RELEASE.slice(1)) >= 255, `expected v255 or a compatible successor; found ${KOUROSH_RELEASE}`);
assert.equal(manifest.release, "v255");
assert.equal(pkg.scripts["verify:miniapp:source"], "node scripts/verify-miniapp-release-v255.mjs --source");
assert.equal(pkg.scripts["verify:miniapp"], "node scripts/verify-miniapp-release-v255.mjs --full");
assert.equal(pkg.scripts["test:v255"], "npm run verify:miniapp:source");
assert.match(runner, /No failed check is converted to a warning or silently skipped/);

const sourceScripts = manifest.sourceGate.map((item) => item.script);
const fullScripts = manifest.fullGate.map((item) => item.script);
const excludedScripts = manifest.historicalExcluded.map((item) => item.script);
assert.equal(new Set(sourceScripts).size, sourceScripts.length, "source gate scripts must be unique");
assert.equal(new Set(fullScripts).size, fullScripts.length, "full gate scripts must be unique");
for (const script of [...sourceScripts, ...fullScripts]) assert.ok(pkg.scripts[script], `release-gate npm script is missing: ${script}`);
for (const script of excludedScripts) {
  assert.ok(pkg.scripts[script], `historical excluded script must remain explicitly addressable: ${script}`);
  assert.equal(sourceScripts.includes(script) || fullScripts.includes(script), false, `historical drift script leaked into active release gate: ${script}`);
}

for (const required of [
  "audit:miniapp-new-identity-sync-v248",
  "test:miniapp-snapshot-contract-v165",
  "test:miniapp-snapshot-sync-v166",
  "test:miniapp-snapshot-runtime-v192",
  "test:miniapp-offline-edge-v192",
  "test:miniapp-edge-v167",
  "test:miniapp-live-refresh-v235",
  "test:miniapp-live-recovery-v236",
  "audit:miniapp-api-envelope-v176",
  "audit:miniapp-telegram-backbutton-v177",
  "test:telegram-stable-url-v169",
]) assert.ok(sourceScripts.includes(required), `source gate missing required contract: ${required}`);

for (const required of [
  "verify:miniapp:environment-v255",
  "typecheck:miniapp",
  "typecheck:miniapp-server",
  "test:miniapp-staff-v149",
  "test:telegram-authorization-v148",
  "audit:miniapp-production-readiness",
  "build:miniapp",
  "test:miniapp-build-isolation-v150",
  "test:miniapp-runtime",
  "test:miniapp-gateway-browser-v150",
  "miniapp:cloudflare:prepare",
  "verify:miniapp:built-v255",
]) assert.ok(fullScripts.includes(required), `full gate missing required release check: ${required}`);

assert.doesNotMatch(recovery, /Snapshot Sync:/, "v236 regression must not depend on obsolete English Settings copy");
assert.match(recovery, /همگام‌سازی اطلاعات:/, "v236 regression must assert the current localized snapshot status contract");
assert.doesNotMatch(autoTunnel, /Telegram Menu:/, "auto-tunnel audit must not depend on obsolete English Settings copy");
assert.match(autoTunnel, /منوی تلگرام:/, "auto-tunnel audit must assert the current localized Telegram-menu status contract");

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  sourceChecks: sourceScripts.length,
  fullOnlyChecks: fullScripts.length,
  historicalExcluded: excludedScripts.length,
  failClosed: true,
  driftRegistryExplicit: true,
}, null, 2));
