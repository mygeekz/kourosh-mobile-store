#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const event = read('components/ui/FinancialTimelineEvent.tsx');
const headerActions = read('components/header/HeaderQuickActions.tsx');
const headerCss = read('styles/system/ui-contracts/navigation-shell-contract-phase5.css');
const pkg = JSON.parse(read('package.json'));

const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 291, `KOUROSH_SOURCE_VERSION must be v291 or a compatible successor; found ${version || '(missing)'}`);
assert.match(event, /data-ui-financial-event-fields="adaptive"/, 'financial event fields must publish the adaptive ownership marker');
assert.match(event, /grid-cols-\[repeat\(auto-fit,minmax\(10rem,1fr\)\)\]/, 'ledger event fields must use container-adaptive auto-fit columns');
assert.doesNotMatch(event, /xl:grid-cols-\[minmax\(0,1\.1fr\)/, 'ledger events must not use the old viewport-xl fixed five-column layout');
assert.match(event, /whitespace-nowrap break-normal tabular-nums \[overflow-wrap:normal\]/, 'currency values must remain unbroken');

assert.match(headerActions, /data-ui-header-notifications-preview="true"/, 'notification preview must publish a dedicated runtime marker');
assert.match(headerActions, /app-header-popover__notification-item/, 'notification preview must use the dedicated card item contract');
assert.match(headerCss, /v291 — Header popovers are body-level portals/, 'header portal token root fix marker is required');
const quickPopover = read('components/header/HeaderQuickPopover.tsx');
const profileMenu = read('components/header/HeaderProfileMenu.tsx');
assert.match(quickPopover, /data-header-contract': 'v3'/, 'quick popover PortalLayer must inherit the canonical Header v3 token contract');
assert.match(profileMenu, /data-header-contract': 'v3'/, 'profile menu PortalLayer must inherit the canonical Header v3 token contract');
assert.match(headerCss, /\.app-header-popover__notification-item \{[\s\S]*background: var\(--app-header-soft\)/, 'notification cards must own an opaque surface');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:real-ui-v291/, 'audit:release must enforce the v291 real UI regression audit');

console.log('v291 customer ledger + notifications real UI audit passed.');
