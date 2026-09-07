import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const manifest = read('styles/manifest/style-manifest.json');
const textField = read('components/ui/TextField.tsx');
const selectField = read('components/ui/SelectField.tsx');
const textareaField = read('components/ui/TextareaField.tsx');
const searchField = read('components/ui/AppSearchField.tsx');
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
]) {
  assert.match(source, /rounded-2xl/, `${name} must own its canonical geometry with project utilities`);
  assert.match(source, /border-slate-/, `${name} must own its canonical visual contract with project utilities`);
  assert.doesNotMatch(source, /import\s+['"][^'"]+\.css['"]/, `${name} must not import component-specific CSS`);
}
assert.match(textField, /textFieldSizeClasses/, 'TextField density must be a shared variant contract');
assert.match(selectField, /selectFieldSizeClasses/, 'SelectField density must be a shared variant contract');
assert.match(searchField, /searchFieldSizeClasses/, 'AppSearchField density must be a shared variant contract');
assert.match(controlShell, /relative min-w-0/, 'ControlShell must own control composition with utilities');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v262',
  retiredFormCssFiles: 2,
  primitiveGeometryOwner: 'component utilities + project tokens',
  retiredStandaloneFormMetricCssPresent: false,
}, null, 2));
