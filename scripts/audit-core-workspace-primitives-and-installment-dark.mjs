#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetFiles = [
  'pages/inventoryPro/InventoryProPage.tsx',
  'pages/AddInstallmentSalePage.tsx',
  'pages/mobilePhones/MobilePhonesMainWorkspace.tsx',
];

const totals = {
  TextField: 0,
  SelectField: 0,
  CheckboxField: 0,
  nativeInput: 0,
  nativeSelect: 0,
  nativeTextarea: 0,
};

for (const file of targetFiles) {
  const absolute = path.resolve(root, file);
  assert.ok(fs.existsSync(absolute), `Missing guarded core workspace file: ${file}`);
  const source = fs.readFileSync(absolute, 'utf8');

  totals.TextField += (source.match(/<TextField\b/g) ?? []).length;
  totals.SelectField += (source.match(/<SelectField\b/g) ?? []).length;
  totals.CheckboxField += (source.match(/<CheckboxField\b/g) ?? []).length;
  totals.nativeInput += (source.match(/<input\b/g) ?? []).length;
  totals.nativeSelect += (source.match(/<select\b/g) ?? []).length;
  totals.nativeTextarea += (source.match(/<textarea\b/g) ?? []).length;

  assert.match(source, /from\s+["']@\/components\/ui["']/, `${file} must consume canonical UI primitives from the barrel.`);
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/(?:TextField|SelectField|CheckboxField|TextareaField)["']/,
    `${file} imports a primitive directly instead of the canonical @/components/ui barrel.`,
  );
}

assert.equal(totals.nativeInput, 0, `Guarded core workspaces must not render native input elements; found ${totals.nativeInput}.`);
assert.equal(totals.nativeSelect, 0, `Guarded core workspaces must not render native select elements; found ${totals.nativeSelect}.`);
assert.equal(totals.nativeTextarea, 0, `Guarded core workspaces must not render native textarea elements; found ${totals.nativeTextarea}.`);
assert.ok(totals.TextField >= 32, `Expected at least 32 TextField consumers; found ${totals.TextField}.`);
assert.ok(totals.SelectField >= 20, `Expected at least 20 SelectField consumers; found ${totals.SelectField}.`);
assert.ok(totals.CheckboxField >= 1, `Expected at least one CheckboxField consumer; found ${totals.CheckboxField}.`);

const reportFile = path.resolve(root, 'pages/reports/PhoneInstallmentSalesReport.tsx');
const reportSource = fs.readFileSync(reportFile, 'utf8');
assert.match(reportSource, /from\s+["']@\/components\/ui["']/, 'Phone installment report must consume canonical UI primitives from the barrel.');
assert.match(reportSource, /<ReportControlDock\b/, 'Phone installment report must keep the canonical approved report-control dock.');
assert.match(reportSource, /presentation=["']approved["']/, 'Phone installment report must keep the approved report-control presentation.');
assert.match(reportSource, /<PanelCard\b/, 'Phone installment KPI cards must use the canonical PanelCard primitive.');
assert.match(reportSource, /<SurfaceHeader\b/, 'Phone installment report sections must use the canonical SurfaceHeader primitive.');
assert.match(reportSource, /<DataTableShell\b/, 'Phone installment report table must use the canonical DataTableShell primitive.');
assert.match(reportSource, /<ActionLink\b/, 'Phone installment report row navigation must use the canonical ActionLink primitive.');
assert.match(reportSource, /surface=["']glass["'][\s\S]*?scheme=["']adaptive["']/, 'Phone installment responsive cards must delegate light/dark surfaces to the adaptive Surface contract.');
assert.doesNotMatch(
  reportSource,
  /className=(?:["'][^"']*\binstallment-sales-|\{[^}]*\binstallment-sales-)/,
  'Phone installment report must not restore page-owned installment-sales-* styling classes.',
);

const stylesheetFile = path.resolve(root, 'styles/system/reports-redesign/reports-stage84-phone-installment-sales-executive.css');
assert.equal(
  fs.existsSync(stylesheetFile),
  false,
  'Phone installment report Stage84 page-owned stylesheet is retired; dark mode must remain delegated to shared adaptive primitives.',
);

console.log(JSON.stringify({
  status: 'passed',
  scannedFiles: targetFiles.length,
  canonicalUsages: {
    text: totals.TextField,
    select: totals.SelectField,
    checkbox: totals.CheckboxField,
  },
  remainingNativeControls: {
    input: totals.nativeInput,
    select: totals.nativeSelect,
    textarea: totals.nativeTextarea,
  },
  installmentReport: {
    sharedAdaptivePrimitives: true,
    pageOwnedStylesheetRetired: true,
  },
  policy: 'High-density installment, phone inventory, and inventory-pro workspaces use canonical renderers; the phone installment report delegates responsive light/dark presentation to shared PanelCard/Surface/DataTableShell primitives without page-owned CSS.',
}, null, 2));
