import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.svg', '.png', '.webp'];
const entrypoints = ['index.tsx', 'App.tsx'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;

const resolveRelativeImport = (fromFile, rawSpecifier) => {
  const specifier = rawSpecifier.split('?')[0].split('#')[0];
  if (!specifier.startsWith('.')) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base];
  if (!extensions.some((extension) => base.endsWith(extension))) {
    candidates.push(...extensions.map((extension) => `${base}${extension}`));
    candidates.push(...extensions.map((extension) => path.join(base, `index${extension}`)));
  }

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || false;
};

const pending = entrypoints.map((entrypoint) => path.join(root, entrypoint));
const visited = new Set();
const missing = [];

while (pending.length > 0) {
  const filePath = pending.pop();
  if (!filePath || visited.has(filePath)) continue;
  visited.add(filePath);

  if (!sourceExtensions.has(path.extname(filePath))) continue;
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));

  importPattern.lastIndex = 0;
  for (let match = importPattern.exec(source); match; match = importPattern.exec(source)) {
    const specifier = match[1] || match[2];
    const resolved = resolveRelativeImport(filePath, specifier);
    if (resolved === false) {
      missing.push(`${path.relative(root, filePath)} -> ${specifier}`);
      continue;
    }
    if (resolved) pending.push(resolved);
  }
}

assert.deepEqual(missing, [], `Frontend entry import graph contains unresolved relative imports:\n${missing.join('\n')}`);

const appSource = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'app/runtime/SpaNavigationGuard.tsx'), 'utf8');
assert.match(appSource, /\.\/app\/runtime\/SpaNavigationGuard/, 'App must import the SPA navigation guard from the reviewed runtime path.');
assert.match(guardSource, /window\.location\.replace\(redirectUrl\)/, 'Legacy SPA recovery must use a bounded one-time location replacement.');
assert.match(guardSource, /pathname === '\/'/, 'Canonical root navigation must remain untouched.');
assert.match(guardSource, /isCanonicalHashRoute\(hash\)/, 'Canonical HashRouter paths must remain untouched.');

console.log(JSON.stringify({
  frontendFilesVisited: visited.size,
  unresolvedRelativeImports: missing.length,
  spaNavigationGuardPresent: true,
}, null, 2));
