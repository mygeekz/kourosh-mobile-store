import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 311, `KOUROSH_SOURCE_VERSION must be v311 or successor; found ${version}`);

const searchable = read('components/ui/SearchableSelectField.tsx');
const support = read('pages/mobilePhones/mobilePhonesControllerSupport.tsx');
const workspace = read('pages/mobilePhones/MobilePhonesMainWorkspace.tsx');

assert.ok(searchable.includes('inputValueTakesPrecedence?: boolean;'), 'SearchableSelectField must expose the opt-in typing precedence contract');
assert.ok(searchable.includes('inputValueTakesPrecedence = false'), 'Typing precedence must remain opt-in and safe for existing select consumers');
assert.ok(searchable.includes('const renderedSelectedOption = inputValueTakesPrecedence && inputValue'), 'SearchableSelectField must suppress SingleValue while a precedence-enabled query is active');
assert.ok(searchable.includes('value={renderedSelectedOption as SingleValue<TOption>}'), 'react-select value rendering must use the precedence-aware selected option');
assert.ok(searchable.includes("minWidth: hasTypedValue ? '4rem' : 0"), 'Existing non-collapsing typing layer protection must remain intact');
assert.ok(searchable.includes("WebkitTextFillColor: 'currentColor'"), 'Chromium/WebKit input text visibility protection must remain intact');

const addableStart = support.indexOf('export const AddableAutocomplete');
assert.ok(addableStart >= 0, 'AddableAutocomplete must exist');
const addable = support.slice(addableStart, support.indexOf('// Helper:', addableStart));
assert.ok(addable.includes('onInputValueChange={(nextValue)'), 'AddableAutocomplete must continue mirroring free-form query text into form state');
assert.ok(addable.includes('inputValueTakesPrecedence'), 'AddableAutocomplete must opt into typing precedence so mirrored values cannot cover the live query');
assert.ok(addable.includes('valueOption={value ? { value, label: value, searchText: value } : null}'), 'AddableAutocomplete must preserve fallback selected-value visibility for persisted custom model/color values');

const modelUsage = workspace.match(/phone-identity-block__field--model[\s\S]{0,900}<AddableAutocomplete[\s\S]{0,900}?dir="ltr"/);
const colorUsage = workspace.match(/phone-identity-block__field--color[\s\S]{0,900}<AddableAutocomplete[\s\S]{0,900}?dir="rtl"/);
assert.ok(modelUsage, 'New-phone model field must continue using AddableAutocomplete');
assert.ok(colorUsage, 'New-phone color field must continue using AddableAutocomplete');

console.log('v311 phone model/color creatable typed-input visibility audit passed.');
