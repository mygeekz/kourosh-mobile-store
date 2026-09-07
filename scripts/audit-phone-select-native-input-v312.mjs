import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const number = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(number) && number >= 312, `KOUROSH_SOURCE_VERSION must be v312 or successor; found ${version}`);

const select = read('components/ui/SearchableSelectField.tsx');
assert.ok(select.includes('const SearchableNativeInput = (props: any) =>'), 'SearchableSelectField must own a native Input visibility adapter');
assert.ok(select.includes('isHidden={hasLiveQuery ? false : props.isHidden}'), 'Live searchable query must force the real native input visible');
assert.ok(select.includes('Input: SearchableNativeInput'), 'react-select components map must install the native Input adapter');
assert.ok(select.includes('controlShouldRenderValue={!inputValueTakesPrecedence || !inputValue}'), 'Free-form typing must hide the selected-value paint layer while a query is active');

const css = read('styles/components/unified-fields.css');
const resetStart = css.indexOf(".app-searchable-select input[aria-autocomplete='list'] {");
assert.ok(resetStart >= 0, 'Canonical react-select native-input reset must exist');
const reset = css.slice(resetStart, resetStart + 1300);
for (const required of [
  'min-height: 0 !important;',
  'padding: 0 !important;',
  'border: 0 !important;',
  'background: transparent !important;',
  '-webkit-text-fill-color: var(--ds-control-fg) !important;',
  'opacity: 1 !important;',
]) assert.ok(reset.includes(required), `Native react-select input reset missing: ${required}`);

const support = read('pages/mobilePhones/mobilePhonesControllerSupport.tsx');
assert.ok(support.includes('inputValueTakesPrecedence'), 'Phone model/color AddableAutocomplete must retain live-query precedence');
assert.ok(support.includes('onInputValueChange={(nextValue) =>'), 'Phone model/color AddableAutocomplete must keep mirroring typed text into form state');

console.log('v312 phone searchable-select native input visibility audit passed.');
