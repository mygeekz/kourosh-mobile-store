import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
assert.ok(Number(version.replace(/^v/, '')) >= 325, `expected v325+, found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-product-editor-density="v325"'), 'product editor must expose the v325 density contract');
assert.ok(products.includes('panelClassName="product-editor-modal-v325"'), 'product editor must have a scoped compact panel class');
assert.ok(products.includes('bodyClassName="product-editor-modal-body-v325"'), 'product editor must have a scoped compact body class');
assert.ok(products.includes('widthClassName="max-w-5xl"'), 'product editor must use the standard operational max-w-5xl canvas');
assert.ok(products.includes('variant="operational"'), 'product editor must use the operational modal variant');
assert.ok(products.includes('layout="vertical"'), 'product editor must use the compact vertical layout');
assert.ok(products.includes('<TextField controlSize="sm" type="text" name="name"'), 'product name control must use sm density');
assert.ok(products.includes('controlSize="sm"\n                        type="number"'), 'stock control must use sm density');
assert.ok(products.includes('size="sm"\n                        name="unit"'), 'unit select must use sm density');
const searchableCount = (products.match(/<SearchableSelectField<string>\n\s+size="sm"/g) || []).length;
assert.ok(searchableCount >= 2, 'category and supplier searchable selects must use sm density');

const css = read('styles/system/products-services-repairs/products-ui-foundation.css');
assert.ok(css.includes('v325 — compact product editor modal.'), 'v325 product editor CSS block missing');
assert.ok(css.includes('--product-editor-control-height: 2.625rem;'), 'v325 control height token missing');
assert.ok(css.includes('.product-editor-modal-v325 .product-modal-apple--compact-v325 .product-modal-apple-title'), 'compact title rule missing');
assert.ok(css.includes('font-size: .98rem !important;'), 'compact title size missing');
assert.ok(css.includes('min-height: var(--product-editor-control-height) !important;'), 'compact control height guard missing');
assert.ok(css.includes('.product-modal-apple-actions .ux-btn'), 'compact modal action-button rule missing');

console.log('v325 product editor compact density audit passed.');
