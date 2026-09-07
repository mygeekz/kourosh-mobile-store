import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
assert.ok(Number(version.replace(/^v/, '')) >= 327, `expected v327+, found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-product-editor-layout="v327"'), 'product editor must expose the v327 field-layout contract');
assert.ok(products.includes('product-modal-apple--compact-v327'), 'product editor must expose the v327 compact class');
const noWordsCount = (products.match(/showWords=\{false\}/g) || []).length;
assert.ok(noWordsCount >= 2, 'purchase and selling price controls must suppress price-word rows in the compact editor');
assert.ok(products.includes('hint="موجودی اولیه یا فعلی انبار."'), 'stock hint must use the compact v327 copy');
assert.ok(products.includes('برای قیمت خرید، تأمین‌کننده را انتخاب کن.'), 'supplier hint must use compact v327 copy');

const css = read('styles/system/products-services-repairs/products-ui-foundation.css');
assert.ok(css.includes('v327 — product editor field-shell alignment + final compact pass.'), 'v327 product editor CSS block missing');
assert.ok(css.includes('--product-editor-control-height-v327: 2.25rem;'), 'v327 compact control token missing');
assert.ok(css.includes("[data-ui-product-editor-layout='v327'] .modal-field-premium > .premium-input-wrap"), 'v327 must own the ModalField control shell');
assert.ok(css.includes('grid-template-columns: 28px 1px minmax(0, 1fr) !important;'), 'v327 fields must reserve explicit icon/divider/control tracks');
assert.ok(css.includes('grid-column: 1 !important;'), 'v327 must place the primary field icon in a dedicated track');
assert.ok(css.includes('.product-modal-apple-price-field .price-input__field'), 'v327 must flatten PriceInput into the outer field shell');
assert.ok(css.includes('text-align: left !important;'), 'v327 price values must remain away from the RTL primary icon edge');
assert.ok(css.includes("input[name='stock_quantity']"), 'v327 must explicitly stabilize stock-number presentation');
assert.ok(css.includes('.app-select-field > select'), 'v327 must normalize native select geometry');
assert.ok(css.includes('.product-modal-apple-field--searchable-v326 > .premium-input-wrap'), 'v327 must keep category/supplier on the unified shell');

console.log('v327 product editor unified field-shell + compact layout audit passed.');
