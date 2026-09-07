import assert from "node:assert/strict";
import fs from "node:fs";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("config/quality/miniapp-release-gate-v256.json"));
const runner = read("scripts/verify-miniapp-release-v256.mjs");

assert.equal(KOUROSH_RELEASE, "v256");
assert.equal(manifest.release, "v256");
assert.equal(manifest.schemaVersion, 2);
assert.equal(manifest.releaseCandidate, true);
assert.equal(pkg.scripts["verify:miniapp:source"], "node scripts/verify-miniapp-release-v256.mjs --source");
assert.equal(pkg.scripts["verify:miniapp"], "node scripts/verify-miniapp-release-v256.mjs --full");
assert.equal(pkg.scripts["test:v256"], "npm run verify:miniapp:source");
assert.match(runner, /No failed check is converted to a warning or silently skipped/);

const sourceScripts = manifest.sourceGate.map((item) => item.script);
const fullScripts = manifest.fullGate.map((item) => item.script);
const evidenceScripts = manifest.externalEvidenceGate.map((item) => item.script);
assert.equal(new Set(sourceScripts).size, sourceScripts.length, "source gate scripts must be unique");
assert.equal(new Set(fullScripts).size, fullScripts.length, "full gate scripts must be unique");
assert.equal(new Set(evidenceScripts).size, evidenceScripts.length, "evidence gate scripts must be unique");
for (const script of [...sourceScripts, ...fullScripts, ...evidenceScripts]) assert.ok(pkg.scripts[script], `release-gate npm script is missing: ${script}`);

for (const required of [
  "audit:miniapp-release-v256",
  "audit:miniapp-rc-v256",
  "test:miniapp-rc-evidence-verifier-v256",
  "test:miniapp-rc-role-matrix-v256",
  "test:miniapp-rc-infrastructure-matrix-v256",
  "audit:miniapp-new-identity-sync-v248",
  "test:miniapp-snapshot-runtime-v192",
  "test:miniapp-offline-edge-v192",
  "test:miniapp-live-refresh-v235",
  "test:miniapp-live-recovery-v236",
]) assert.ok(sourceScripts.includes(required), `source gate missing required RC contract: ${required}`);

for (const required of [
  "verify:miniapp:environment-v256",
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
  "verify:miniapp:built-v256",
]) assert.ok(fullScripts.includes(required), `full gate missing required release check: ${required}`);
assert.deepEqual(evidenceScripts, ["verify:miniapp:rc:evidence-v256"]);

for (const entry of manifest.historicalExcluded) {
  assert.ok(pkg.scripts[entry.script], `historical excluded script must remain addressable: ${entry.script}`);
  assert.equal(sourceScripts.includes(entry.script) || fullScripts.includes(entry.script), false, `historical excluded script leaked into active gate: ${entry.script}`);
}

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  sourceChecks: sourceScripts.length,
  fullOnlyChecks: fullScripts.length,
  externalEvidenceChecks: evidenceScripts.length,
  failClosed: true,
  releaseCandidateEvidenceRequired: true,
}, null, 2));
