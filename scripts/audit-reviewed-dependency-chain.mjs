import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const packages = lock.packages || {};
const versionOf = (name) => packages[`node_modules/${name}`]?.version ?? null;

assert.equal(pkg.overrides?.glob, '13.0.6', 'The default transitive glob version must stay on reviewed release 13.0.6');
assert.equal(pkg.overrides?.['workbox-build']?.glob, '11.1.0', 'Workbox must retain its isolated glob 11 compatibility line');
assert.equal(pkg.overrides?.['magic-string'], '0.30.21', 'magic-string must stay on the reviewed @jridgewell-based release 0.30.21');
assert.equal(pkg.overrides?.['@jridgewell/sourcemap-codec'], '1.5.5', '@jridgewell/sourcemap-codec must stay pinned to reviewed release 1.5.5');
assert.equal(pkg.dependencies?.['react-router-dom'], '7.18.1', 'react-router-dom must stay on reviewed security release 7.18.1');
assert.equal(pkg.devDependencies?.['vite-plugin-pwa'], '1.2.0', 'vite-plugin-pwa must stay pinned to reviewed release 1.2.0');
assert.equal(pkg.devDependencies?.['workbox-build'], '7.4.0', 'workbox-build must stay pinned to reviewed release 7.4.0');
assert.equal(pkg.devDependencies?.['workbox-window'], '7.4.0', 'workbox-window must stay pinned to reviewed release 7.4.0');
assert.equal(pkg.dependencies?.recharts, '3.8.1', 'recharts must stay pinned to reviewed release 3.8.1');
assert.equal(pkg.dependencies?.['react-is'], '18.3.1', 'react-is must match the installed React 18.3.1 runtime');
assert.equal(Object.hasOwn(pkg.devDependencies || {}, '@eslint/eslintrc'), false, '@eslint/eslintrc must not be a direct project dependency');

assert.equal(packages['node_modules/glob']?.version, '13.0.6', 'ExcelJS/archiver chain must resolve the root glob@13.0.6');
assert.equal(packages['node_modules/workbox-build/node_modules/glob']?.version, '11.1.0', 'Workbox must retain its isolated nested glob@11.1.0');
assert.equal(versionOf('magic-string'), '0.30.21', 'Lockfile must resolve magic-string@0.30.21');
assert.equal(versionOf('@jridgewell/sourcemap-codec'), '1.5.5', 'Lockfile must resolve @jridgewell/sourcemap-codec@1.5.5');
assert.equal(Object.keys(packages).some((location) => location === 'node_modules/sourcemap-codec' || location.endsWith('/node_modules/sourcemap-codec')), false, 'Deprecated sourcemap-codec package must not remain anywhere in the lockfile');
assert.equal(versionOf('react-router-dom'), '7.18.1', 'Lockfile must resolve react-router-dom@7.18.1');
assert.equal(versionOf('react-router'), '7.18.1', 'Lockfile must resolve react-router@7.18.1');
assert.equal(versionOf('vite-plugin-pwa'), '1.2.0', 'Lockfile must resolve vite-plugin-pwa@1.2.0');
assert.equal(versionOf('workbox-build'), '7.4.0', 'Lockfile must resolve workbox-build@7.4.0');
assert.equal(versionOf('workbox-window'), '7.4.0', 'Lockfile must resolve workbox-window@7.4.0');
assert.equal(versionOf('recharts'), '3.8.1', 'Lockfile must resolve recharts@3.8.1');
assert.equal(versionOf('react-is'), versionOf('react'), 'react-is and react must resolve to the same version');

for (const [location, metadata] of Object.entries(packages)) {
  const name = location.split('/node_modules/').at(-1);
  if (name === 'glob' && /^(7|10)\./.test(String(metadata?.version ?? ''))) {
    throw new Error(`Deprecated glob@${metadata.version} remains at ${location}`);
  }
}

assert.equal(Boolean(packages['node_modules/@trickfilm400/rollup-plugin-off-main-thread']), false,
  'Vulnerable @trickfilm400 off-main-thread plugin must not remain in the lockfile');

console.log('Reviewed dependency-chain audit passed (glob 13 default; Workbox glob 11 isolated)');
