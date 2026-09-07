import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
assert.ok(Number(version.replace(/^v/, '')) >= 326, `expected v326+, found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-product-editor-polish="v326"'), 'product editor must expose the v326 polish contract');
assert.ok(products.includes('product-modal-apple--compact-v326'), 'product editor must expose the v326 compact surface class');
assert.ok(products.includes('product-modal-apple-hero--compact-v326'), 'product editor must use the compact v326 hero strip');
assert.ok(products.includes('product-modal-apple-field--category product-modal-apple-field--searchable-v326'), 'category field must use the v326 searchable geometry contract');
assert.ok(products.includes('product-modal-apple-field--supplier product-modal-apple-field--searchable-v326'), 'supplier field must use the v326 searchable geometry contract');
const searchableControlCount = (products.match(/controlClassName="product-editor-searchable-control-v326"/g) || []).length;
assert.ok(searchableControlCount >= 2, 'category and supplier searchable controls must share the v326 control geometry');

const modalStart = products.indexOf('{/* Product Modal */}');
const modalEnd = products.indexOf('<InventoryModal\n        open={isManagementModalOpen}', modalStart);
assert.ok(modalStart >= 0 && modalEnd > modalStart, 'product editor source window must exist');
const modalWindow = products.slice(modalStart, modalEnd);
assert.ok(!modalWindow.includes('className="product-modal-apple-title"'), 'duplicate in-body product title must be removed in v326');
assert.ok(!modalWindow.includes('className="product-modal-apple-subtitle"'), 'duplicate in-body product subtitle must be removed in v326');

const css = read('styles/system/products-services-repairs/products-ui-foundation.css');
assert.ok(css.includes('v326 — product editor compact polish + searchable-field geometry fix.'), 'v326 product editor CSS block missing');
assert.ok(css.includes('--product-editor-control-height-v326: 2.375rem;'), 'v326 compact control-height token missing');
assert.ok(css.includes(".product-modal-apple-field--searchable-v326 > .premium-input-wrap"), 'v326 searchable field shell rule missing');
assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) 1px 30px !important;'), 'v326 searchable field must use the canonical text/divider/icon grid');
assert.ok(css.includes('.app-searchable-select.modal-control-premium'), 'v326 must flatten the nested searchable container');
assert.ok(css.includes('.product-editor-searchable-control-v326.app-searchable-select__control'), 'v326 must flatten the React Select control itself');
assert.ok(css.includes('margin-top: 0 !important;'), 'v326 must neutralize the legacy category top offset');
assert.ok(css.includes('min-height: 2.15rem !important;'), 'v326 action buttons must use compact density');

console.log('v326 product editor compact polish + searchable geometry audit passed.');
