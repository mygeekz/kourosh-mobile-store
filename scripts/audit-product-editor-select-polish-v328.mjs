import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
assert.ok(Number(version.replace(/^v/, '')) >= 328, `expected v328+, found ${version}`);

const products = read('pages/Products.tsx');
assert.ok(products.includes('data-ui-product-editor-select-polish="v328"'), 'product editor must expose the v328 searchable-select polish contract');
const editorWindowStart = products.indexOf('data-ui-product-editor-select-polish="v328"');
const editorWindow = products.slice(editorWindowStart, products.indexOf('{/* Management Modal */}', editorWindowStart) > editorWindowStart ? products.indexOf('{/* Management Modal */}', editorWindowStart) : undefined);
const clearableFalseCount = (editorWindow.match(/clearable=\{false\}/g) || []).length;
assert.ok(clearableFalseCount >= 2, 'category and supplier searchable selects must disable the redundant clear-X');

const select = read('components/ui/SearchableSelectField.tsx');
assert.ok(select.includes('app-searchable-select__value-container'), 'SearchableSelectField must expose a stable value-container class');
assert.ok(select.includes('app-searchable-select__single-value'), 'SearchableSelectField must expose a stable single-value class');
assert.ok(select.includes('app-searchable-select__indicators'), 'SearchableSelectField must expose a stable indicators class');
assert.ok(select.includes('app-searchable-select__clear-indicator'), 'SearchableSelectField must expose a stable clear-indicator class');

const css = read('styles/system/products-services-repairs/products-ui-foundation.css');
assert.ok(css.includes('v328 — product editor searchable selection centering + no-clear affordance.'), 'v328 product-editor select CSS block missing');
assert.ok(css.includes("[data-ui-product-editor-select-polish='v328'] .product-editor-searchable-control-v326 .app-searchable-select__value-container"), 'v328 must center the searchable value container');
assert.ok(css.includes('justify-content: center !important;'), 'v328 searchable selection must be centered');
assert.ok(css.includes('.app-searchable-select__clear-indicator'), 'v328 must own clear-indicator visibility');
assert.ok(css.includes('display: none !important;'), 'v328 must hide the redundant clear-X');

console.log('v328 product editor searchable selection centering + no-clear audit passed.');
