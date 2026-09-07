import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const manifest = read('styles/manifest/style-manifest.json');
const textField = read('components/ui/TextField.tsx');
const selectField = read('components/ui/SelectField.tsx');
const textareaField = read('components/ui/TextareaField.tsx');
const searchField = read('components/ui/AppSearchField.tsx');
const searchableSelectField = read('components/ui/SearchableSelectField.tsx');
const controlShell = read('components/ui/ControlShell.tsx');

for (const file of [
  'styles/components/select-field.css',
  'styles/system/form-field-vertical-metrics-foundation.css',
]) {
  assert.equal(fs.existsSync(file), false, `form primitive custom CSS must stay retired: ${file}`);
  assert.equal(manifest.includes(file), false, `retired form primitive CSS must not remain in style manifest: ${file}`);
}

for (const [name, source] of [
  ['TextField', textField],
  ['SelectField', selectField],
  ['TextareaField', textareaField],
  ['AppSearchField', searchField],
  ['SearchableSelectField', searchableSelectField],
]) {
  assert.match(source, /--ds-(?:control|radius|surface)/, `${name} must consume the canonical design-token contract`);
  assert.doesNotMatch(source, /(?:slate|sky|rose|emerald|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)/, `${name} must not own manual palette colors`);
  assert.doesNotMatch(source, /import\s+['"][^'"]+\.css['"]/, `${name} must not import component-specific CSS`);
}
assert.match(textField, /DEFAULT_FORM_CONTROL_SIZE/, 'TextField density must use the shared form-control contract');
assert.match(textField, /data-ui-control-size=\{controlSize\}/, 'TextField must expose the shared density token size');
assert.match(selectField, /DEFAULT_FORM_CONTROL_SIZE/, 'SelectField density must use the shared form-control contract');
assert.match(selectField, /data-ui-control-size=\{size\}/, 'SelectField must expose the shared density token size');
assert.match(searchField, /DEFAULT_FORM_CONTROL_SIZE/, 'AppSearchField density must use the shared form-control contract');
assert.match(searchField, /data-ui-control-size=\{size\}/, 'AppSearchField must expose the shared density token size');
assert.match(searchableSelectField, /heightClassBySize/, 'SearchableSelectField density must be a shared variant contract');
assert.match(searchableSelectField, /useOverlayPortalTarget\(\s*['\"]popover['\"]/, 'SearchableSelectField menus must render through the shared semantic popover portal host');
assert.doesNotMatch(searchableSelectField, /menuPortalTarget\s*=\s*\{?[^\n}]*document\.body/, 'SearchableSelectField must not target document.body directly');
assert.match(controlShell, /relative min-w-0/, 'ControlShell must own control composition with utilities');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v263',
  retiredFormCssFiles: 2,
  primitiveGeometryOwner: 'component utilities + canonical design tokens',
  manualPaletteColorsInCanonicalPrimitives: false,
  retiredStandaloneFormMetricCssPresent: false,
}, null, 2));
