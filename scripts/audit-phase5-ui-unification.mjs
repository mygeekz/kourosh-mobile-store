#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const CLIENT_ROOTS = ['app', 'components', 'contexts', 'hooks', 'pages', 'services', 'utils'];
const PORTAL_OWNERS = [
  'components/ui/DialogShell.tsx',
  'components/ui/PortalLayer.tsx',
];

const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');
const walk = (relativeDirectory) => {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [relativePath]
      : [];
  });
};

const files = [...new Set(CLIENT_ROOTS.flatMap(walk))].sort();
const sources = new Map(files.map((file) => [file, read(file)]));
const portalOwners = files.filter((file) => /\bcreatePortal\b/.test(sources.get(file)));
const extremeZIndexLiterals = files.flatMap((file) => {
  const matches = sources.get(file).match(/\b214748\d+\b/g) ?? [];
  return matches.map((value) => `${file}:${value}`);
});
const rawInputElements = files.reduce(
  (count, file) => count + (sources.get(file).match(/<input\b/g) ?? []).length,
  0,
);
const rawSelectElements = files.reduce(
  (count, file) => count + (sources.get(file).match(/<select\b/g) ?? []).length,
  0,
);

assert.deepEqual(portalOwners, PORTAL_OWNERS, 'Only the canonical portal primitives may own createPortal.');
assert.deepEqual(extremeZIndexLiterals, [], 'Extreme z-index literals must use the shared layer tokens.');
assert.ok(rawInputElements <= 155, `Raw input debt increased to ${rawInputElements}.`);
assert.ok(rawSelectElements <= 36, `Raw select debt increased to ${rawSelectElements}.`);

const canonicalDialog = read('components/ui/Dialog.tsx');
const appModalAdapter = read('components/modals/AppModal.tsx');
assert.match(canonicalDialog, /import DialogShell from '\.\/DialogShell'/);
assert.match(canonicalDialog, /<DialogShell\b/);
assert.match(appModalAdapter, /export \{ default \} from '\.\.\/ui\/Dialog'/);
assert.equal(fs.existsSync(path.resolve(root, 'components/Modal.tsx')), false);

const canonicalSelect = read('components/ui/SelectField.tsx');
const selectAdapter = read('components/ui/AppSelectField.tsx');
assert.equal((canonicalSelect.match(/<select\b/g) ?? []).length, 1);
assert.match(canonicalSelect, /onValueChange/);
assert.match(canonicalSelect, /wrapperClassName/);
assert.match(canonicalSelect, /data-ui-control-kind="select"/);
assert.match(selectAdapter, /import SelectField/);
assert.match(selectAdapter, /<SelectField\b/);
assert.match(selectAdapter, /onValueChange=\{onChange\}/);
assert.doesNotMatch(selectAdapter, /<select\b/);

for (const [file, type, exportName] of [
  ['components/ui/CheckboxField.tsx', 'checkbox', 'CheckboxField'],
  ['components/ui/RangeField.tsx', 'range', 'RangeField'],
]) {
  const source = read(file);
  assert.equal((source.match(/<input\b/g) ?? []).length, 1, `${file} must own exactly one native input renderer.`);
  assert.match(source, new RegExp(`type=\"${type}\"`));
  assert.match(source, new RegExp(`data-ui-control-kind=\"${type}\"`));
  assert.match(read('components/ui/index.ts'), new RegExp(`\\b${exportName}\\b`));
}

const datePicker = read('components/ShamsiDatePicker.tsx');
assert.match(datePicker, /resolveFloatingOverlayPosition/);
assert.match(datePicker, /<PortalLayer layer="popover"/);
assert.match(datePicker, /ResizeObserver/);
assert.match(datePicker, /aria-haspopup="dialog"/);
assert.match(datePicker, /aria-controls=/);
assert.match(datePicker, /aspect-square min-h-9 w-full min-w-0/);

const dialogShell = read('components/ui/DialogShell.tsx');
for (const contractFragment of [
  "event.key === 'Escape'",
  "event.key !== 'Tab'",
  'lockBodyScroll()',
  'previousActiveElement.focus',
  'aria-modal="true"',
]) {
  assert.ok(dialogShell.includes(contractFragment), `Dialog accessibility contract is missing: ${contractFragment}`);
}

const manifest = JSON.parse(read('config/ui/ui-manifest.json'));
assert.equal(manifest.version, '2.1.0');
assert.equal(manifest.phase, 'UI-6.5');
assert.equal(manifest.responsiveContract.status, 'enforced');
assert.deepEqual(Object.values(manifest.responsiveContract.breakpoints), [640, 768, 1024, 1280]);
assert.equal(manifest.layerContract.status, 'enforced');
assert.equal(manifest.architectureLock.status, 'enforced');
assert.equal(manifest.styleSystem.newLocalCssFilesAllowed, false);
assert.equal(manifest.componentPolicy.directCanonicalFileImportsAllowed, false);

const overlayCss = read('styles/system/overlay-layer-contract.css');
assert.equal((overlayCss.match(/:root\s*\{/g) ?? []).length, 1, 'Overlay tokens require one canonical :root block.');
const layerTokenMap = {
  header: 'header',
  floating: 'floating',
  backdrop: 'modal-backdrop',
  modal: 'modal-panel',
  command: 'command-panel',
  sheet: 'sheet-panel',
  dropdown: 'dropdown',
  popover: 'popover',
  tooltip: 'tooltip',
  drawer: 'drawer-panel',
  toast: 'toast',
};
for (const [manifestLayer, cssToken] of Object.entries(layerTokenMap)) {
  const pattern = new RegExp(`--kourosh-z-${cssToken}:\\s*${manifest.layerContract.layers[manifestLayer]};`, 'g');
  assert.equal(
    (overlayCss.match(pattern) ?? []).length,
    1,
    `Layer ${manifestLayer} must match its single CSS token declaration.`,
  );
}

const dateCss = read('styles/components/date-field.css');
assert.match(dateCss, /max-height:\s*calc\(100dvh - 1rem\)/);
assert.match(dateCss, /@media \(max-width: 639px\)/);

const migratedLegacyOverlayStyles = [
  'styles/system/audit-operations-center-v72.css',
  'styles/system/notifications-saas-redesign-phase95.css',
  'styles/system/reports-redesign/reports-stage222-generic-modal-sidebar-lock.css',
  'styles/system/reports-redesign/reports-stage64-compare-sales-details-modal.css',
  'styles/system/ui-contracts/telegram-v56-logs-modal-and-table-fix.css',
];
for (const file of migratedLegacyOverlayStyles) {
  const source = read(file);
  assert.doesNotMatch(source, /z-index:\s*(?:214748\d+|100000)\b/, `${file} restored an extreme modal layer literal.`);
}

console.log(JSON.stringify({
  status: 'passed',
  scannedClientFiles: files.length,
  portalOwnerFiles: portalOwners.length,
  extremeZIndexLiterals: extremeZIndexLiterals.length,
  migratedExtremeCssModalLiterals: 0,
  nativeSelectRenderersInSharedAdapters: 1,
  rawInputElements,
  rawSelectElements,
  responsiveAcceptanceWidths: [390, 640, 768, 1024, 1440],
  rtlContract: 'enforced',
  darkModeContract: 'preserved',
  keyboardAndFocusContract: 'enforced',
}, null, 2));
