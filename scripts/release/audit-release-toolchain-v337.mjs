#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const pkg = JSON.parse(read("package.json"));
const nvmrc = read(".nvmrc").trim();
const nodeVersion = read(".node-version").trim();
const npmVersion = read(".npm-version").trim();
const source = read("KOUROSH_SOURCE_VERSION").trim();
const quality = read(".github/workflows/quality-gate.yml");
const partner = read(".github/workflows/partner-settlement-safety-guards.yml");
const release = read(".github/workflows/release-gate-v337.yml");

const sourceNumber = Number(source.replace(/^v/, ""));
assert.ok(Number.isInteger(sourceNumber) && sourceNumber >= 337, `release toolchain audit requires v337 or successor; found ${source}`);
assert.equal(nvmrc, "24.11.1", "Node runtime must stay pinned to 24.11.1");
assert.equal(nodeVersion, nvmrc, ".node-version must match .nvmrc");
assert.equal(npmVersion, "11.6.2", "npm runtime must stay pinned to 11.6.2 for Node 24.11.1");
assert.equal(pkg.packageManager, `npm@${npmVersion}`, "packageManager must match .npm-version");
assert.match(String(pkg.engines?.node || ""), />=24\.0\.0/, "package engines must retain Node 24+ compatibility");
for (const [name, text] of [["quality", quality], ["partner", partner]]) {
  assert.match(text, /node-version-file:\s*\.nvmrc/, `${name} workflow must consume .nvmrc`);
  assert.doesNotMatch(text, /node-version:\s*22\b/, `${name} workflow must not float on Node 22`);
}
assert.match(release, /actions\/cache@v4/, "release gate must persist a lock-keyed npm cache");
assert.match(release, /hashFiles\('package-lock\.json'\)/, "release cache key must include package-lock hash");
assert.match(release, /hashFiles\('\.nvmrc', '\.npm-version'\)/, "release cache key must include Node/npm pin hash");
assert.match(release, /ci:deps:v337:offline/, "fresh runner must replay dependency installation offline");
assert.match(release, /KOUROSH_REQUIRE_CACHE_MANIFEST:\s*['\"]?1['\"]?/, "offline replay must require cache manifest");
assert.match(release, /npm run audit:release/, "release workflow must run audit:release");
assert.match(release, /npm run build/, "release workflow must run production build");
assert.match(release, /npm run verify:miniapp/, "release workflow must run full MiniApp gate");
for (const key of ["ci:deps:v337", "ci:deps:v337:offline", "verify:release:toolchain-v337", "audit:release-toolchain-v337", "verify:release:v337"]) {
  assert.ok(pkg.scripts?.[key], `package script ${key} must exist`);
}
console.log(JSON.stringify({
  status: "PASS",
  release: source,
  pinnedNode: nvmrc,
  pinnedNpm: npmVersion,
  cacheStrategy: "package-lock keyed npm cache + fresh-runner offline replay",
  checks: 18,
}, null, 2));
