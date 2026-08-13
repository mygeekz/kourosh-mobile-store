import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'css-stage24-tailwind-entry-sources.csv');
const outputPath = path.join(root, 'styles', 'generated', 'tailwind-entry.generated.css');
const indexCssPath = path.join(root, 'index.css');

const csv = fs.readFileSync(manifestPath, 'utf8').trim().split(/\r?\n/).slice(1);
const rows = csv.map((line) => {
  const [order, file] = line.split(',');
  return { order: Number(order), file };
}).filter((row) => row.file && row.file !== 'index.css');

let output = '';
output += '/* AUTO-GENERATED CSS ENTRY. DO NOT EDIT DIRECTLY.\n';
output += '   Source files are listed in docs/css-stage24-tailwind-entry-sources.csv.\n';
output += '   Regenerate with: node scripts/rebuild-css-entry.mjs\n';
output += '   Purpose: keep Tailwind @layer files in one PostCSS/Tailwind context without CSS @import chains. */\n\n';

for (const row of rows) {
  const rel = row.file.replace(/\\/g, '/');
  const abs = path.join(root, rel);
  let content = fs.readFileSync(abs, 'utf8');
  output += `/* ==== CSS SOURCE ${String(row.order).padStart(3, '0')}: ${rel} ==== */\n`;
  output += content;
  if (!content.endsWith('\n')) output += '\n';
  output += `/* ==== END CSS SOURCE ${String(row.order).padStart(3, '0')}: ${rel} ==== */\n\n`;
}

let indexCss = fs.readFileSync(indexCssPath, 'utf8');
output += '/* ==== CSS SOURCE: index.css base tailwind entry ==== */\n';
output += indexCss;
if (!indexCss.endsWith('\n')) output += '\n';
output += '/* ==== END CSS SOURCE: index.css base tailwind entry ==== */\n';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
const hash = crypto.createHash('sha256').update(output).digest('hex');
console.log(`Regenerated ${path.relative(root, outputPath)} (${output.length} bytes, sha256 ${hash})`);
