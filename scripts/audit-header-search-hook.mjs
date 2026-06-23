import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const headerPath = 'components/Header.tsx';
const hookPath = 'components/header/useHeaderSearch.ts';
const searchPath = 'components/header/HeaderSearch.tsx';
const typesPath = 'components/header/headerTypes.ts';

const header = read(headerPath);
const hook = read(hookPath);
const search = read(searchPath);
const types = read(typesPath);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(header.includes("from './header/index'") && header.includes('useHeaderSearch'), 'Header must import useHeaderSearch from the header barrel.');
assert(header.includes('const headerSearch = useHeaderSearch({ token });'), 'Header must delegate search state/data to useHeaderSearch.');
assert(header.includes('<HeaderSearch\n        {...headerSearch}\n        onOpenCommandPalette={onOpenCommandPalette}\n      />'), 'HeaderSearch should receive the hook contract directly.');

for (const forbidden of [
  'processQuery',
  'buildRelatedSuggestions',
  'getPopularSearches',
  'getRecentSearches',
  'recordSearch',
  '/api/search',
  'searchAbortRef',
  'globalResults',
]) {
  assert(!header.includes(forbidden), `Header must not own search implementation detail: ${forbidden}`);
}

assert(hook.includes('/api/search'), 'useHeaderSearch must own the global search API request.');
assert(hook.includes('HEADER_SEARCH_DEBOUNCE_MS'), 'useHeaderSearch must own debounce timing.');
assert(hook.includes('HEADER_SEARCH_RESULT_LIMIT'), 'useHeaderSearch must own result limit.');
assert(hook.includes('resolveHeaderSearchPath'), 'useHeaderSearch must own result routing.');
assert(hook.includes('recordSearch'), 'useHeaderSearch must own search history writes.');
assert(types.includes('export type HeaderSearchHistoryItem'), 'Header search history item type must be shared through headerTypes.');
assert(search.includes('HeaderSearchHistoryItem'), 'HeaderSearch should use the shared search history type.');

const headerLines = header.split(/\r?\n/).length;
assert(headerLines <= 280, `Header.tsx should stay under 280 lines after search extraction; got ${headerLines}.`);

if (failures.length) {
  console.error('Header search hook audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Header search hook audit passed.');
console.log(JSON.stringify({ headerLines, hookPath, checkedFiles: [headerPath, hookPath, searchPath, typesPath] }, null, 2));
