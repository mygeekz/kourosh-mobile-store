#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-foundation-phase5-v273-baseline.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const phaseMatch = String(manifest.phase || '').match(/^UI-FOUNDATION-PHASE(\d+)-V(\d+)$/);
assert.ok(phaseMatch, 'UI manifest must retain UI-FOUNDATION-PHASEN-VNNN format.');
assert.ok(Number(phaseMatch[1]) >= 5, 'UI manifest phase must remain Phase 5 or later.');
assert.ok(Number(phaseMatch[2]) >= 273, 'UI manifest workstream version must remain v273 or later.');

const manifestById = new Map((manifest.components || []).map((component) => [component.id, component]));
for (const [id, canonicalPath, exportName] of [
  ['dialog-shell', baseline.canonicalOwners.dialogShell, 'DialogShell'],
  ['dialog', baseline.canonicalOwners.dialog, 'Dialog'],
  ['drawer', baseline.canonicalOwners.drawer, 'Drawer'],
  ['dialog-actions', baseline.canonicalOwners.dialogActions, 'DialogActions'],
]) {
  const entry = manifestById.get(id);
  assert.equal(entry?.status, 'canonical', `${id} must remain canonical.`);
  assert.equal(entry?.canonicalPath, canonicalPath, `${id} canonical owner changed unexpectedly.`);
  assert.equal(entry?.exportName, exportName, `${id} export changed unexpectedly.`);
  assert.ok(fs.existsSync(path.join(root, canonicalPath)), `${id} canonical source is missing.`);
}

const barrel = read('components/ui/index.ts');
assert.match(barrel, /default as Drawer/, '@/components/ui must export Drawer.');
assert.match(barrel, /DrawerProps/, '@/components/ui must export Drawer types.');
assert.match(barrel, /DialogMobileBehavior/, '@/components/ui must export the mobile dialog behavior contract.');

const dialogShell = read(baseline.canonicalOwners.dialogShell);
for (const token of [
  'getOverlayPortalHost',
  "setPortalHost(getOverlayPortalHost(backdropLayer, 'rtl'))",
  'kourosh-dialog-open',
  "setAttribute('inert', '')",
  "document.addEventListener('focusin'",
  "window.addEventListener('keydown'",
  'data-dialog-mobile',
  'data-dialog-layer',
  'DIALOG_OWNED_FLOATING_LAYERS',
]) {
  assert.match(dialogShell, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `DialogShell lost Phase 5 contract token: ${token}`);
}
assert.doesNotMatch(dialogShell, /createPortal\([\s\S]{0,1000}?document\.body/, 'DialogShell must portal through the semantic overlay host, never document.body directly.');
assert.equal((dialogShell.match(/\.style\.setProperty\s*\(/g) || []).length, baseline.expectations.dialogShellRuntimeImportantStyleWrites, 'DialogShell must not restore runtime !important geometry writes.');

const dialog = read(baseline.canonicalOwners.dialog);
for (const token of ['mobileBehavior', "resolvedVariant === 'compact'", "resolvedVariant === 'expansive'", 'initialFocusRef']) {
  assert.match(dialog, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Dialog lost explicit mobile/focus behavior: ${token}`);
}

const drawer = read(baseline.canonicalOwners.drawer);
for (const token of ['layer="drawer"', 'data-drawer-size', 'data-drawer-side', 'kourosh-drawer__body', 'kourosh-drawer__footer', 'ariaLabel={hideHeader ? title : undefined}', 'ariaLabelledBy={hideHeader ? undefined : titleId}']) {
  assert.match(drawer, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Drawer lost canonical token: ${token}`);
}


const reportsLayout = read('pages/ReportsLayout.tsx');
assert.match(reportsLayout, /<Drawer[\s\S]{0,700}?data-report-drawer-kind['"]?:?[^\n]*reports-workspace/, 'Reports workspace must use canonical Drawer.');
assert.doesNotMatch(reportsLayout, /<DialogShell[\s\S]{0,500}?ariaLabel="فضای کاری گزارش‌ها"/, 'Reports workspace must not regress to page-owned DialogShell drawer geometry.');
assert.match(reportsLayout, /<DialogShell[\s\S]{0,260}?layer="command"[\s\S]{0,260}?ariaLabel="جستجوی سریع گزارش‌ها"/, 'Reports command palette must use the semantic command layer.');

const smsAutoSendSheet = read('components/SmsAutoSendSheet.tsx');
assert.match(smsAutoSendSheet, /<DialogShell[\s\S]{0,220}?layer="sheet"[\s\S]{0,220}?mobileBehavior="sheet"/, 'SMS auto-send sheet must use the semantic sheet layer.');

const modalSystemCss = read(baseline.canonicalOwners.modalCss);
assert.match(modalSystemCss, /data-dialog-layer='sheet'/, 'Modal foundation must own semantic sheet viewport placement.');

const reportsStage27Css = read('styles/system/reports-redesign/reports-stage27-financial-aging-workspace-fixes.css');
assert.doesNotMatch(reportsStage27Css, /\.reports-workspace--drawer\s*\{[^}]*z-index/s, 'Reports workspace must not own a local drawer z-index.');
const purchaseSuggestionCss = read('styles/system/reports-redesign/purchase-suggestions-action-board/purchase-suggestions-action-board.phase2-stabilized.css');
assert.doesNotMatch(purchaseSuggestionCss, /\.purchase210-drawer-overlay\s*\{[^}]*z-index/s, 'Purchase suggestion drawer must not own a local overlay z-index.');
for (const selector of ['reports-command--dialog-shell', 'report-side-drawer-backdrop', 'purchase210-drawer-overlay--dialog-shell', 'sms-auto-send-sheet-overlay']) {
  assert.doesNotMatch(modalSystemCss, new RegExp(`\\.${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\{]*\\{[^}]*z-index`, 's'), `${selector} must inherit semantic overlay z-order.`);
}

const sourceRoots = ['app', 'components', 'contexts', 'pages'];
const tsxFiles = [];
const walk = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relative = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) walk(relative);
    else if (/\.tsx$/.test(entry.name)) tsxFiles.push(relative);
  }
};
sourceRoots.forEach(walk);

const directDrawerShellConsumers = [];
const rawRoleDialogOwners = new Set();
let widthClassUsages = 0;
for (const file of tsxFiles) {
  const source = read(file);
  if (file !== baseline.canonicalOwners.drawer && /<DialogShell\b[\s\S]{0,500}?layer=["']drawer["']/.test(source)) directDrawerShellConsumers.push(file);
  if (/role=["']dialog["']/.test(source)) rawRoleDialogOwners.add(file);
  widthClassUsages += (source.match(/\bwidthClass\s*=/g) || []).length;
}
assert.equal(directDrawerShellConsumers.length, baseline.expectations.directDrawerDialogShellConsumersOutsideDrawer, `Drawer consumers must use canonical Drawer: ${directDrawerShellConsumers.join(', ')}`);
assert.ok(widthClassUsages <= baseline.expectations.legacyWidthClassUsagesMaximum, `Dialog widthClass compatibility debt increased: ${widthClassUsages}`);

const approvedRoleOwners = new Set(baseline.approvedRawRoleDialogOwners);
const escapedRoleOwners = [...rawRoleDialogOwners].filter((file) => !approvedRoleOwners.has(file));
assert.equal(escapedRoleOwners.length, baseline.expectations.rawRoleDialogOwnersOutsideApproved, `New raw role=dialog owner escaped the canonical foundation: ${escapedRoleOwners.join(', ')}`);

let drawerFixedOverlays = 0;
let drawerArbitraryZ = 0;
for (const file of baseline.drawerConsumers) {
  assert.ok(fs.existsSync(path.join(root, file)), `Drawer consumer missing: ${file}`);
  const source = read(file);
  assert.match(source, /<Drawer\b/, `${file} must render the canonical Drawer.`);
  drawerFixedOverlays += (source.match(/\bfixed\s+inset-0\b/g) || []).length;
  drawerArbitraryZ += (source.match(/\bz-\[[^\]]+\]/g) || []).length;
}
assert.equal(drawerFixedOverlays, baseline.expectations.drawerConsumerFixedViewportOverlays, 'Drawer consumers must not own fixed viewport overlay geometry.');
assert.equal(drawerArbitraryZ, baseline.expectations.drawerConsumerArbitraryZIndexes, 'Drawer consumers must not own arbitrary overlay z-index values.');

const overlayCss = read(baseline.canonicalOwners.overlayCss);
const zValue = (name) => {
  const match = overlayCss.match(new RegExp(`--kourosh-z-${name}:\\s*(\\d+)`));
  assert.ok(match, `Overlay z token missing: ${name}`);
  return Number(match[1]);
};
const orderedLayers = ['sheet-backdrop', 'sheet-panel', 'drawer-backdrop', 'drawer-panel', 'modal-backdrop', 'modal-panel', 'command-backdrop', 'command-panel', 'dropdown', 'popover', 'tooltip', 'floating', 'toast'];
const values = orderedLayers.map((name) => zValue(name));
for (let index = 1; index < values.length; index += 1) {
  assert.ok(values[index] > values[index - 1], `Overlay nesting order must strictly ascend: ${orderedLayers[index - 1]} -> ${orderedLayers[index]}`);
}

const modalCss = read(baseline.canonicalOwners.modalCss);
for (const contractPattern of [
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /data-dialog-mobile='sheet'/,
  /data-dialog-mobile='fullscreen'/,
  /kourosh-drawer__panel/,
  /data-drawer-side='inline-end'/,
  /position:\s*sticky/,
  /prefers-reduced-motion:\s*reduce/,
]) {
  assert.match(modalCss, contractPattern, `Modal system lost Phase 5 responsive/accessibility CSS: ${contractPattern}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  workstreamVersion: baseline.workstreamVersion,
  canonicalDrawerConsumers: baseline.drawerConsumers.length,
  directDrawerShellConsumersOutsideDrawer: directDrawerShellConsumers.length,
  rawRoleDialogOwners: [...rawRoleDialogOwners].sort(),
  escapedRawRoleDialogOwners: escapedRoleOwners,
  legacyWidthClassUsages: widthClassUsages,
  overlayOrder: Object.fromEntries(orderedLayers.map((layer, index) => [layer, values[index]])),
  semanticDialogPortal: true,
  applicationInertWhileDialogOpen: true,
  focusContainment: true,
  mobileBehaviorContract: true,
  safeAreaContract: true,
  reducedMotionContract: true,
  deferred: baseline.deferred,
}, null, 2));
