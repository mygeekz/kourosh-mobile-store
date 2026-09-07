import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const selector = read('components/SellableItemSelect.tsx');
const searchable = read('components/ui/SearchableSelectField.tsx');

assert.equal(version, 'v230', 'v230 source version marker must be current.');

// The sales-only legacy wrapper activates several historical CSS overrides that
// reset/collapse the react-select input. The shared SearchableSelectField already
// owns the current control/input styling, so the sales selector must use that
// standard component without the legacy page-scoped CSS hook.
assert.ok(
  selector.includes('<SearchableSelectField<string, SelectOption>'),
  'Sellable item search must continue using the shared SearchableSelectField primitive.'
);
assert.ok(
  selector.includes('inputId="item-search-select"'),
  'Sellable item search must keep its stable accessible input id.'
);
assert.ok(
  !selector.includes('sales-select-shell'),
  'Sellable item search must not reactivate legacy sales-select-shell CSS overrides.'
);
assert.ok(
  searchable.includes("input: () => cn('m-0 min-w-0 p-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100'"),
  'Shared SearchableSelectField must keep an explicit readable input text contract.'
);

console.log('Sellable search v230 audit passed: typed query uses the shared SearchableSelectField visual contract without legacy sales-select-shell overrides.');
