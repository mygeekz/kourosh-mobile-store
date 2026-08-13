#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetFiles = [
  'pages/SalesCartPage.tsx',
  'components/CartSummary.tsx',
  'pages/SalesHub.tsx',
  'pages/Invoices.tsx',
  'pages/InvoiceForm.tsx',
  'pages/InstallmentSaleDetailPage.tsx',
  'pages/Repairs.tsx',
];

let nativeSelect = 0;
let canonicalSelect = 0;
let searchableSelect = 0;
let compatibilityMode = 0;
let styledCanonicalMode = 0;
let partialCompatibilityMode = 0;

for (const file of targetFiles) {
  const absolute = path.resolve(root, file);
  assert.ok(fs.existsSync(absolute), `Missing guarded sales/cart/repair file: ${file}`);
  const source = fs.readFileSync(absolute, 'utf8');

  nativeSelect += (source.match(/<select\b/g) ?? []).length;
  searchableSelect += (source.match(/<SearchableSelectField(?:<|\s)/g) ?? []).length;

  const selectOpenings = source.match(/<SelectField\b[^>]*>/gs) ?? [];
  canonicalSelect += selectOpenings.length;
  for (const opening of selectOpenings) {
    const hasControlOnly = /\bcontrolOnly\b/.test(opening);
    const hasUnstyled = /\bunstyled\b/.test(opening);
    const hasHiddenChevron = /\bshowChevron=\{false\}/.test(opening);
    const compatibilityFlags = Number(hasControlOnly) + Number(hasUnstyled) + Number(hasHiddenChevron);
    if (compatibilityFlags === 3) compatibilityMode += 1;
    else if (compatibilityFlags === 0) styledCanonicalMode += 1;
    else partialCompatibilityMode += 1;
  }

  assert.match(source, /from\s+["']@\/components\/ui["']/, `${file} must consume select primitives from the canonical UI barrel.`);
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/SelectField["']/,
    `${file} imports SelectField directly instead of @/components/ui.`,
  );
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/SearchableSelectField["']/,
    `${file} imports SearchableSelectField directly instead of @/components/ui.`,
  );
}

const canonicalControls = canonicalSelect + searchableSelect;
assert.equal(nativeSelect, 0, `Guarded sales/cart/repair surfaces must not render native select elements; found ${nativeSelect}.`);
assert.ok(canonicalControls >= 8, `Expected at least 8 canonical select consumers; found ${canonicalControls}.`);
assert.equal(
  partialCompatibilityMode,
  0,
  `SelectField compatibility mode must be all-or-nothing (controlOnly + unstyled + showChevron={false}); found ${partialCompatibilityMode} partial controls.`,
);

console.log(JSON.stringify({
  status: 'passed',
  scannedFiles: targetFiles.length,
  canonicalSelect,
  searchableSelect,
  canonicalControls,
  remainingNativeSelect: nativeSelect,
  preservedFeatureContracts: compatibilityMode,
  styledCanonicalMode,
  policy: 'Sales, cart, invoice, installment-check and repair selectors use SelectField or SearchableSelectField from the canonical UI barrel; feature-owned compatibility mode remains explicit and complete.',
}, null, 2));
