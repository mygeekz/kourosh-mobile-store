import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execNpmSync } from './npm-cli-runner.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

const expected = Object.freeze({
  exceljs: '4.4.0',
  archiver: '7.0.1',
  'fast-csv': '5.0.5',
  unzipper: '0.12.3',
  'react-router-dom': '7.18.1',
  'react-router': '7.18.1',
  'vite-plugin-pwa': '1.2.0',
  'workbox-build': '7.4.0',
  'workbox-window': '7.4.0',
  recharts: '3.8.1',
  'react-is': '18.3.1',
  'magic-string': '0.30.21',
  '@jridgewell/sourcemap-codec': '1.5.5',
});

class LockfileSyncMismatch extends Error {
  constructor(message) {
    super(message);
    this.name = 'LockfileSyncMismatch';
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function packageVersion(lock, packageName) {
  return lock.packages?.[`node_modules/${packageName}`]?.version ?? null;
}

function packageAt(lock, location) {
  return lock.packages?.[location]?.version ?? null;
}

function allPackageLocations(lock, packageName) {
  return Object.entries(lock.packages ?? {})
    .filter(([location]) => location === `node_modules/${packageName}` || location.endsWith(`/node_modules/${packageName}`))
    .map(([location, metadata]) => `${location}@${metadata?.version ?? 'unknown'}`);
}

function lockIsPrepared(lock) {
  return Object.entries(expected).every(([name, version]) => packageVersion(lock, name) === version)
    && packageAt(lock, 'node_modules/glob') === '13.0.6'
    && packageAt(lock, 'node_modules/workbox-build/node_modules/glob') === '11.1.0'
    && !lock.packages?.['node_modules/inflight']
    && !lock.packages?.['node_modules/fstream']
    && !lock.packages?.['node_modules/lodash.isequal']
    && !lock.packages?.['node_modules/@trickfilm400/rollup-plugin-off-main-thread']
    && !Object.keys(lock.packages ?? {}).some((location) => location === 'node_modules/sourcemap-codec' || location.endsWith('/node_modules/sourcemap-codec'))
    && !Object.entries(lock.packages ?? {}).some(([location, metadata]) => {
      const name = location.split('/node_modules/').at(-1);
      const version = String(metadata?.version ?? '');
      return (name === 'glob' && (version.startsWith('7.') || version.startsWith('10.'))) || (name === 'rimraf' && version.startsWith('2.'));
    });
}

function describeMismatch(lock) {
  const problems = [];
  for (const [name, version] of Object.entries(expected)) {
    const actual = packageVersion(lock, name);
    if (actual !== version) problems.push(`${name}: expected ${version}, found ${actual ?? 'missing'}`);
  }
  const rootGlob = packageAt(lock, 'node_modules/glob');
  const workboxGlob = packageAt(lock, 'node_modules/workbox-build/node_modules/glob');
  if (rootGlob !== '13.0.6') problems.push(`ExcelJS/archiver glob: expected node_modules/glob@13.0.6, found ${rootGlob ?? 'missing'}`);
  if (workboxGlob !== '11.1.0') problems.push(`Workbox glob: expected nested glob@11.1.0, found ${workboxGlob ?? 'missing'}`);
  const globLocations = allPackageLocations(lock, 'glob');
  if (globLocations.length) problems.push(`resolved glob locations: ${globLocations.join(', ')}`);
  return problems.join('; ');
}

if (!fs.existsSync(packagePath) || !fs.existsSync(lockPath)) {
  console.error('[setup] ERROR: package.json or package-lock.json is missing.');
  process.exit(1);
}

const pkg = readJson(packagePath);
const expectedExcelOverrides = { archiver: '7.0.1', 'fast-csv': '5.0.5', unzipper: '0.12.3' };
if (JSON.stringify(pkg.overrides?.exceljs) !== JSON.stringify(expectedExcelOverrides)) {
  console.error('[setup] ERROR: Reviewed ExcelJS overrides are missing or changed.');
  process.exit(1);
}

if (pkg.overrides?.glob !== '13.0.6'
  || pkg.overrides?.['workbox-build']?.glob !== '11.1.0'
  || pkg.overrides?.['magic-string'] !== '0.30.21'
  || pkg.overrides?.['@jridgewell/sourcemap-codec'] !== '1.5.5'
  || pkg.dependencies?.['react-router-dom'] !== '7.18.1'
  || pkg.devDependencies?.['vite-plugin-pwa'] !== '1.2.0'
  || pkg.devDependencies?.['workbox-build'] !== '7.4.0'
  || pkg.devDependencies?.['workbox-window'] !== '7.4.0'
  || pkg.dependencies?.recharts !== '3.8.1'
  || pkg.dependencies?.['react-is'] !== '18.3.1') {
  console.error('[setup] ERROR: Reviewed Router/PWA/Recharts/source-map/glob dependency pins are missing or changed.');
  process.exit(1);
}

const initialLock = readJson(lockPath);
if (lockIsPrepared(initialLock)) {
  console.log('[setup] Reviewed dependency chain is already synchronized.');
  execFileSync(process.execPath, ['scripts/audit-exceljs-dependency-chain.mjs'], { cwd: rootDir, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/audit-reviewed-dependency-chain.mjs'], { cwd: rootDir, stdio: 'inherit' });
  process.exit(0);
}

const backupPath = path.join(os.tmpdir(), `kourosh-package-lock-${process.pid}-${Date.now()}.json`);
fs.copyFileSync(lockPath, backupPath);

console.log('[setup] Synchronizing reviewed dependency versions in package-lock.json...');
let npmCommandFailed = false;
try {
  // npm has historically failed to re-evaluate newly added scoped overrides when
  // an existing lockfile is present. A targeted update forces Arborist to rebuild
  // the glob nodes while the global glob override and the Workbox exception keep
  // the two chains isolated and deterministic.
  try {
    execNpmSync([
      'update', 'glob', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online', '--loglevel=error',
    ], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, npm_config_update_notifier: 'false' },
    });

    execNpmSync([
      'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online', '--loglevel=error',
    ], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, npm_config_update_notifier: 'false' },
    });
  } catch (error) {
    npmCommandFailed = true;
    throw error;
  }

  const updatedLock = readJson(lockPath);
  if (!lockIsPrepared(updatedLock)) {
    throw new LockfileSyncMismatch(`npm completed, but the lockfile did not match the reviewed dependency contract. ${describeMismatch(updatedLock)}`);
  }

  execFileSync(process.execPath, ['scripts/audit-exceljs-dependency-chain.mjs'], { cwd: rootDir, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/audit-reviewed-dependency-chain.mjs'], { cwd: rootDir, stdio: 'inherit' });
  console.log('[setup] Reviewed dependency chain synchronized successfully.');
} catch (error) {
  fs.copyFileSync(backupPath, lockPath);
  console.error('\n[setup] ERROR: Unable to synchronize the reviewed dependency chain.');
  console.error('[setup] The original package-lock.json was restored; no partial lockfile was kept.');
  if (npmCommandFailed) {
    console.error('[setup] npm could not complete the targeted lockfile update. Check the npm error shown above and your registry/network access.');
  } else if (error instanceof LockfileSyncMismatch) {
    console.error('[setup] npm completed successfully, but did not apply the required dependency layout. This is a lockfile/override mismatch, not a network failure.');
  }
  console.error(`[setup] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(backupPath, { force: true });
}
