import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const addRepair = read('pages/AddRepair.tsx');
const searchableSelect = read('components/ui/SearchableSelectField.tsx');
const textField = read('components/ui/TextField.tsx');
const textareaField = read('components/ui/TextareaField.tsx');
const selectField = read('components/ui/SelectField.tsx');
const controlShell = read('components/ui/ControlShell.tsx');
const designTokens = read('styles/system/design-tokens.css');
const fieldContract = read('styles/system/field-form-contract.css');
const phase4FieldContract = read('styles/system/ui-contracts/form-field-contract-phase4.css');

const manualPalettePattern = /(?:slate|sky|rose|emerald|gray|zinc|neutral|stone|red|green|blue|amber|orange|yellow)-(?:50|100|200|300|400|500|600|700|800|900|950)/;
const colorLiteralPattern = /#[0-9a-f]{3,8}\b|rgba?\s*\(/i;

assert.match(addRepair, /<form[\s\S]*?\bnoValidate\b/, 'AddRepair must bypass native browser bubbles and own Persian validation UX');
assert.match(addRepair, /انتخاب مشتری الزامی است\./, 'customer required error must stay Persian and field-specific');
assert.match(addRepair, /مدل دستگاه الزامی است\./, 'device model required error must stay Persian and field-specific');
assert.match(addRepair, /شرح مشکل از زبان مشتری الزامی است\./, 'problem description required error must stay Persian and field-specific');
assert.match(addRepair, /<SearchableSelectField<string>/, 'device metadata must use the shared searchable select primitive');
assert.doesNotMatch(addRepair, /absolute inset-x-0 top-full z-50/, 'AddRepair must not own an in-card dropdown overlay');
assert.match(searchableSelect, /menuPosition="fixed"/, 'shared searchable select menu must use fixed positioning');
assert.match(searchableSelect, /menuPortalTarget=\{typeof document !== 'undefined' \? document\.body : null\}/, 'shared searchable select must portal menus to document.body');
assert.match(searchableSelect, /react-select\/creatable/, 'shared searchable select must own creatable metadata behavior');

assert.match(addRepair, /size="sm"/, 'AddRepair searchable controls must opt into compact shared density');
assert.match(addRepair, /controlSize="sm"/, 'AddRepair text controls must opt into compact shared density');
assert.doesNotMatch(addRepair, /className="min-h-40"/, 'AddRepair textareas must not force oversized page-owned heights');
assert.match(addRepair, /xl:grid-cols-3/, 'device fields must defer the three-column layout until sufficient width exists');
assert.match(addRepair, /2xl:grid-cols-\[minmax\(0,1fr\)_19rem\]/, 'summary rail must defer until a wide layout can preserve readable form controls');

assert.doesNotMatch(addRepair, manualPalettePattern, 'AddRepair must use semantic theme colors instead of manual palette utilities');
for (const [name, source] of [
  ['TextField', textField],
  ['TextareaField', textareaField],
  ['SelectField', selectField],
  ['SearchableSelectField', searchableSelect],
  ['ControlShell', controlShell],
]) {
  assert.doesNotMatch(source, manualPalettePattern, `${name} must use semantic/project tokens instead of manual palette utilities`);
}
assert.doesNotMatch(fieldContract, colorLiteralPattern, 'canonical field contract must not hardcode color literals');
assert.doesNotMatch(phase4FieldContract, colorLiteralPattern, 'late field contract must not hardcode color literals');
for (const token of ['--ds-control-height-sm', '--ds-control-icon-size-sm', '--ds-control-bg', '--ds-control-border', '--ds-danger']) {
  assert.ok(designTokens.includes(token), `design token must exist: ${token}`);
}
assert.match(phase4FieldContract, /--app-field-bg:\s*var\(--ds-control-bg\)/, 'late field colors must alias canonical design tokens');
assert.match(phase4FieldContract, /--app-field-danger:\s*var\(--ds-danger\)/, 'late field danger color must alias canonical design token');

for (const source of [textField, textareaField, selectField, searchableSelect]) {
  assert.match(source, /aria-describedby/, 'shared form controls must connect feedback with aria-describedby');
  assert.match(source, /aria-invalid/, 'shared form controls must expose aria-invalid');
}
assert.match(controlShell, /fa-circle-exclamation/, 'field errors must render a visible error icon beside the Persian message');
assert.match(controlShell, /role="alert"/, 'field error feedback must be announced as an alert');
assert.match(textField, /dir=\{dir\}/, 'TextField must propagate bidi direction to both control and shared shell');

console.log(JSON.stringify({
  status: 'PASS',
  releaseBase: 'v267',
  dropdownPortal: true,
  creatableMetadataSelect: true,
  compactSharedDensity: true,
  semanticThemeColors: true,
  nativeValidationBubblesDisabled: true,
  persianInlineFieldErrors: true,
  errorIconAndAriaFeedback: true,
  pageSpecificCssAdded: false,
}, null, 2));
