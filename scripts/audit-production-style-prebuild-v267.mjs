import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};
assert.equal(
  scripts['prepare:production-styles'],
  'node scripts/cleanup-retired-style-files-v267.mjs && node scripts/generate-style-bootstrap.mjs && node scripts/rebuild-css-entry.mjs && node scripts/audit-style-manifest.mjs && node scripts/audit-tailwind-entry-integrity-v267.mjs',
  'prepare:production-styles must regenerate and verify style artifacts from the canonical manifest',
);
assert.equal(scripts.prebuild, 'npm run prepare:production-styles', 'npm run build must execute the production style prebuild lifecycle');
assert.equal(scripts.build, 'vite build', 'build command should remain the canonical Vite production build after prebuild');
console.log('v267 production style prebuild contract audit passed.');
