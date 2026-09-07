#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['app', 'components', 'pages'];
const canonicalRenderer = 'components/ui/SelectField.tsx';
const migratedFiles = [
  'components/ReminderRulesBuilder.tsx',
  'components/ReportSchedulePanel.tsx',
  'components/TelegramTemplateTestModal.tsx',
  'components/TelegramTopicPanel.tsx',
  'pages/Expenses.tsx',
  'pages/Products.tsx',
  'pages/Purchases.tsx',
  'pages/customerDetail/CustomerLedgerRenderSection.tsx',
  'pages/mobilePhones/MobilePhonesModalStack.tsx',
  'pages/partnerDetail/PartnerEditProfileModal.tsx',
  'pages/partnerDetail/PartnerFullSettlementModal.tsx',
  'pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx',
  'pages/partnerDetail/PartnerPhoneCapitalSection.tsx',
  'pages/reports/AbcAnalysisReport.tsx',
  'pages/reports/CashflowReport.tsx',
  'pages/reports/CompareSales.tsx',
  'pages/reports/DeadStockReport.tsx',
  'pages/reports/FinancialOverview.tsx',
  'pages/reports/InventoryAnalysisReport.tsx',
  'pages/reports/PartnerPerformanceReport.tsx',
  'pages/reports/ProductSalesReport.tsx',
];

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
};

const runtimeFiles = sourceRoots.flatMap((sourceRoot) =>
  walk(path.resolve(root, sourceRoot)).filter((file) => /\.(?:ts|tsx)$/.test(file)),
);

const nativeSelectViolations = [];
for (const absolute of runtimeFiles) {
  const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
  if (relative === canonicalRenderer) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/<select\b/g)) {
    nativeSelectViolations.push({
      file: relative,
      line: source.slice(0, match.index).split('\n').length,
    });
  }
}

assert.deepEqual(
  nativeSelectViolations,
  [],
  `Only ${canonicalRenderer} may own the native select renderer. Violations: ${JSON.stringify(nativeSelectViolations)}`,
);

const canonicalSource = fs.readFileSync(path.resolve(root, canonicalRenderer), 'utf8');
assert.equal((canonicalSource.match(/<select\b/g) ?? []).length, 1, 'SelectField must remain the single native select renderer.');
assert.match(canonicalSource, /data-ui-control-kind="select"/, 'SelectField must retain its select control instrumentation.');
assert.match(canonicalSource, /onValueChange\?\./, 'SelectField must retain the value adapter contract.');
assert.match(canonicalSource, /controlOnly/, 'SelectField must retain controlOnly for feature-owned shells.');
assert.match(canonicalSource, /unstyled/, 'SelectField must retain unstyled compatibility mode.');
assert.match(canonicalSource, /showChevron/, 'SelectField must retain feature-owned chevron compatibility.');
assert.match(canonicalSource, /data-ui-select-control-only="true"/, 'SelectField controlOnly mode must own a positioned directional wrapper.');
assert.match(canonicalSource, /app-select-field--control-only/, 'SelectField controlOnly mode must retain the canonical wrapper class.');

assert.ok(!fs.existsSync(path.resolve(root, 'styles/components/select-field.css')), 'SelectField must not depend on a page/custom CSS file.');
assert.match(canonicalSource, /absolute inset-y-0 end-2\.5/, 'SelectField chevron must use logical Tailwind positioning.');
assert.match(canonicalSource, /appearance-none truncate rounded-\[var\(--ds-control-radius\)\]/, 'SelectField visual contract must live in primitive utilities and use the canonical radius token.');
assert.match(canonicalSource, /size = DEFAULT_FORM_CONTROL_SIZE/, 'SelectField density must use the shared form-control default.');
assert.match(canonicalSource, /data-ui-control-size=\{size\}/, 'SelectField must expose its size to the token-owned field contract.');

let migratedSelects = 0;
let preservedContracts = 0;
for (const relative of migratedFiles) {
  const absolute = path.resolve(root, relative);
  assert.ok(fs.existsSync(absolute), `Missing migrated select consumer: ${relative}`);
  const source = fs.readFileSync(absolute, 'utf8');

  assert.doesNotMatch(source, /<select\b/, `${relative} must not render a native select.`);
  assert.match(source, /from\s+["']@\/components\/ui["']/, `${relative} must consume SelectField from the canonical UI barrel.`);
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/SelectField["']/,
    `${relative} imports SelectField directly instead of @/components/ui.`,
  );

  migratedSelects += (source.match(/<SelectField\b/g) ?? []).length;
  preservedContracts += (source.match(/<SelectField\s+controlOnly\s+unstyled\s+showChevron=\{false\}/g) ?? []).length;
}

// v280+ moved customer/partner page-size controls into shared ManagementDirectoryPagination.
// The current v294+ source baseline has 32 direct SelectField usages across this historical migration set;
// no native select renderer was reintroduced, so the guard tracks that real post-migration floor.
assert.ok(migratedSelects >= 32, `Expected at least 32 direct SelectField consumers after shared pagination migration; found ${migratedSelects}.`);
assert.ok(preservedContracts <= migratedSelects, 'Preserved feature-owned SelectField contracts cannot exceed total migrated SelectField consumers.');
const styledCanonicalContracts = migratedSelects - preservedContracts;
assert.ok(styledCanonicalContracts > 0, 'Final select foundation must include centrally styled SelectField consumers in addition to feature-owned compatibility contracts.');

console.log(JSON.stringify({
  status: 'passed',
  scannedRuntimeFiles: runtimeFiles.length,
  nativeSelectRenderers: 1,
  canonicalRenderer,
  migratedFiles: migratedFiles.length,
  migratedSelects,
  preservedFeatureContracts: preservedContracts,
  styledCanonicalContracts,
  remainingNativeSelectOutsideCanonical: nativeSelectViolations.length,
  policy: 'All runtime select elements are rendered by canonical SelectField. Feature-owned layouts may retain controlOnly/unstyled compatibility, while migrated surfaces can use the centralized styled contract.',
}, null, 2));
