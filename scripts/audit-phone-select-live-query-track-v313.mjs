import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 313, `KOUROSH_SOURCE_VERSION must be v313 or successor; found ${version}`);

const select = read('components/ui/SearchableSelectField.tsx');
assert.ok(select.includes("gridTemplateColumns: hasTypedValue ? '0 minmax(0, 1fr)' : '0 min-content'"), 'Live query must expand react-select column 2');
assert.ok(select.includes('isHidden={hasLiveQuery ? false : props.isHidden}'), 'Live query must force the native react-select input visible');
assert.ok(select.includes('Boolean(props.value || props.selectProps?.inputValue)'), 'Native input visibility must use the real react-select input value as the primary signal');
assert.ok(select.includes("app-searchable-select__native-input"), 'Native input must expose a stable class');
assert.ok(select.includes("app-searchable-select__input-container"), 'Input container must expose a stable class');

const css = read('styles/components/unified-fields.css');
assert.ok(css.includes(".app-searchable-select__input-container[data-value]:not([data-value=''])"), 'CSS must target non-empty react-select live query containers');
assert.ok(css.includes('grid-template-columns: 0 minmax(0, 1fr) !important;'), 'CSS must guarantee a visible query track');
assert.ok(css.includes('> .app-searchable-select__native-input'), 'CSS must directly own native input visibility');
assert.ok(css.includes('opacity: 1 !important;') && css.includes('visibility: visible !important;'), 'Native input visibility must be explicit');

const support = read('pages/mobilePhones/mobilePhonesControllerSupport.tsx');
assert.ok(support.includes('inputValueTakesPrecedence'), 'Model/color AddableAutocomplete must retain live-query precedence');

console.log('v313 phone searchable-select live-query track audit passed.');
