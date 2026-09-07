import fs from 'node:fs';
import path from 'node:path';
import {
  getOrderedRuntimeImports,
  projectRoot,
  readStyleManifest,
  renderStyleBootstrap,
  toPosix,
  walkFiles,
} from './ui-system/style-manifest-utils.mjs';

const manifest = readStyleManifest();
const failures = [];
const validStatuses = new Set([
  'provisional-canonical',
  'generated',
  'source',
  'compatibility',
  'migrating',
  'quarantined',
  'dormant',
]);
const validDelivery = new Set(['direct', 'bundled-source', 'miniapp-bundled-source', 'dormant']);

const fail = (message) => failures.push(message);

if (manifest.schemaVersion !== 1) fail('style manifest schemaVersion must be 1');
if (manifest.runtimeEntry !== 'app/bootstrap/styles.ts') fail('runtimeEntry must remain app/bootstrap/styles.ts');
if (manifest.manualBootstrapEditsAllowed !== false) fail('manualBootstrapEditsAllowed must remain false');

const localPaths = manifest.localStyles.map((entry) => entry.path);
const localPathSet = new Set(localPaths);
if (localPathSet.size !== localPaths.length) fail('style manifest contains duplicate local CSS paths');

const ids = [
  ...manifest.externalStyles.map((entry) => entry.id),
  ...manifest.localStyles.map((entry) => entry.id),
];
if (new Set(ids).size !== ids.length) fail('style manifest contains duplicate ids');

const actualCssFiles = walkFiles(projectRoot, (file) => file.endsWith('.css'))
  .map((file) => toPosix(path.relative(projectRoot, file)))
  .filter((file) => !file.startsWith('node_modules/') && !file.startsWith('dist/'))
  .sort();
const registeredCssFiles = [...localPaths].sort();

for (const file of actualCssFiles) {
  if (!localPathSet.has(file)) fail(`unregistered CSS file: ${file}`);
}
for (const file of registeredCssFiles) {
  if (!fs.existsSync(path.join(projectRoot, file))) fail(`registered CSS file does not exist: ${file}`);
}
if (actualCssFiles.length !== registeredCssFiles.length) {
  fail(`CSS inventory mismatch: ${actualCssFiles.length} files exist, ${registeredCssFiles.length} are registered`);
}

for (const entry of manifest.localStyles) {
  if (!validStatuses.has(entry.status)) fail(`${entry.path}: invalid status ${entry.status}`);
  if (!validDelivery.has(entry.delivery)) fail(`${entry.path}: invalid delivery ${entry.delivery}`);
  if (entry.delivery === 'direct') {
    if (!Number.isInteger(entry.bootstrapOrder)) fail(`${entry.path}: direct style needs bootstrapOrder`);
    const expectedSpecifier = `../../${entry.path}`;
    if (entry.importSpecifier !== expectedSpecifier) {
      fail(`${entry.path}: importSpecifier must be ${expectedSpecifier}`);
    }
    if (!entry.runtimeActive) fail(`${entry.path}: direct style must be runtimeActive`);
  }
  if (entry.delivery === 'bundled-source') {
    if (!Number.isInteger(entry.bundleOrder)) fail(`${entry.path}: bundled source needs bundleOrder`);
    if (!entry.runtimeActive) fail(`${entry.path}: bundled source must be runtimeActive`);
  }
  if (entry.delivery === 'miniapp-bundled-source') {
    if (!entry.runtimeActive) fail(`${entry.path}: Mini App bundled source must be runtimeActive`);
    if (typeof entry.bundleEntry !== 'string' || !entry.bundleEntry.trim()) fail(`${entry.path}: Mini App bundled source needs bundleEntry`);
    else {
      const bundleEntryPath = path.join(projectRoot, entry.bundleEntry);
      if (!fs.existsSync(bundleEntryPath)) fail(`${entry.path}: Mini App bundleEntry does not exist: ${entry.bundleEntry}`);
      else {
        const bundleEntryText = fs.readFileSync(bundleEntryPath, 'utf8');
        const relativeCssImport = `./${path.basename(entry.path)}`;
        if (!bundleEntryText.includes(relativeCssImport)) fail(`${entry.path}: Mini App bundleEntry does not import ${relativeCssImport}`);
      }
    }
  }
  if (entry.delivery === 'dormant' && entry.runtimeActive) {
    fail(`${entry.path}: dormant style cannot be runtimeActive`);
  }
  if (entry.patchStyleName) {
    if (entry.grandfatheredAt !== 'UI-0A') fail(`${entry.path}: patch-style filename is not grandfathered by UI-0A`);
    if (!entry.debtId) fail(`${entry.path}: patch-style filename needs a debtId`);
    if (entry.status === 'provisional-canonical') fail(`${entry.path}: patch-style filename cannot be canonical`);
  }
  if (['compatibility', 'migrating', 'quarantined', 'dormant'].includes(entry.status)) {
    if (!entry.debtId) fail(`${entry.path}: ${entry.status} entry needs a debtId`);
    if (!entry.migrationTarget) fail(`${entry.path}: ${entry.status} entry needs a migrationTarget`);
  }
}

const orderedImports = getOrderedRuntimeImports(manifest);
const importOrders = orderedImports.map((entry) => entry.order);
if (new Set(importOrders).size !== importOrders.length) fail('runtime style order contains duplicates');
for (let index = 0; index < importOrders.length; index += 1) {
  const expectedOrder = index + 1;
  if (importOrders[index] !== expectedOrder) {
    fail(`runtime style order must be contiguous; expected ${expectedOrder}, received ${importOrders[index]}`);
    break;
  }
}

const bootstrapPath = path.join(projectRoot, manifest.runtimeEntry);
const expectedBootstrap = renderStyleBootstrap(manifest);
const actualBootstrap = fs.existsSync(bootstrapPath) ? fs.readFileSync(bootstrapPath, 'utf8') : '';
if (actualBootstrap !== expectedBootstrap) {
  fail(`${manifest.runtimeEntry} is not generated from the current style manifest`);
}

const bundleCsvPath = path.join(projectRoot, 'docs/css-stage24-tailwind-entry-sources.csv');
if (fs.existsSync(bundleCsvPath)) {
  const rows = fs.readFileSync(bundleCsvPath, 'utf8').trim().split(/\r?\n/).slice(1).map((line) => {
    const [order, file] = line.split(',');
    return { order: Number(order), file };
  });
  const bundledEntries = manifest.localStyles
    .filter((entry) => entry.delivery === 'bundled-source')
    .sort((a, b) => a.bundleOrder - b.bundleOrder);
  if (rows.length !== bundledEntries.length) {
    fail(`bundled source count drift: CSV=${rows.length}, manifest=${bundledEntries.length}`);
  } else {
    rows.forEach((row, index) => {
      const entry = bundledEntries[index];
      if (entry.bundleOrder !== row.order || entry.path !== row.file) {
        fail(`bundled source drift at order ${row.order}: CSV=${row.file}, manifest=${entry.path}`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error('Style manifest audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const counts = manifest.localStyles.reduce((acc, entry) => {
  acc[entry.status] = (acc[entry.status] ?? 0) + 1;
  return acc;
}, {});
console.log(`Style manifest audit passed: ${manifest.localStyles.length} local CSS files, ${manifest.externalStyles.length} vendor styles, ${orderedImports.length} ordered runtime imports.`);
console.log(`Lifecycle inventory: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')}`);
