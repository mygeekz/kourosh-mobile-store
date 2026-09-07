#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const pinnedNode = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const nodeVersionFile = fs.readFileSync(path.join(root, ".node-version"), "utf8").trim();
const pinnedNpm = fs.readFileSync(path.join(root, ".npm-version"), "utf8").trim();
const sourceVersion = fs.readFileSync(path.join(root, "KOUROSH_SOURCE_VERSION"), "utf8").trim();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lockPath = path.join(root, "package-lock.json");
const lockSha256 = crypto.createHash("sha256").update(fs.readFileSync(lockPath)).digest("hex");
const cacheDir = path.resolve(process.env.KOUROSH_NPM_CACHE || path.join(root, ".cache", "npm"));
const cacheManifestPath = path.join(cacheDir, "kourosh-cache-manifest.json");
const requiredPackages = ["typescript", "vite", "tsx", "react", "react-dom", "puppeteer-core", "jalali-moment"];
const missingPackages = requiredPackages.filter((name) => !fs.existsSync(path.join(root, "node_modules", name, "package.json")));
const npmVersion = spawnSync(npmCommand, ["--version"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "0.0.0";
const npmMajor = Number(npmVersion.split(".")[0] || 0);
let cacheManifest = null;
if (fs.existsSync(cacheManifestPath)) {
  cacheManifest = JSON.parse(fs.readFileSync(cacheManifestPath, "utf8"));
}
const requireCacheManifest = process.env.KOUROSH_REQUIRE_CACHE_MANIFEST === "1";
const checks = {
  sourceIsV337OrSuccessor: Number(sourceVersion.replace(/^v/, "")) >= 337,
  nodePinFilesMatch: pinnedNode === nodeVersionFile,
  exactPinnedNodeRuntime: process.versions.node === pinnedNode,
  npmSupported: npmMajor >= 10 && npmMajor < 12,
  exactPinnedNpmRuntime: npmVersion === pinnedNpm,
  packageManagerPinned: packageJson.packageManager === `npm@${pinnedNpm}`,
  dependenciesInstalled: missingPackages.length === 0,
  cacheManifestPresentWhenRequired: !requireCacheManifest || Boolean(cacheManifest),
  cacheMatchesRelease: !cacheManifest || cacheManifest.release === sourceVersion,
  cacheMatchesLock: !cacheManifest || cacheManifest.packageLockSha256 === lockSha256,
  cacheMatchesNode: !cacheManifest || cacheManifest.node === pinnedNode,
  cacheMatchesNpm: !cacheManifest || cacheManifest.npm === pinnedNpm,
};
const status = Object.values(checks).every(Boolean) ? "PASS" : "FAIL";
console.log(JSON.stringify({
  status,
  sourceVersion,
  pinnedNode,
  currentNode: process.versions.node,
  npmVersion,
  pinnedNpm,
  packageManager: packageJson.packageManager,
  packageLockSha256: lockSha256,
  cacheDir,
  cacheManifest: cacheManifest ? {
    release: cacheManifest.release,
    node: cacheManifest.node,
    npm: cacheManifest.npm,
    packageLockSha256: cacheManifest.packageLockSha256,
    installMode: cacheManifest.installMode,
  } : null,
  missingPackages,
  checks,
}, null, 2));
if (status !== "PASS") process.exit(1);
