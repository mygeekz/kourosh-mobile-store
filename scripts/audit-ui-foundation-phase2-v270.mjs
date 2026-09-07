#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-foundation-phase2-v270-baseline.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/ui/ui-manifest.json'), 'utf8'));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(absolute) : [absolute];
});
const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const readRel = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const runtimeFiles = baseline.scopeRoots.flatMap((scopeRoot) => {
  const absolute = path.join(root, scopeRoot);
  return fs.existsSync(absolute) ? walk(absolute).filter((file) => /\.(?:ts|tsx)$/.test(file)) : [];
});
const approvedPortalOwners = new Set(baseline.approvedDirectCreatePortalOwners);
const createPortalUsages = [];
const bodyMenuPortalTargets = [];

for (const file of runtimeFiles) {
  const relative = rel(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bcreatePortal\s*\(/g)) {
    createPortalUsages.push({ file: relative, line: source.slice(0, match.index).split('\n').length });
  }
  for (const match of source.matchAll(/menuPortalTarget\s*=\s*\{?[^\n}]*document\.body/g)) {
    bodyMenuPortalTargets.push({ file: relative, line: source.slice(0, match.index).split('\n').length });
  }
}

const escapedPortalOwners = createPortalUsages.filter((usage) => !approvedPortalOwners.has(usage.file));
assert.equal(
  escapedPortalOwners.length,
  baseline.expectations.directCreatePortalOutsideApprovedOwners,
  `Direct createPortal escaped canonical owners: ${JSON.stringify(escapedPortalOwners)}`,
);
assert.equal(
  bodyMenuPortalTargets.length,
  baseline.expectations.directDocumentBodyMenuPortalTargets,
  `Third-party menu portals must target the semantic overlay host, not document.body: ${JSON.stringify(bodyMenuPortalTargets)}`,
);

for (const owner of baseline.approvedDirectCreatePortalOwners) {
  assert.ok(fs.existsSync(path.join(root, owner)), `Approved direct portal owner missing: ${owner}`);
}

const manifestById = new Map(manifest.components.map((component) => [component.id, component]));
for (const id of ['portal-layer', 'overlay-contract', 'anchored-overlay-position']) {
  const entry = manifestById.get(id);
  assert.equal(entry?.status, 'canonical', `UI manifest must keep ${id} canonical.`);
  assert.ok(entry?.canonicalPath && fs.existsSync(path.join(root, entry.canonicalPath)), `Canonical overlay owner missing: ${id}`);
}
assert.equal(manifest.layerContract?.thirdPartyPortalsMustUseSemanticHost, true, 'Manifest must enforce semantic hosts for third-party portals.');

const portalLayer = readRel(baseline.canonicalOverlayOwners.portal);
assert.match(portalLayer, /getOverlayPortalHost/, 'PortalLayer must resolve semantic hosts through overlayContract.');
assert.doesNotMatch(portalLayer, /createPortal\([\s\S]*?document\.body/, 'PortalLayer must not directly target document.body.');

const overlayContract = readRel(baseline.canonicalOverlayOwners.contract);
assert.match(overlayContract, /data-kourosh-layer-host/, 'Overlay host contract must expose semantic data-kourosh-layer-host ownership.');
assert.match(overlayContract, /useOverlayPortalTarget/, 'Overlay contract must expose a hook for third-party portal targets.');

const overlayCss = readRel('styles/system/overlay-layer-contract.css');
for (const layer of ['dropdown', 'popover', 'tooltip', 'modal', 'drawer', 'toast']) {
  assert.match(overlayCss, new RegExp(`data-kourosh-layer-host=["']${layer}["']`), `Overlay CSS is missing semantic ${layer} host stacking.`);
}
const genericDialogOverride = /\[role=["']dialog["']\][\s\S]{0,260}z-index\s*:\s*var\(--kourosh-z-modal-panel/.test(overlayCss);
assert.equal(genericDialogOverride, baseline.expectations.genericRoleDialogModalZOverride, 'role="dialog" must not automatically receive modal stacking.');
assert.match(overlayCss, /\.app-tooltip-portal[\s\S]{0,260}pointer-events:\s*none/, 'Tooltip portal must remain pointer transparent.');
assert.match(overlayCss, /\.app-floating-surface/, 'Token-owned floating surface contract is missing.');

for (const consumer of baseline.thirdPartyPortalConsumers) {
  const source = readRel(consumer);
  assert.match(source, /useOverlayPortalTarget\(\s*['"]popover['"]/, `${consumer} must target the shared popover host.`);
  assert.doesNotMatch(source, /menuPortalTarget\s*=\s*\{?[^\n}]*document\.body/, `${consumer} must not restore a document.body menu portal.`);
}

for (const [consumer, canonicalExport] of Object.entries(baseline.delegatedPortalConsumers || {})) {
  const source = readRel(consumer);
  assert.match(source, new RegExp(`\\b${canonicalExport}\\b`), `${consumer} must delegate floating select behavior to canonical ${canonicalExport}.`);
  assert.doesNotMatch(source, /useOverlayPortalTarget\s*\(/, `${consumer} must not re-own portal targeting after delegation to ${canonicalExport}.`);
  assert.doesNotMatch(source, /menuPortalTarget\s*=/, `${consumer} must not re-introduce a page-owned third-party menu portal.`);
}

for (const consumer of baseline.anchoredOverlayConsumers) {
  const source = readRel(consumer);
  assert.match(source, /useAnchoredOverlayPosition/, `${consumer} must consume canonical anchored overlay positioning.`);
}
for (const consumer of baseline.portalLayerConsumers) {
  const source = readRel(consumer);
  assert.match(source, /<PortalLayer\b/, `${consumer} must render its floating UI through PortalLayer.`);
}

const headerQuick = readRel('components/header/HeaderQuickActions.tsx');
assert.match(headerQuick, /resolveFloatingOverlayPosition/, 'Header quick actions must use the shared collision resolver.');

const breadcrumb = readRel('components/main-layout/NavigationBreadcrumbQuickPreview.tsx');
const breadcrumbArbitrary = (breadcrumb.match(/\bz-\[(?:1[0-9]{2}|[2-9][0-9]{2,})\]/g) || []).length;
assert.equal(breadcrumbArbitrary, baseline.expectations.breadcrumbArbitraryPopoverZ, 'Breadcrumb preview must not own an arbitrary overlay z-index.');


const resolver = readRel(baseline.canonicalOverlayOwners.positionResolver);
for (const contractTerm of ['availableHeight', 'placement', 'direction', 'align']) {
  assert.match(resolver, new RegExp(`\\b${contractTerm}\\b`), `Shared position resolver lost ${contractTerm} support.`);
}

console.log(JSON.stringify({
  status: 'PASS',
  workstream: baseline.workstream,
  phase: baseline.phase,
  sourceRelease: baseline.sourceRelease,
  workstreamVersion: baseline.workstreamVersion,
  scannedRuntimeTsFiles: runtimeFiles.length,
  directCreatePortalUsages: createPortalUsages,
  directCreatePortalOutsideApprovedOwners: escapedPortalOwners.length,
  directDocumentBodyMenuPortalTargets: bodyMenuPortalTargets.length,
  semanticHostContract: true,
  sharedCollisionResolver: true,
  anchoredOverlayConsumers: baseline.anchoredOverlayConsumers.length,
  portalLayerConsumers: baseline.portalLayerConsumers.length,
  delegatedPortalConsumers: Object.keys(baseline.delegatedPortalConsumers || {}).length,
  deferred: baseline.deferred,
}, null, 2));
