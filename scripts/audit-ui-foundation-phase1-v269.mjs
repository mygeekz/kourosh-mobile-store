#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'config/ui/ui-foundation-phase1-v269-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const uiManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(absolute) : [absolute];
});
const relative = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const read = (file) => fs.readFileSync(file, 'utf8');

const runtimeFiles = baseline.scopeRoots.flatMap((scopeRoot) => {
  const absolute = path.join(root, scopeRoot);
  return fs.existsSync(absolute) ? walk(absolute).filter((file) => /\.tsx$/.test(file)) : [];
});
const ownerFiles = new Set(Object.values(baseline.canonicalNativeOwners));
const fileInputAllowlist = new Map(Object.entries(baseline.approvedNativeFileInputs));

const rawInputs = [];
const rawSelects = [];
const rawTextareas = [];
for (const file of runtimeFiles) {
  const rel = relative(file);
  const source = read(file);
  if (!ownerFiles.has(rel)) {
    for (const match of source.matchAll(/<input\b[\s\S]*?\/>/g)) {
      const tag = match[0];
      const line = source.slice(0, match.index).split('\n').length;
      rawInputs.push({ file: rel, line, tag, isFile: /type\s*=\s*["']file["']/.test(tag) });
    }
  }
  if (rel !== baseline.canonicalNativeOwners.select) {
    for (const match of source.matchAll(/<select\b/g)) rawSelects.push({ file: rel, line: source.slice(0, match.index).split('\n').length });
  }
  if (rel !== baseline.canonicalNativeOwners.textarea) {
    for (const match of source.matchAll(/<textarea\b/g)) rawTextareas.push({ file: rel, line: source.slice(0, match.index).split('\n').length });
  }
}

assert.equal(rawSelects.length, 0, `Native <select> escaped SelectField: ${JSON.stringify(rawSelects)}`);
assert.equal(rawTextareas.length, 0, `Native <textarea> escaped TextareaField: ${JSON.stringify(rawTextareas)}`);
assert.ok(rawInputs.every((item) => item.isFile), `Non-file native input escaped canonical owners: ${JSON.stringify(rawInputs.filter((item) => !item.isFile))}`);

const actualFileInputCounts = new Map();
for (const item of rawInputs) actualFileInputCounts.set(item.file, (actualFileInputCounts.get(item.file) ?? 0) + 1);
assert.deepEqual(
  Object.fromEntries([...actualFileInputCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  Object.fromEntries([...fileInputAllowlist.entries()].sort(([a], [b]) => a.localeCompare(b))),
  'Native file-input exception inventory changed; review explicitly instead of silently expanding it.',
);

const manifestById = new Map(uiManifest.components.map((component) => [component.id, component]));
for (const id of ['form-control-contract', 'control-shell', 'text-field', 'select-field', 'textarea-field', 'search-field', 'searchable-select-field', 'checkbox-field', 'range-field']) {
  assert.equal(manifestById.get(id)?.status, 'canonical', `UI manifest must keep ${id} canonical.`);
  assert.ok(fs.existsSync(path.join(root, manifestById.get(id).canonicalPath)), `Canonical UI owner missing: ${id}`);
}

const formContract = read(path.join(root, 'components/ui/formControlContract.ts'));
assert.match(formContract, /DEFAULT_FORM_CONTROL_SIZE:\s*FormControlSize\s*=\s*['"]sm['"]/, 'Compact sm must remain the canonical form-control default.');

for (const primitive of ['TextField.tsx', 'SelectField.tsx', 'TextareaField.tsx', 'AppSearchField.tsx', 'SearchableSelectField.tsx']) {
  const source = read(path.join(root, 'components/ui', primitive));
  assert.match(source, /DEFAULT_FORM_CONTROL_SIZE/, `${primitive} must consume the shared density default.`);
  assert.doesNotMatch(source, /(?:controlSize|size)\s*=\s*['"]md['"]/, `${primitive} must not silently restore md as its local default.`);
}

const tokens = read(path.join(root, 'styles/system/design-tokens.css'));
for (const [size, value] of Object.entries(baseline.expectedDensityTokens.desktop)) {
  assert.match(tokens, new RegExp(`--ds-control-height-${size}:\\s*${value.replace('.', '\\.')}`), `Desktop ${size} control-height token drifted.`);
}
const compactMedia = tokens.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
for (const [size, value] of Object.entries(baseline.expectedDensityTokens.compactViewport)) {
  assert.match(compactMedia, new RegExp(`--ds-control-height-${size}:\\s*${value.replace('.', '\\.')}`), `Compact viewport ${size} control-height token drifted.`);
}

const fieldCss = read(path.join(root, 'styles/system/field-form-contract.css'));
assert.match(fieldCss, /height:\s*auto\s*!important/, 'Single-line fields must not return to a fixed text-bearing height.');
assert.match(fieldCss, /min-height:\s*var\(--_ds-control-min-height/, 'Field min-height must remain token-owned.');
assert.match(fieldCss, /\[aria-invalid=['"]true['"]\]/, 'Invalid fields must remain visually connected to semantic aria-invalid state.');
assert.match(fieldCss, /var\(--ds-danger\)/, 'Error color must remain semantic-token based.');

const shell = read(path.join(root, 'components/ui/ControlShell.tsx'));
assert.match(shell, /role=["']alert["']/, 'ControlShell error feedback must be announced as an alert.');
assert.match(shell, /aria-live=["']polite["']/, 'ControlShell error feedback must retain polite live-region behavior.');
assert.match(shell, /data-field-state/, 'ControlShell must expose a semantic field state.');

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  workstreamVersion: baseline.workstreamVersion,
  scannedTsxFiles: runtimeFiles.length,
  nativeRenderers: {
    approvedFileInputs: rawInputs.length,
    rawNonFileInputsOutsideCanonicalOwners: rawInputs.filter((item) => !item.isFile).length,
    rawSelectOutsideCanonicalOwner: rawSelects.length,
    rawTextareaOutsideCanonicalOwner: rawTextareas.length
  },
  canonicalOwners: baseline.canonicalNativeOwners,
  density: baseline.expectedDensityTokens,
  policy: 'Normal text/number/search/time/password, checkbox and range controls must render through canonical shared primitives. Only reviewed hidden file inputs remain native exceptions.',
}, null, 2));
