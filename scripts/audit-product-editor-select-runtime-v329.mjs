import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
assert.ok(Number(version.replace(/^v/, '')) >= 329, `expected v329+, found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-product-editor-select-runtime="v329"'), 'product editor must expose the v329 runtime select contract');
const menuClassCount = (products.match(/menuClassName="product-editor-searchable-menu-v329"/g) || []).length;
assert.ok(menuClassCount >= 2, 'category and supplier must share the compact v329 portal-menu class');
const clearableFalseCount = (products.match(/clearable=\{false\}/g) || []).length;
assert.ok(clearableFalseCount >= 2, 'category and supplier must remain non-clearable');

const css = read('styles/system/products-services-repairs/products-ui-foundation.css');
assert.ok(css.includes('v329 — product editor searchable selected-value runtime repair + compact typography.'), 'v329 runtime repair CSS block missing');
assert.ok(css.includes("[data-ui-product-editor-select-runtime='v329'] .product-editor-searchable-control-v326 .app-searchable-select__value-container"), 'v329 must own the searchable value-container geometry');
assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) !important;'), 'v329 must restore a stable single-cell selected/input track');
assert.ok(css.includes('.app-searchable-select__single-value'), 'v329 must explicitly own selected-value visibility');
assert.ok(css.includes('visibility: visible !important;'), 'v329 selected value must remain visibly painted');
assert.ok(css.includes('font-size: .56rem !important;'), 'v329 selected/input typography must be compact');
assert.ok(css.includes('.product-editor-searchable-menu-v329 [role=\'option\']'), 'v329 must compact the portal dropdown options');
assert.ok(css.includes('font-size: .58rem !important;'), 'v329 portal options must use compact typography');

console.log('v329 product editor selected-value visibility + compact searchable typography audit passed.');
