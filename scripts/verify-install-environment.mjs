import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execNpmSync } from './npm-cli-runner.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

function parseVersion(input) {
  const match = String(input).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersion(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
}

function fail(message) {
  console.error(`\n[setup] ERROR: ${message}\n`);
  process.exit(1);
}

const nodeVersion = parseVersion(process.versions.node);
if (!nodeVersion) fail(`Unable to parse Node.js version: ${process.versions.node}`);

const node22Supported = nodeVersion.major === 22 && compareVersion(nodeVersion, { major: 22, minor: 17, patch: 0 }) >= 0;
const node24OrNewer = nodeVersion.major >= 24;
if (!node22Supported && !node24OrNewer) {
  fail(`Node.js ${process.versions.node} is unsupported. Install Node.js 22.17.0+ or Node.js 24+ before setup.`);
}

let npmRaw = '';
try {
  npmRaw = execNpmSync(['--version'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  fail(`npm is not available: ${error instanceof Error ? error.message : String(error)}`);
}

const npmVersion = parseVersion(npmRaw);
if (!npmVersion) fail(`Unable to parse npm version: ${npmRaw}`);
if (npmVersion.major < 10) {
  fail(`npm ${npmRaw} is unsupported. Install npm 10.9.2+; npm 11.18.0 is recommended.`);
}

if (!fs.existsSync(packagePath) || !fs.existsSync(lockPath)) {
  fail('package.json or package-lock.json is missing. Setup requires the complete project ZIP.');
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
if (lockJson.lockfileVersion !== 3) {
  fail(`Unsupported package-lock format: ${lockJson.lockfileVersion}. Expected lockfileVersion 3.`);
}

const approvedScripts = packageJson.allowScripts ?? {};
const pendingScripts = [];
for (const [packageLocation, metadata] of Object.entries(lockJson.packages ?? {})) {
  if (!packageLocation || !metadata?.hasInstallScript) continue;
  if (metadata.optional && metadata.os && !metadata.os.includes(process.platform)) continue;

  const marker = 'node_modules/';
  const markerIndex = packageLocation.lastIndexOf(marker);
  const packageName = metadata.name || (markerIndex >= 0 ? packageLocation.slice(markerIndex + marker.length) : packageLocation);
  const pinnedIdentity = `${packageName}@${metadata.version}`;
  if (approvedScripts[pinnedIdentity] !== true && approvedScripts[packageName] !== true) {
    pendingScripts.push(pinnedIdentity);
  }
}

if (pendingScripts.length) {
  fail(`Install scripts are not approved for: ${pendingScripts.join(', ')}`);
}

console.log(`[setup] Node.js ${process.versions.node} OK`);
console.log(`[setup] npm ${npmRaw} OK`);
console.log(`[setup] package-lock v${lockJson.lockfileVersion} OK`);
console.log(`[setup] approved install scripts: ${Object.keys(approvedScripts).join(', ')}`);
if (npmVersion.major < 11) {
  console.log('[setup] Note: npm 11.18.0 is recommended for native allowScripts enforcement.');
}
