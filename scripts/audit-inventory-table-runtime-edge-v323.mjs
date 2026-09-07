import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 323, `KOUROSH_SOURCE_VERSION must be v323 or successor; found ${version}`);

const management = read('components/ui/ManagementDirectory.tsx');
assert.ok(management.includes('flushBody?: boolean;'), 'ManagementListSurface must expose an explicit flushBody contract');
assert.ok(management.includes("flushBody ? 'p-0' : 'p-2 sm:p-3'"), 'flushBody must remove responsive body padding at the source instead of relying on p-0 against sm:p-3');
assert.ok(management.includes("data-ui-management-list-body={flushBody ? 'flush' : 'padded'}"), 'ManagementListSurface must publish its body geometry for runtime verification');

const products = read('pages/Products.tsx');
assert.ok(products.includes('<ManagementListSurface'), 'Products must continue using the canonical management list surface');
assert.ok(products.includes('flushBody'), 'Products list must opt into the true flush-body contract');
assert.ok(products.includes('data-ui-inventory-edge-fix="v323"'), 'Products table shell must publish the v323 runtime edge marker');

const phones = read('pages/mobilePhones/MobilePhonesMainWorkspace.tsx');
assert.ok(phones.includes('phone-list-shell__content p-4 sm:p-6'), 'Mobile workspace padding must remain for non-table controls');
assert.ok(phones.includes('data-ui-inventory-edge-fix="v323"'), 'Mobile phone table shell must publish the v323 runtime edge marker');

const css = read('styles/components/tables.css');
assert.ok(css.includes('v323 — Inventory edge-to-edge correction based on the real runtime DOM.'), 'Canonical tables CSS must include the v323 runtime-DOM correction block');
assert.ok(css.includes("#products-list-surface [data-ui-management-list-body='flush']"), 'Products must explicitly zero the real ManagementListSurface body node');
assert.ok(css.includes("[data-ui-inventory-edge-fix='v323'][data-ui-table-shell='true']"), 'Products nested DataTableShell must be flattened');
assert.ok(css.includes("inline-size: calc(100% + 2rem) !important;"), 'Mobile table must break through base p-4 workspace padding');
assert.ok(css.includes("inline-size: calc(100% + 3rem) !important;"), 'Mobile table must break through sm:p-6 workspace padding');
assert.ok(css.includes("margin-inline: -1.5rem !important;"), 'Mobile table must cancel the responsive inline workspace padding');

console.log('v323 products/mobile inventory real runtime edge audit passed.');
