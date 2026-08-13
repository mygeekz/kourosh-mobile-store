#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const TARGET_ROOTS = ['pages/settings', 'pages/inventory'];

const walk = (relativeDirectory) => {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [relativePath] : [];
  });
};

const files = [...new Set(TARGET_ROOTS.flatMap(walk))].sort();
const totals = {
  TextField: 0,
  SelectField: 0,
  CheckboxField: 0,
  RangeField: 0,
  nativeInput: 0,
  nativeSelect: 0,
  nativeTextarea: 0,
};

for (const file of files) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');

  totals.TextField += (source.match(/<TextField\b/g) ?? []).length;
  totals.SelectField += (source.match(/<SelectField\b/g) ?? []).length;
  totals.CheckboxField += (source.match(/<CheckboxField\b/g) ?? []).length;
  totals.RangeField += (source.match(/<RangeField\b/g) ?? []).length;
  totals.nativeInput += (source.match(/<input\b/g) ?? []).length;
  totals.nativeSelect += (source.match(/<select\b/g) ?? []).length;
  totals.nativeTextarea += (source.match(/<textarea\b/g) ?? []).length;

  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/(?:TextField|SelectField|CheckboxField|RangeField)["']/,
    `${file} imports a field primitive directly instead of the canonical @/components/ui barrel.`,
  );
}

assert.equal(totals.nativeInput, 0, `Settings/inventory must not render native input elements; found ${totals.nativeInput}.`);
assert.equal(totals.nativeSelect, 0, `Settings/inventory must not render native select elements; found ${totals.nativeSelect}.`);
assert.equal(totals.nativeTextarea, 0, `Settings/inventory must not render native textarea elements; found ${totals.nativeTextarea}.`);
assert.ok(totals.TextField >= 52, `Expected at least 52 TextField consumers; found ${totals.TextField}.`);
assert.ok(totals.SelectField >= 20, `Expected at least 20 SelectField consumers; found ${totals.SelectField}.`);
assert.equal(totals.CheckboxField, 4, `Expected 4 CheckboxField consumers; found ${totals.CheckboxField}.`);
assert.equal(totals.RangeField, 2, `Expected 2 RangeField consumers; found ${totals.RangeField}.`);

const barrel = fs.readFileSync(path.resolve(root, 'components/ui/index.ts'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, 'config/ui/ui-manifest.json'), 'utf8'));

for (const [file, type, exportName, componentId] of [
  ['components/ui/CheckboxField.tsx', 'checkbox', 'CheckboxField', 'checkbox-field'],
  ['components/ui/RangeField.tsx', 'range', 'RangeField', 'range-field'],
]) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.equal((source.match(/<input\b/g) ?? []).length, 1, `${file} must own exactly one native ${type} renderer.`);
  assert.match(source, new RegExp(`type=\\"${type}\\"`));
  assert.match(source, new RegExp(`data-ui-control-kind=\\"${type}\\"`));
  assert.match(source, /controlOnly/);
  assert.match(barrel, new RegExp(`\\b${exportName}\\b`));
  assert.ok(manifest.components.some((entry) => entry.id === componentId && entry.exportName === exportName), `${exportName} is missing from the UI manifest.`);
}

const selectSource = fs.readFileSync(path.resolve(root, 'components/ui/SelectField.tsx'), 'utf8');
assert.match(selectSource, /unstyled\?: boolean/);
assert.match(selectSource, /showChevron\?: boolean/);
assert.match(selectSource, /data-ui-control-kind="select"/);

console.log(JSON.stringify({
  status: 'passed',
  scannedFiles: files.length,
  canonicalUsages: {
    text: totals.TextField,
    select: totals.SelectField,
    checkbox: totals.CheckboxField,
    range: totals.RangeField,
  },
  remainingNativeControls: {
    input: totals.nativeInput,
    select: totals.nativeSelect,
    textarea: totals.nativeTextarea,
  },
  policy: 'Settings and inventory controls use only canonical field primitives from @/components/ui.',
}, null, 2));
