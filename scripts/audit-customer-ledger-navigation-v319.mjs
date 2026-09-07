import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 319, `KOUROSH_SOURCE_VERSION must be v319 or successor; found ${version}`);

const utility = read('utils/scrollToAppSection.ts');
assert.ok(utility.includes('[data-ui-shell="main-scroll"]'), 'Section navigation must target the real application scroll container');
assert.ok(utility.includes('appScroller.scrollTo({ top: nextTop, behavior })'), 'Section navigation must scroll the nested application shell directly');
assert.ok(utility.includes('getBoundingClientRect()'), 'Section navigation must calculate target position against the app scroller');

const controller = read('pages/customerDetail/CustomerDetailController.tsx');
assert.ok(controller.includes("import { scrollToAppSection } from '../../utils/scrollToAppSection';"), 'Customer detail controller must use the canonical app-section scrolling helper');
assert.ok(controller.includes("'[data-ui-customer-ledger-root=\"standalone\"]'"), 'Customer ledger navigation must target the rendered ledger section, not only a zero-height anchor');
assert.ok(!controller.includes("document.getElementById('customer-ledger-section')?.scrollIntoView"), 'Customer ledger navigation must not use the unreliable direct scrollIntoView path');

const hero = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
const buttonIndex = hero.indexOf('مشاهده دفتر حساب');
assert.ok(buttonIndex >= 0, 'Customer detail ledger button must remain present');
const buttonWindow = hero.slice(Math.max(0, buttonIndex - 500), buttonIndex + 100);
assert.ok(buttonWindow.includes('type="button"'), 'Customer ledger navigation button must explicitly be a non-submit button');
assert.ok(buttonWindow.includes('aria-controls="customer-ledger-section"'), 'Customer ledger navigation button must expose its controlled section');
assert.ok(buttonWindow.includes('onClick={scrollToLedger}'), 'Customer ledger navigation button must call scrollToLedger');

const partnerActions = read('pages/partnerDetail/usePartnerDetailCommunicationActions.ts');
assert.ok(partnerActions.includes("import { scrollToAppSection } from '../../utils/scrollToAppSection';"), 'Partner detail must share the same robust section-navigation behavior');
assert.ok(partnerActions.includes("'[data-ui-people-detail-ledger=\"partner-standard-v282\"]'"), 'Partner ledger navigation must target the rendered partner ledger section');

console.log('v319 customer/partner ledger section navigation audit passed.');
