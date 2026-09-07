import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const searchable = read('components/ui/SearchableSelectField.tsx');
const sellable = read('components/SellableItemSelect.tsx');

assert.equal(version, 'v231', 'v231 source version marker must be current.');
assert.ok(
  searchable.includes("minWidth: '4rem'"),
  'SearchableSelectField must keep a non-collapsing react-select input wrapper.'
);
assert.ok(
  searchable.includes("flex: '1 1 auto'"),
  'SearchableSelectField input wrapper must remain flex-growable so typed text has visible width.'
);
assert.ok(
  searchable.includes("WebkitTextFillColor: 'currentColor'"),
  'SearchableSelectField must preserve readable native input text in Chromium/WebKit.'
);
assert.ok(
  searchable.includes("input: () => cn('m-0 min-w-[4rem] flex-1 p-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100'"),
  'SearchableSelectField class fallback must not collapse the typing layer to zero width.'
);
assert.ok(
  sellable.includes('<SearchableSelectField<string, SelectOption>'),
  'Sellable item search must continue using the canonical shared searchable select.'
);
assert.ok(
  !sellable.includes('sales-select-shell'),
  'Sellable item search must remain detached from legacy sales-only CSS hooks.'
);

console.log('Searchable select v231 audit passed: typed input has explicit width, flex, color and caret visibility without page-specific CSS.');
