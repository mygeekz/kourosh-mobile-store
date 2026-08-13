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

const selectCss = fs.readFileSync(path.resolve(root, 'styles/components/select-field.css'), 'utf8');
assert.match(selectCss, /app-select-field--control-only\[dir="rtl"\][\s\S]*left:\s*\.55rem/, 'RTL control-only SelectField chevron must be physically anchored on the left.');
assert.match(selectCss, /app-select-field--control-only\[dir="ltr"\][\s\S]*right:\s*\.55rem/, 'LTR control-only SelectField chevron must be physically anchored on the right.');

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

assert.ok(migratedSelects >= 35, `Expected at least 35 SelectField consumers across the final migration set; found ${migratedSelects}.`);
assert.ok(preservedContracts >= 35, `Expected all 35 newly migrated selectors to preserve feature-owned visuals; found ${preservedContracts}.`);

console.log(JSON.stringify({
  status: 'passed',
  scannedRuntimeFiles: runtimeFiles.length,
  nativeSelectRenderers: 1,
  canonicalRenderer,
  migratedFiles: migratedFiles.length,
  migratedSelects,
  preservedFeatureContracts: preservedContracts,
  remainingNativeSelectOutsideCanonical: nativeSelectViolations.length,
  policy: 'All runtime select elements are rendered by the canonical SelectField; feature-owned layouts keep their exact class contract through controlOnly/unstyled mode.',
}, null, 2));
