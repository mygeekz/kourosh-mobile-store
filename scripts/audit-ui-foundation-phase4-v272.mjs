#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-foundation-phase4-v272-baseline.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const phaseMatch = String(manifest.phase || '').match(/^UI-FOUNDATION-PHASE(\d+)-V(\d+)$/);
assert.ok(phaseMatch, 'UI manifest must retain UI-FOUNDATION-PHASEN-VNNN format.');
assert.ok(Number(phaseMatch[1]) >= 4, 'UI manifest phase must remain Phase 4 or later.');
assert.ok(Number(phaseMatch[2]) >= 272, 'UI manifest workstream version must remain v272 or later.');

const manifestById = new Map(manifest.components.map((component) => [component.id, component]));
for (const id of ['form-grid', 'form-validation-contract', 'control-shell', 'text-field', 'select-field', 'searchable-select-field', 'textarea-field']) {
  const entry = manifestById.get(id);
  assert.equal(entry?.status, 'canonical', `UI manifest must keep ${id} canonical.`);
  assert.ok(entry?.canonicalPath && fs.existsSync(path.join(root, entry.canonicalPath)), `Canonical owner missing: ${id}`);
}

for (const file of baseline.migrationTargets) {
  assert.ok(fs.existsSync(path.join(root, file)), `Phase 4 migration target is missing: ${file}`);
}

for (const file of baseline.formGridTargets) {
  assert.match(read(file), /<FormGrid\b/, `${file} must use canonical FormGrid for multi-field form layout.`);
}
for (const file of baseline.validationSummaryTargets) {
  assert.match(read(file), /<FormErrorSummary\b/, `${file} must retain a form-level validation summary.`);
}
for (const [file, symbols] of Object.entries(baseline.centralValidationTargets)) {
  const source = read(file);
  for (const symbol of symbols) {
    assert.match(source, new RegExp(`\\b${escapeRegExp(symbol)}\\b`), `${file} must use central validator ${symbol}.`);
  }
}
for (const [file, canonicalExport] of Object.entries(baseline.delegatedCanonicalSelectTargets)) {
  const source = read(file);
  assert.match(source, new RegExp(`\\b${escapeRegExp(canonicalExport)}\\b`), `${file} must delegate selects to ${canonicalExport}.`);
  assert.doesNotMatch(source, /\buseOverlayPortalTarget\b/, `${file} must not own overlay portal positioning after canonical select delegation.`);
  assert.doesNotMatch(source, /\bmenuPortalTarget\b/, `${file} must not own react-select portal targets after canonical select delegation.`);
  assert.doesNotMatch(source, /from\s+['"]react-select['"]/, `${file} must not import react-select directly after canonical select delegation.`);
}

const runtimeRoots = ['app', 'components', 'pages', 'utils'];
const tsxFiles = [];
const walk = (dir) => {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) walk(relative);
    else if (/\.tsx$/.test(entry.name)) tsxFiles.push(relative);
  }
};
runtimeRoots.forEach(walk);

const canonicalNativeOwners = new Set([
  'components/ui/AppSearchField.tsx',
  'components/ui/CheckboxField.tsx',
  'components/ui/RangeField.tsx',
  'components/ui/SelectField.tsx',
  'components/ui/TextareaField.tsx',
  'components/ui/TextField.tsx'
]);
let rawTextualInputs = 0;
let rawSelects = 0;
let rawTextareas = 0;
const rawViolations = [];
for (const file of tsxFiles) {
  if (canonicalNativeOwners.has(file)) continue;
  const source = read(file);
  const inputMatches = [...source.matchAll(/<input\b[^>]*>/g)];
  for (const match of inputMatches) {
    const markup = match[0];
    if (/type\s*=\s*['"]file['"]/.test(markup)) continue;
    rawTextualInputs += 1;
    rawViolations.push(`${file}: ${markup.slice(0, 140)}`);
  }
  const selectCount = (source.match(/<select\b/g) || []).length;
  const textareaCount = (source.match(/<textarea\b/g) || []).length;
  rawSelects += selectCount;
  rawTextareas += textareaCount;
  if (selectCount) rawViolations.push(`${file}: ${selectCount} raw select(s)`);
  if (textareaCount) rawViolations.push(`${file}: ${textareaCount} raw textarea(s)`);
}
assert.equal(rawTextualInputs, baseline.expectations.rawTextualInputsOutsideCanonicalOwners, `Raw input debt changed.\n${rawViolations.join('\n')}`);
assert.equal(rawSelects, baseline.expectations.rawSelectsOutsideCanonicalOwners, `Raw select debt changed.\n${rawViolations.join('\n')}`);
assert.equal(rawTextareas, baseline.expectations.rawTextareasOutsideCanonicalOwners, `Raw textarea debt changed.\n${rawViolations.join('\n')}`);

let reactSelectImports = 0;
let menuPortalTargets = 0;
for (const file of baseline.migrationTargets) {
  const source = read(file);
  reactSelectImports += (source.match(/from\s+['"]react-select['"]/g) || []).length;
  menuPortalTargets += (source.match(/\bmenuPortalTarget\b/g) || []).length;
}
assert.equal(reactSelectImports, baseline.expectations.directReactSelectImportsInMigrationTargets, 'Migrated application forms must not own direct react-select imports.');
assert.equal(menuPortalTargets, baseline.expectations.directMenuPortalTargetsInMigrationTargets, 'Migrated application forms must not own direct menuPortalTarget plumbing.');

const settingsBusiness = read('pages/settings/SettingsBusinessPanel.tsx');
for (const token of ['noValidate', '<FormErrorSummary', 'businessFormErrors.store_name', 'requiredTextError', 'emailAddressError', 'urlAddressError']) {
  assert.match(settingsBusiness, new RegExp(escapeRegExp(token)), `SettingsBusinessPanel lost Phase 4 validation token: ${token}`);
}

const installment = read('pages/AddInstallmentSalePage.tsx');
for (const token of ['accessoryFormErrors', 'serviceFormErrors', 'accessoryFormErrors.productId', 'serviceFormErrors.serviceId', '<FormGrid columns={2}']) {
  assert.match(installment, new RegExp(escapeRegExp(token)), `AddInstallmentSalePage lost Phase 4 modal-field migration token: ${token}`);
}

const productsManager = read('pages/inventory/ProductsManager.tsx');
assert.doesNotMatch(productsManager, /ux-input-affix-target--left/, 'ProductsManager must not restore page-owned input affix styling for migrated inline forms.');
assert.doesNotMatch(productsManager, /text-xs\s+text-red-500[^\n]*categoryFormError/, 'ProductsManager category validation must stay inside canonical field error rendering.');

const validation = read('components/ui/formValidation.ts');
for (const symbol of ['textLengthError', 'matchingTextError', 'urlAddressError', 'integerRangeError', 'positiveNumberError']) {
  assert.match(validation, new RegExp(`\\b${symbol}\\b`), `Phase 4 central validation contract lost ${symbol}.`);
}

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  workstreamVersion: baseline.workstreamVersion,
  migrationTargets: baseline.migrationTargets.length,
  formGridTargets: baseline.formGridTargets.length,
  validationSummaryTargets: baseline.validationSummaryTargets.length,
  centralValidationTargets: Object.keys(baseline.centralValidationTargets).length,
  delegatedCanonicalSelectTargets: Object.keys(baseline.delegatedCanonicalSelectTargets).length,
  runtimeTsxFiles: tsxFiles.length,
  nativeControlDebt: { rawTextualInputs, rawSelects, rawTextareas },
  migratedSelectDebt: { reactSelectImports, menuPortalTargets },
  deferred: baseline.deferred
}, null, 2));
