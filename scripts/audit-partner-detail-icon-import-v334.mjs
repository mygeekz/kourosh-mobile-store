import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 334, `KOUROSH_SOURCE_VERSION must be v334 or successor; found ${version}`);

const purchaseFile = 'pages/partnerDetail/PartnerPurchaseHistorySection.tsx';
const purchaseSource = read(purchaseFile);
assert.match(
  purchaseSource,
  /import\s*\{[^}]*\bIconGlyph\b[^}]*\}\s*from\s*['"]@\/components\/ui['"]\s*;/s,
  `${purchaseFile} must import IconGlyph from @/components/ui`,
);
assert.match(purchaseSource, /<IconGlyph\b/, `${purchaseFile} must retain the purchase-history IconGlyph usage`);

const accountingAudit = read('scripts/audit-accounting-consistency-v333.mjs');
assert.match(accountingAudit, /versionNumber\s*>=\s*333/, 'v333 accounting audit must remain successor-compatible so v334+ releases can run full audit:release');

const partnerDir = path.join(root, 'pages', 'partnerDetail');
const files = fs.readdirSync(partnerDir).filter((name) => name.endsWith('.tsx'));
const missing = [];
for (const name of files) {
  const rel = `pages/partnerDetail/${name}`;
  const source = read(rel);
  if (!/<IconGlyph\b/.test(source)) continue;
  const imported = /import\s*\{[^}]*\bIconGlyph\b[^}]*\}\s*from\s*['"]@\/components\/ui['"]/s.test(source)
    || /import\s+IconGlyph\s+from\s*['"][^'"]*IconGlyph['"]/.test(source);
  if (!imported) missing.push(rel);
}
assert.deepEqual(missing, [], `PartnerDetail TSX files use IconGlyph without importing it: ${missing.join(', ')}`);

console.log('v334 PartnerDetail IconGlyph import/runtime guard audit passed.');
