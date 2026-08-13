#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetFiles = [
  'pages/Outbox.tsx',
  'pages/Notifications.tsx',
  'components/TelegramLogsPanel.tsx',
  'components/SmsLogsPanel.tsx',
  'pages/reports/FinancialAuditReport.tsx',
  'pages/reports/ProductMargins.tsx',
  'pages/reports/CreditorsReport.tsx',
  'pages/reports/DebtorsReport.tsx',
  'pages/reports/PhoneSalesReport.tsx',
  'pages/reports/PhoneInstallmentSalesReport.tsx',
  'pages/reports/TopCustomersReport.tsx',
  'pages/reports/TopSuppliersReport.tsx',
  'pages/reports/RfmReport.tsx',
  'pages/reports/CohortReport.tsx',
];

const totals = { TextField: 0, AppSearchField: 0, SelectField: 0, nativeInput: 0, nativeSelect: 0, nativeTextarea: 0 };

for (const file of targetFiles) {
  const absolute = path.resolve(root, file);
  assert.ok(fs.existsSync(absolute), `Missing guarded file: ${file}`);
  const source = fs.readFileSync(absolute, 'utf8');

  totals.TextField += (source.match(/<TextField\b/g) ?? []).length;
  totals.AppSearchField += (source.match(/<AppSearchField\b/g) ?? []).length;
  totals.SelectField += (source.match(/<SelectField\b/g) ?? []).length;
  totals.nativeInput += (source.match(/<input\b/g) ?? []).length;
  totals.nativeSelect += (source.match(/<select\b/g) ?? []).length;
  totals.nativeTextarea += (source.match(/<textarea\b/g) ?? []).length;

  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/(?:TextField|SelectField)["']/,
    `${file} imports a field primitive directly instead of the canonical @/components/ui barrel.`,
  );
}

assert.equal(totals.nativeInput, 0, `Guarded messaging/report-filter files must not render native input elements; found ${totals.nativeInput}.`);
assert.equal(totals.nativeSelect, 0, `Guarded messaging/report-filter files must not render native select elements; found ${totals.nativeSelect}.`);
assert.equal(totals.nativeTextarea, 0, `Guarded messaging/report-filter files must not render native textarea elements; found ${totals.nativeTextarea}.`);
assert.ok(totals.TextField >= 12, `Expected at least 12 TextField consumers; found ${totals.TextField}.`);
assert.ok(totals.AppSearchField >= 2, `Expected at least 2 AppSearchField consumers after mobile-sales migration; found ${totals.AppSearchField}.`);
assert.ok(totals.SelectField >= 22, `Expected at least 22 SelectField consumers; found ${totals.SelectField}.`);

const textFieldSource = fs.readFileSync(path.resolve(root, 'components/ui/TextField.tsx'), 'utf8');
const selectFieldSource = fs.readFileSync(path.resolve(root, 'components/ui/SelectField.tsx'), 'utf8');
assert.match(textFieldSource, /unstyled\?: boolean/);
assert.match(textFieldSource, /data-ui-control-kind="text"/);
assert.match(selectFieldSource, /unstyled\?: boolean/);
assert.match(selectFieldSource, /showChevron\?: boolean/);
assert.match(selectFieldSource, /data-ui-control-kind="select"/);

console.log(JSON.stringify({
  status: 'passed',
  scannedFiles: targetFiles.length,
  canonicalUsages: { text: totals.TextField, search: totals.AppSearchField, select: totals.SelectField },
  remainingNativeControls: { input: totals.nativeInput, select: totals.nativeSelect, textarea: totals.nativeTextarea },
  policy: 'Messaging centers, delivery logs, and selected report filters use canonical field renderers; mobile-sales searches use AppSearchField inside the approved report-control dock.',
}, null, 2));
