#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-foundation-phase3-v271-baseline.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const manifestById = new Map(manifest.components.map((component) => [component.id, component]));
for (const id of ['form-grid', 'bidi-text', 'form-validation-contract', 'control-shell', 'text-field']) {
  const entry = manifestById.get(id);
  assert.equal(entry?.status, 'canonical', `UI manifest must keep ${id} canonical.`);
  assert.ok(entry?.canonicalPath && fs.existsSync(path.join(root, entry.canonicalPath)), `Canonical Phase 3 owner missing: ${id}`);
}
const manifestPhaseMatch = String(manifest.phase || '').match(/^UI-FOUNDATION-PHASE(\d+)-V(\d+)$/);
assert.ok(manifestPhaseMatch, 'UI manifest must retain the UI-FOUNDATION-PHASEN-VNNN phase contract.');
assert.ok(Number(manifestPhaseMatch[1]) >= 3, 'UI manifest phase must remain at Phase 3 or later.');
assert.ok(Number(manifestPhaseMatch[2]) >= 271, 'UI manifest workstream version must remain v271 or later.');

const grid = read(baseline.canonicalOwners.formGrid);
for (const token of ['grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4']) {
  assert.match(grid, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `FormGrid lost canonical breakpoint token: ${token}`);
}
assert.doesNotMatch(grid, /grid-cols-\[/, 'FormGrid must not introduce arbitrary grid templates.');
assert.match(grid, /data-ui-form-grid/, 'FormGrid must expose semantic ownership attributes.');

const validation = read(baseline.canonicalOwners.validation);
for (const symbol of ['FORM_VALIDATION_MESSAGES', 'requiredTextError', 'requiredSelectionError', 'nonNegativeNumberError', 'compactValidationErrors']) {
  assert.match(validation, new RegExp(`\\b${symbol}\\b`), `Central validation contract lost ${symbol}.`);
}
assert.match(validation, /الزامی است/, 'Central validation contract must retain Persian required-field feedback.');
assert.match(validation, /را انتخاب کنید/, 'Central validation contract must retain Persian selection feedback.');

const bidi = read(baseline.canonicalOwners.bidiText);
assert.match(bidi, /<bdi\b/, 'BidiText must use semantic <bdi> isolation by default.');
assert.match(bidi, /resolveBidiDirection/, 'BidiText must expose the shared direction resolver.');
for (const kind of ['phone', 'imei', 'serial', 'code', 'email', 'url', 'number', 'currency']) {
  assert.match(bidi, new RegExp(`['"]${kind}['"]`), `BidiText contract lost ${kind} kind.`);
}

const textField = read(baseline.canonicalOwners.textField);
assert.match(textField, /valueKind\?:\s*BidiContentKind/, 'TextField must expose semantic valueKind.');
assert.match(textField, /dir=\{resolvedControlDir\}/, 'TextField control must use resolved value direction.');
assert.match(textField, /<ControlShell[\s\S]*?dir=["']rtl["']/, 'TextField shell/label direction must remain RTL when control content is LTR.');

const summary = read(baseline.canonicalOwners.errorSummary);
const hardcodedRed = (summary.match(/(?:text|bg|border|ring)-red-/g) || []).length;
const hardcodedSlate = (summary.match(/(?:text|bg|border|ring)-slate-/g) || []).length;
assert.equal(hardcodedRed, baseline.expectations.formErrorSummaryHardcodedRedPaletteUtilities, 'FormErrorSummary must use semantic danger tokens instead of red palette utilities.');
assert.equal(hardcodedSlate, baseline.expectations.formErrorSummaryHardcodedSlatePaletteUtilities, 'FormErrorSummary must use semantic foreground/muted tokens instead of slate palette utilities.');
assert.match(summary, /data-ui-validation-summary/, 'FormErrorSummary must expose semantic validation-summary ownership.');
assert.match(summary, /focusFirstError/, 'FormErrorSummary items must focus their owning invalid field.');

const addRepair = read('pages/AddRepair.tsx');
const formGridUsages = (addRepair.match(/<FormGrid\b/g) || []).length;
const bidiTextUsages = (addRepair.match(/<BidiText\b/g) || []).length;
assert.ok(formGridUsages >= baseline.expectations.addRepairFormGridUsagesAtLeast, `AddRepair must consume FormGrid at least ${baseline.expectations.addRepairFormGridUsagesAtLeast} times.`);
assert.ok(bidiTextUsages >= baseline.expectations.addRepairBidiTextUsagesAtLeast, `AddRepair must consume BidiText at least ${baseline.expectations.addRepairBidiTextUsagesAtLeast} times.`);
for (const symbol of ['requiredSelectionError', 'requiredTextError', 'nonNegativeNumberError', 'compactValidationErrors', 'focusErrorsSoon']) {
  assert.match(addRepair, new RegExp(`\\b${symbol}\\b`), `AddRepair pilot must consume centralized ${symbol}.`);
}
assert.match(addRepair, /<FormErrorSummary\b/, 'AddRepair pilot must expose the form-level error summary.');
const localRequiredLiterals = (addRepair.match(/errors\.[A-Za-z0-9_]+\s*=\s*['"][^'"]*الزامی است/g) || []).length;
assert.equal(localRequiredLiterals, baseline.expectations.addRepairLocalRequiredValidationLiterals, 'AddRepair must not restore page-local required-validation literals.');
assert.doesNotMatch(addRepair, /lg:grid-cols-\[minmax\(0,1\.35fr\)/, 'AddRepair customer fields must no longer own a page-specific form grid template.');
assert.doesNotMatch(addRepair, /xl:grid-cols-\[minmax\(12rem,0\.7fr\)/, 'AddRepair issue fields must no longer own a page-specific form grid template.');

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  workstreamVersion: baseline.workstreamVersion,
  canonicalOwners: baseline.canonicalOwners,
  pilotForms: baseline.pilotForms,
  addRepair: {
    formGridUsages,
    bidiTextUsages,
    localRequiredValidationLiterals: localRequiredLiterals,
  },
  validationSummary: {
    hardcodedRedPaletteUtilities: hardcodedRed,
    hardcodedSlatePaletteUtilities: hardcodedSlate,
  },
  deferred: baseline.deferred,
}, null, 2));
