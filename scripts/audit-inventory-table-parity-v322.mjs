import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 322, `KOUROSH_SOURCE_VERSION must be v322 or successor; found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-inventory-table-parity="installments-v322"'), 'Products inventory table must publish the v322 Installments parity marker');
assert.ok(products.includes('data-ui-inventory-table-kind="products"'), 'Products inventory table must publish its scoped kind marker');
assert.ok(products.includes('<Table className="product-list-table" layout="managed" density="comfortable">'), 'Products inventory must keep the managed canonical Table primitive');

const phones = read('pages/mobilePhones/MobilePhonesMainWorkspace.tsx');
assert.ok(phones.includes('data-ui-mobile-phone-inventory-table="true"'), 'Mobile phone inventory table must preserve its runtime marker');
assert.ok(phones.includes('data-ui-inventory-table-parity="installments-v322"'), 'Mobile phone table view must publish the v322 Installments parity marker');
assert.ok(phones.includes('data-ui-inventory-table-kind="mobile-phones"'), 'Mobile phone table view must publish its scoped kind marker');
assert.ok(phones.includes('className="phone-inventory-table"'), 'Mobile phone table must preserve the canonical inventory table class');
assert.ok(phones.includes('layout="managed"'), 'Mobile phone table must remain a managed TableSystem table');

const tablesCss = read('styles/components/tables.css');
assert.ok(tablesCss.includes('v322 — Canonical inventory table parity + project-wide RTL edge geometry.'), 'Table CSS must include the v322 canonical edge block');
assert.ok(tablesCss.includes('[data-ui-inventory-table-parity="installments-v322"] [data-ui-table-viewport="true"]'), 'v322 must explicitly own inventory viewport edge geometry');
assert.ok(tablesCss.includes('scrollbar-gutter: auto !important;'), 'v322 inventory viewports must never reserve the RTL physical-left gutter');
assert.ok(tablesCss.includes('padding-inline: 0 !important;'), 'v322 inventory viewports must reach both inline edges');
assert.ok(tablesCss.includes('margin-inline: 0 !important;'), 'v322 inventory viewports/tables must not create inline gaps');

const globalContract = read('styles/system/ui-contracts/table-card-contract-phase6.css');
const autoMatches = globalContract.match(/scrollbar-gutter:\s*auto;/g) || [];
assert.ok(autoMatches.length >= 2, 'Canonical runtime table viewport owners must use scrollbar-gutter:auto in v322+');
assert.ok(!globalContract.includes('scrollbar-gutter: stable;'), 'Canonical TableViewport runtime contract must no longer reserve stable gutters in v322+');

console.log('v322 products/mobile inventory + project-wide table edge parity audit passed.');
