#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const textField = read('components/ui/TextField.tsx');
const selectField = read('components/ui/SelectField.tsx');
const searchField = read('components/ui/AppSearchField.tsx');
const selectCss = read('styles/components/select-field.css');
const searchCss = read('styles/components/search-field.css');
const metricsCss = read('styles/system/form-field-vertical-metrics-foundation.css');
const bootstrap = read('app/bootstrap/styles.ts');
const manifest = JSON.parse(read('styles/manifest/style-manifest.json'));
const settingsController = read('pages/settings/SettingsController.tsx');
const settingsSms = read('pages/settings/SettingsSmsPanel.tsx');
const partnerPerformance = read('pages/reports/PartnerPerformanceReport.tsx');
const mobilePhonesModal = read('pages/mobilePhones/MobilePhonesModalStack.tsx');

// Canonical primitives expose one explicit density contract.
assert.match(textField, /type TextFieldControlSize = 'sm' \| 'md' \| 'lg'/);
assert.match(textField, /controlSize\?: TextFieldControlSize/);
assert.match(textField, /controlSize = 'md'/);
assert.match(textField, /data-ui-control-size=\{controlSize\}/);
assert.match(selectField, /data-ui-control-size=\{size\}/);
assert.match(searchField, /data-ui-control-size=\{size\}/);

// Root single-line geometry is centralized and loaded at the final cascade edge.
for (const marker of [
  '[data-ui-control-kind="text"]:not([type="file"])',
  '[data-ui-control-kind="select"]',
  '[data-ui-control-kind="search"]',
  'input.app-input:not([type="file"])',
  'input.ux-input:not([type="file"])',
  'select.app-select',
  'select.ux-select',
  'height: auto !important',
  'padding-block: var(--app-field-single-line-padding-block) !important',
  'line-height: var(--app-field-single-line-line-height) !important',
  '[data-ui-control-size="sm"]',
  '[data-ui-control-size="md"]',
  '[data-ui-control-size="lg"]',
  'var(--ds-control-height-sm, 40px)',
  'var(--ds-control-height-md, 46px)',
  'var(--ds-control-height-lg, 52px)',
  'Compatibility bridge for legacy renderers',
]) assert.ok(metricsCss.includes(marker), `missing vertical-metrics contract: ${marker}`);
assert.ok(!metricsCss.includes('textarea[data-ui-control'), 'textarea must stay outside the single-line normalization');

const bootstrapImports = [...bootstrap.matchAll(/import ['"]\.\.\/\.\.\/(styles\/[^'"]+)['"];?/g)].map((match) => match[1]);
assert.equal(bootstrapImports.at(-1), 'styles/system/form-field-vertical-metrics-foundation.css', 'vertical-metrics foundation must be the final generated style import');
const activeManifestEntries = manifest.localStyles.filter((entry) => entry.runtimeActive === true && Number.isFinite(Number(entry.bootstrapOrder)));
const metricsEntry = activeManifestEntries.find((entry) => entry.path === 'styles/system/form-field-vertical-metrics-foundation.css');
assert.ok(metricsEntry, 'vertical-metrics foundation must be registered in the style manifest');
assert.equal(metricsEntry.bootstrapOrder, Math.max(...activeManifestEntries.map((entry) => Number(entry.bootstrapOrder || 0))), 'vertical-metrics foundation must own the final bootstrap order');

// Size CSS may set minimum density, but must not hard-lock text-bearing control height.
for (const [name, css] of [['select', selectCss], ['search', searchCss]]) {
  for (const size of ['sm', 'md', 'lg']) {
    const block = css.match(new RegExp(`\\.app-${name}-field--${size} \\.app-${name}-field__(?:select|input) \\{([\\s\\S]*?)\\}`));
    assert.ok(block, `missing ${name} ${size} size block`);
    assert.doesNotMatch(block[1], /(^|\n)\s*height\s*:/, `${name} ${size} must not use a fixed height`);
    assert.match(block[1], /min-height\s*:\s*var\(--ds-control-height-/, `${name} ${size} must use design-token min-height`);
  }
}

// The reported Settings SMS surface must no longer own vertical geometry.
const inputClassMatch = settingsController.match(/const inputClass\s*=\s*\n?\s*'([^']+)'/);
assert.ok(inputClassMatch, 'Settings shared inputClass was not found');
assert.doesNotMatch(inputClassMatch[1], /(?:^|\s)!?(?:py-|h-|min-h-|max-h-)/, 'Settings inputClass must not own vertical padding/height');
assert.match(settingsSms, /<TextField controlOnly[\s\S]{0,160}?controlSize="sm"[\s\S]{0,260}?name=\{key\}/, 'SMS BodyId field must use canonical sm density');
assert.match(settingsSms, /<SelectField controlOnly size="md" icon=\{false\} name="sms_provider"/, 'SMS provider must use styled canonical md SelectField');
assert.match(settingsSms, /<SelectField controlOnly size="sm" icon=\{false\} name=\{field\.key\}/, 'SMS automation selects must use canonical sm SelectField');
assert.doesNotMatch(settingsSms, /!h-10|!min-h-10/, 'SMS settings must not reintroduce forced 40px height utilities');

// Other known fixed-height canonical select call-sites migrated in this root pass.
assert.doesNotMatch(partnerPerformance, /<SelectField[^>]*className="[^"]*\bh-11\b/, 'Partner performance SelectField must not own h-11');
assert.doesNotMatch(mobilePhonesModal, /<SelectField[^>]*className="[^"]*\bh-11\b/, 'Mobile phones SelectField must not own h-11');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v260',
  rootContract: 'canonical single-line field vertical metrics',
  primitives: ['TextField', 'SelectField', 'AppSearchField'],
  sizes: ['sm', 'md', 'lg'],
  finalCascadeGuard: true,
  settingsSmsRootCauseCovered: true,
  fixedHeightRemovedFromCanonicalSelectAndSearch: true,
}, null, 2));
