import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const router = await import('react-router-dom');
for (const name of ['HashRouter', 'Routes', 'Route', 'Link', 'NavLink', 'Navigate', 'Outlet', 'useNavigate', 'useLocation', 'useParams']) {
  assert.ok(router[name], `react-router-dom export ${name} is missing`);
}

const pwa = await import('vite-plugin-pwa');
assert.equal(typeof pwa.VitePWA, 'function', 'vite-plugin-pwa must export VitePWA');

const workboxBuild = await import('workbox-build');
assert.equal(typeof workboxBuild.generateSW, 'function', 'workbox-build must export generateSW');

/**
 * workbox-window is a browser-side package. Importing its runtime entry inside
 * Node is not a valid compatibility test because its public module is selected
 * and executed by the browser bundler. Verify installation/version here; the
 * following production build is the authoritative integration test.
 */
function resolveInstalledPackage(packageName) {
  const entryPath = require.resolve(packageName);
  let currentDir = path.dirname(entryPath);

  while (true) {
    const manifestPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name === packageName) {
        return { entryPath, manifestPath, manifest };
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Unable to locate package.json for ${packageName}`);
    }
    currentDir = parentDir;
  }
}



const archiverUtilsEntry = require.resolve('archiver-utils');
const archiverUtilsRequire = createRequire(archiverUtilsEntry);
const archiverGlobEntry = archiverUtilsRequire.resolve('glob');
const archiverGlobPackage = (() => {
  let currentDir = path.dirname(archiverGlobEntry);
  while (true) {
    const manifestPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name === 'glob') return { entryPath: archiverGlobEntry, manifestPath, manifest };
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) throw new Error('Unable to locate glob package used by archiver-utils');
    currentDir = parentDir;
  }
})();
assert.equal(archiverGlobPackage.manifest.version, '13.0.6', 'archiver-utils must resolve reviewed root glob@13.0.6');
const archiverGlobApi = archiverUtilsRequire('glob');
assert.equal(typeof archiverGlobApi.glob, 'function', 'glob must expose its async API to archiver-utils');
assert.equal(typeof archiverGlobApi.sync, 'function', 'glob must retain the sync alias required by archiver-utils');

const workboxBuildEntry = require.resolve('workbox-build');
const workboxBuildRequire = createRequire(workboxBuildEntry);
const workboxGlobEntry = workboxBuildRequire.resolve('glob');
const workboxGlobPackage = (() => {
  let currentDir = path.dirname(workboxGlobEntry);
  while (true) {
    const manifestPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name === 'glob') return { entryPath: workboxGlobEntry, manifestPath, manifest };
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) throw new Error('Unable to locate glob package used by workbox-build');
    currentDir = parentDir;
  }
})();
assert.equal(workboxGlobPackage.manifest.version, '11.1.0', 'workbox-build glob must remain unchanged during the isolated ExcelJS glob migration');

const magicStringPackage = resolveInstalledPackage('magic-string');
assert.equal(magicStringPackage.manifest.version, '0.30.21', 'magic-string must resolve to reviewed version 0.30.21');
const sourceMapCodecPackage = resolveInstalledPackage('@jridgewell/sourcemap-codec');
assert.equal(sourceMapCodecPackage.manifest.version, '1.5.5', '@jridgewell/sourcemap-codec must resolve to reviewed version 1.5.5');
try {
  require.resolve('sourcemap-codec');
  assert.fail('Deprecated sourcemap-codec must not be installed');
} catch (error) {
  assert.match(String(error?.code ?? ''), /MODULE_NOT_FOUND/, 'Unexpected error while checking deprecated sourcemap-codec');
}

const recharts = await import('recharts');
for (const name of ['ResponsiveContainer', 'AreaChart', 'Area', 'LineChart', 'Line', 'BarChart', 'Bar', 'PieChart', 'Pie', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'Legend']) {
  assert.ok(recharts[name], `recharts export ${name} is missing`);
}

const rechartsPackage = resolveInstalledPackage('recharts');
assert.equal(rechartsPackage.manifest.version, '3.8.1', 'recharts must resolve to reviewed version 3.8.1');
const reactPackage = resolveInstalledPackage('react');
const reactIsPackage = resolveInstalledPackage('react-is');
assert.equal(reactIsPackage.manifest.version, reactPackage.manifest.version, 'react-is must match the installed React version');

const workboxWindow = resolveInstalledPackage('workbox-window');
assert.equal(workboxWindow.manifest.version, '7.4.0', 'workbox-window must resolve to reviewed version 7.4.0');
assert.ok(fs.statSync(workboxWindow.entryPath).isFile(), 'workbox-window resolved entry must exist');

console.log('Reviewed Router/PWA/Recharts/source-map/glob package compatibility passed');
console.log(`[setup] workbox-window browser package resolved: ${workboxWindow.manifest.version}`);
console.log(`[setup] ExcelJS archiver glob chain: glob ${archiverGlobPackage.manifest.version} OK; Workbox glob ${workboxGlobPackage.manifest.version} unchanged`);
console.log(`[setup] Source-map chain: magic-string ${magicStringPackage.manifest.version} + @jridgewell/sourcemap-codec ${sourceMapCodecPackage.manifest.version} OK`);
console.log(`[setup] Recharts ${rechartsPackage.manifest.version} with react-is ${reactIsPackage.manifest.version} OK`);
