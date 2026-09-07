import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {
  projectRoot,
  readStyleManifest,
} from './ui-system/style-manifest-utils.mjs';

const manifest = readStyleManifest();
const bundledEntries = manifest.localStyles
  .filter((entry) => entry.delivery === 'bundled-source' && entry.runtimeActive)
  .sort((a, b) => a.bundleOrder - b.bundleOrder);
assert.ok(bundledEntries.length > 0, 'style manifest must contain active bundled-source styles');

const orders = bundledEntries.map((entry) => entry.bundleOrder);
assert.equal(new Set(orders).size, orders.length, 'bundled CSS bundleOrder values must be unique');
orders.forEach((order, index) => assert.equal(order, index + 1, `bundled CSS order drift at index ${index}`));

const bundleManifestPaths = new Set(bundledEntries.map((entry) => entry.bundleSourceManifest));
assert.equal(bundleManifestPaths.size, 1, 'bundled CSS sources must share one source manifest');
const csvRelativePath = [...bundleManifestPaths][0];
assert.ok(csvRelativePath, 'bundled CSS source manifest path is required');

for (const entry of bundledEntries) {
  const sourcePath = path.join(projectRoot, entry.path);
  assert.ok(fs.existsSync(sourcePath), `bundled CSS source is missing: ${entry.path}`);
  const text = fs.readFileSync(sourcePath, 'utf8');
  assert.equal(/@apply[^;]*\/\*\*\//.test(text), false, `${entry.path} contains a comment inside an @apply utility token`);
  assert.equal(text.includes('py-2/**/.5'), false, `${entry.path} contains malformed py-2/**/.5 token`);
}

const expectedCsvRows = bundledEntries.map((entry) => {
  const content = fs.readFileSync(path.join(projectRoot, entry.path));
  return {
    order: entry.bundleOrder,
    file: entry.path.replace(/\\/g, '/'),
    size: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
});
const csvPath = path.join(projectRoot, csvRelativePath);
assert.ok(fs.existsSync(csvPath), `${csvRelativePath} must exist`);
const csvRows = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1).map((line) => {
  const [order, file, size, sha256] = line.split(',');
  return { order: Number(order), file, size: Number(size), sha256 };
});
assert.deepEqual(csvRows, expectedCsvRows, `${csvRelativePath} is stale relative to style manifest/source files`);

const generatedPath = path.join(projectRoot, 'styles/generated/tailwind-entry.generated.css');
assert.ok(fs.existsSync(generatedPath), 'generated Tailwind entry must exist');
const generated = fs.readFileSync(generatedPath, 'utf8');
assert.equal(/@apply[^;]*\/\*\*\//.test(generated), false, 'generated Tailwind entry contains a comment inside an @apply utility token');
assert.equal(generated.includes('py-2/**/.5'), false, 'malformed py-2/**/.5 token must never return');

let expected = '';
expected += '/* AUTO-GENERATED CSS ENTRY. DO NOT EDIT DIRECTLY.\n';
expected += `   Source files are derived from styles/manifest/style-manifest.json and recorded in ${csvRelativePath}.\n`;
expected += '   Regenerate with: node scripts/rebuild-css-entry.mjs\n';
expected += '   Purpose: keep Tailwind @layer files in one PostCSS/Tailwind context without CSS @import chains. */\n\n';
for (const entry of bundledEntries.filter((entry) => entry.path !== 'index.css')) {
  const rel = entry.path.replace(/\\/g, '/');
  let content = fs.readFileSync(path.join(projectRoot, rel), 'utf8');
  expected += `/* ==== CSS SOURCE ${String(entry.bundleOrder).padStart(3, '0')}: ${rel} ==== */\n${content}`;
  if (!content.endsWith('\n')) expected += '\n';
  expected += `/* ==== END CSS SOURCE ${String(entry.bundleOrder).padStart(3, '0')}: ${rel} ==== */\n\n`;
}
let indexCss = fs.readFileSync(path.join(projectRoot, 'index.css'), 'utf8');
expected += '/* ==== CSS SOURCE: index.css base tailwind entry ==== */\n';
expected += indexCss;
if (!indexCss.endsWith('\n')) expected += '\n';
expected += '/* ==== END CSS SOURCE: index.css base tailwind entry ==== */\n';

assert.equal(
  crypto.createHash('sha256').update(generated).digest('hex'),
  crypto.createHash('sha256').update(expected).digest('hex'),
  'generated Tailwind entry is stale; run npm run prepare:production-styles',
);

console.log(`v266 Tailwind generated-entry integrity audit passed (${bundledEntries.length} bundled sources).`);
