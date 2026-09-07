import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  projectRoot,
  readStyleManifest,
} from './ui-system/style-manifest-utils.mjs';

const manifest = readStyleManifest();
const bundledEntries = manifest.localStyles
  .filter((entry) => entry.delivery === 'bundled-source' && entry.runtimeActive)
  .sort((a, b) => a.bundleOrder - b.bundleOrder);

if (bundledEntries.length === 0) {
  throw new Error('Style manifest contains no active bundled-source entries.');
}

const orders = bundledEntries.map((entry) => entry.bundleOrder);
if (new Set(orders).size !== orders.length) {
  throw new Error('Style manifest contains duplicate bundleOrder values.');
}
for (let index = 0; index < orders.length; index += 1) {
  const expectedOrder = index + 1;
  if (orders[index] !== expectedOrder) {
    throw new Error(`Bundled CSS order must be contiguous; expected ${expectedOrder}, received ${orders[index]}.`);
  }
}

const sourceManifestPaths = new Set(bundledEntries.map((entry) => entry.bundleSourceManifest));
if (sourceManifestPaths.size !== 1 || ![...sourceManifestPaths][0]) {
  throw new Error('All active bundled-source styles must share one bundleSourceManifest.');
}

const csvRelativePath = [...sourceManifestPaths][0];
const csvPath = path.join(projectRoot, csvRelativePath);
const outputPath = path.join(projectRoot, 'styles', 'generated', 'tailwind-entry.generated.css');
const indexEntry = bundledEntries.find((entry) => entry.path === 'index.css');
if (!indexEntry) throw new Error('Style manifest must register index.css as an active bundled-source entry.');

const sourceRows = [];
for (const entry of bundledEntries) {
  const abs = path.join(projectRoot, entry.path);
  if (!fs.existsSync(abs)) throw new Error(`Bundled CSS source is missing: ${entry.path}`);
  const content = fs.readFileSync(abs);
  sourceRows.push({
    order: entry.bundleOrder,
    file: entry.path.replace(/\\/g, '/'),
    size: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  });
}

const csv = [
  'order,file,size_bytes,sha256',
  ...sourceRows.map((row) => `${row.order},${row.file},${row.size},${row.sha256}`),
  '',
].join('\n');
fs.mkdirSync(path.dirname(csvPath), { recursive: true });
fs.writeFileSync(csvPath, csv);

let output = '';
output += '/* AUTO-GENERATED CSS ENTRY. DO NOT EDIT DIRECTLY.\n';
output += `   Source files are derived from styles/manifest/style-manifest.json and recorded in ${csvRelativePath}.\n`;
output += '   Regenerate with: node scripts/rebuild-css-entry.mjs\n';
output += '   Purpose: keep Tailwind @layer files in one PostCSS/Tailwind context without CSS @import chains. */\n\n';

for (const entry of bundledEntries.filter((entry) => entry.path !== 'index.css')) {
  const rel = entry.path.replace(/\\/g, '/');
  const abs = path.join(projectRoot, rel);
  let content = fs.readFileSync(abs, 'utf8');
  output += `/* ==== CSS SOURCE ${String(entry.bundleOrder).padStart(3, '0')}: ${rel} ==== */\n`;
  output += content;
  if (!content.endsWith('\n')) output += '\n';
  output += `/* ==== END CSS SOURCE ${String(entry.bundleOrder).padStart(3, '0')}: ${rel} ==== */\n\n`;
}

let indexCss = fs.readFileSync(path.join(projectRoot, 'index.css'), 'utf8');
output += '/* ==== CSS SOURCE: index.css base tailwind entry ==== */\n';
output += indexCss;
if (!indexCss.endsWith('\n')) output += '\n';
output += '/* ==== END CSS SOURCE: index.css base tailwind entry ==== */\n';

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
const hash = crypto.createHash('sha256').update(output).digest('hex');
console.log(`Regenerated ${path.relative(projectRoot, outputPath)} from style manifest (${output.length} bytes, sha256 ${hash}).`);
console.log(`Regenerated ${csvRelativePath} (${sourceRows.length} bundled sources).`);
