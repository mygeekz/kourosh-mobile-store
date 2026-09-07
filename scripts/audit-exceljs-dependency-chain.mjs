import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

assert.equal(pkg.dependencies?.exceljs, '^4.4.0', 'Official exceljs dependency must remain pinned to the approved major');
assert.deepEqual(pkg.overrides?.exceljs, {
  archiver: '7.0.1',
  'fast-csv': '5.0.5',
  unzipper: '0.12.3',
}, 'ExcelJS overrides must match the reviewed compatibility set');
assert.equal(pkg.overrides?.glob, '13.0.6', 'ExcelJS/archiver must receive reviewed glob@13.0.6 through the root override');
assert.equal(pkg.overrides?.['workbox-build']?.glob, '11.1.0', 'Workbox glob must remain explicitly isolated from the ExcelJS glob migration');

const packages = lock.packages || {};
const versionOf = (name) => packages[`node_modules/${name}`]?.version;
assert.equal(versionOf('exceljs'), '4.4.0', 'Lockfile must retain official exceljs@4.4.0');
assert.equal(versionOf('archiver'), '7.0.1', 'Lockfile must resolve archiver@7.0.1');
assert.equal(versionOf('fast-csv'), '5.0.5', 'Lockfile must resolve fast-csv@5.0.5');
assert.equal(versionOf('unzipper'), '0.12.3', 'Lockfile must resolve unzipper@0.12.3');
assert.equal(packages['node_modules/glob']?.version, '13.0.6', 'Lockfile must resolve root glob@13.0.6 for archiver-utils');
assert.equal(packages['node_modules/workbox-build/node_modules/glob']?.version, '11.1.0', 'Workbox glob must remain nested and isolated');

const forbidden = ['inflight', 'fstream', 'lodash.isequal'];
for (const name of forbidden) {
  assert.equal(Boolean(packages[`node_modules/${name}`]), false, `${name} must not remain in the installed dependency graph`);
}

for (const [key, meta] of Object.entries(packages)) {
  const name = key.split('/node_modules/').at(-1);
  const version = String(meta?.version || '');
  if (name === 'glob' && /^(7|10)\./.test(version)) {
    throw new Error(`${name}@${version} remains at ${key}`);
  }
  if (name === 'rimraf' && /^2\./.test(version)) {
    throw new Error(`${name}@${version} remains at ${key}`);
  }
}

console.log('ExcelJS dependency-chain audit passed (archiver-utils + root glob 13.0.6)');
