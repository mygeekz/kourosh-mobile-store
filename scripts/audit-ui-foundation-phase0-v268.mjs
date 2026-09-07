#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-foundation-phase0-v268-baseline.json'), 'utf8'));
const uiManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));
const styleManifest = JSON.parse(fs.readFileSync(path.join(root, 'styles/manifest/style-manifest.json'), 'utf8'));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(absolute) : [absolute];
});

const runtimeFiles = baseline.scopeRoots.flatMap((scopeRoot) => {
  const absolute = path.join(root, scopeRoot);
  return fs.existsSync(absolute)
    ? walk(absolute).filter((file) => /\.tsx$/.test(file))
    : [];
});

const relative = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const read = (file) => fs.readFileSync(file, 'utf8');

const countPattern = (regex, excluded = new Set()) => runtimeFiles.reduce((sum, file) => {
  if (excluded.has(relative(file))) return sum;
  return sum + (read(file).match(regex) ?? []).length;
}, 0);

const metrics = {
  rawInputOutsideCanonical: countPattern(/<input\b/g, new Set([baseline.canonicalNativeOwners.input])),
  rawSelectOutsideCanonical: countPattern(/<select\b/g, new Set([baseline.canonicalNativeOwners.select])),
  rawTextareaOutsideCanonical: countPattern(/<textarea\b/g, new Set([baseline.canonicalNativeOwners.textarea])),
  inlineStyleObjects: countPattern(/\bstyle\s*=\s*\{\{/g),
  arbitraryZUtilities: countPattern(/z-\[(?:\d+|[^\]]+)\]/g),
  manualPaletteUtilities: countPattern(/\b(?:bg|text|border|ring|from|to|via|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g),
  createPortalUsages: countPattern(/\bcreatePortal\b/g),
  rawTableElements: countPattern(/<table\b/g),
};

for (const [key, ceiling] of Object.entries(baseline.debtCeilings)) {
  assert.ok(metrics[key] <= ceiling, `${key} increased from Phase 0 ceiling ${ceiling} to ${metrics[key]}. New UI debt is not allowed.`);
}
assert.equal(metrics.rawSelectOutsideCanonical, 0, 'Only SelectField may own a native select renderer.');
assert.equal(metrics.rawTextareaOutsideCanonical, 0, 'Only TextareaField may own a native textarea renderer.');

const canonical = new Map(uiManifest.components.map((component) => [component.id, component]));
for (const id of ['text-field', 'select-field', 'textarea-field', 'control-shell', 'portal-layer', 'dialog', 'dialog-shell', 'data-table-shell', 'management-directory']) {
  assert.equal(canonical.get(id)?.status, 'canonical', `UI manifest must keep ${id} canonical.`);
  assert.ok(fs.existsSync(path.join(root, canonical.get(id).canonicalPath)), `Canonical component missing: ${id}`);
}

const styleLifecycle = Object.fromEntries(Object.entries(styleManifest.localStyles.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] ?? 0) + 1;
  return acc;
}, {})).sort(([a], [b]) => a.localeCompare(b)));

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  scannedTsxFiles: runtimeFiles.length,
  metrics,
  ceilings: baseline.debtCeilings,
  canonicalComponents: uiManifest.components.length,
  migratingLegacyComponents: uiManifest.legacyComponents.length,
  localCssAssets: styleManifest.localStyles.length,
  styleLifecycle,
  policy: 'Phase 0 freezes UI debt growth. Later phases may reduce these counts but may not increase them.',
}, null, 2));
