#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const cacheDir = path.resolve(process.env.KOUROSH_NPM_CACHE || path.join(root, ".cache", "npm"));
const offlineOnly = process.argv.includes("--offline");
const onlineOnly = process.argv.includes("--online");
const pinnedNode = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const pinnedNpm = fs.readFileSync(path.join(root, ".npm-version"), "utf8").trim();
const lockPath = path.join(root, "package-lock.json");
const lockSha256 = crypto.createHash("sha256").update(fs.readFileSync(lockPath)).digest("hex");

if (process.versions.node !== pinnedNode) {
  console.error(`FAIL release dependency bootstrap requires Node ${pinnedNode}; current ${process.versions.node}`);
  process.exit(1);
}

const actualNpmVersion = spawnSync(npmCommand, ["--version"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "unknown";
if (actualNpmVersion !== pinnedNpm) {
  console.error(`FAIL release dependency bootstrap requires npm ${pinnedNpm}; current ${actualNpmVersion}`);
  process.exit(1);
}

fs.mkdirSync(cacheDir, { recursive: true });

const baseArgs = ["ci", "--cache", cacheDir, "--no-audit", "--no-fund"];
function runInstall(extraArgs, label) {
  console.log(`\n[deps] ${label}`);
  const child = spawnSync(npmCommand, [...baseArgs, ...extraArgs], {
    cwd: root,
    env: {
      ...process.env,
      npm_config_update_notifier: "false",
      ...(offlineOnly || extraArgs.includes("--offline") ? { npm_config_registry: "http://127.0.0.1:9" } : {}),
    },
    encoding: "utf8",
    stdio: "inherit",
  });
  return child.status === 0;
}

let mode = "offline";
let ok = false;
if (!onlineOnly) {
  ok = runInstall(["--offline"], "locked offline install from local npm cache");
}
if (!ok && !offlineOnly) {
  mode = "prefer-offline";
  ok = runInstall(["--prefer-offline"], "cache-seeding install with registry fallback");
}
if (!ok) {
  console.error("FAIL locked dependency installation. Offline mode never falls back when --offline is supplied.");
  process.exit(1);
}

const npmVersion = spawnSync(npmCommand, ["--version"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "unknown";
const manifest = {
  schemaVersion: 1,
  release: fs.readFileSync(path.join(root, "KOUROSH_SOURCE_VERSION"), "utf8").trim(),
  node: process.versions.node,
  npm: npmVersion,
  packageLockSha256: lockSha256,
  installMode: mode,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(cacheDir, "kourosh-cache-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", cacheDir, ...manifest }, null, 2));
