import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const filterBar = read('components/ui/ResponsiveFilterBar.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');

assert.ok(Number(version.replace(/^v/i, '')) >= 296, `expected v296+ source; found ${version}`);
assert.doesNotMatch(filterBar, /data-ui-toolbar="true"/, 'ResponsiveFilterBar must not opt into the generic toolbar surface contract');
assert.match(filterBar, /data-ui-toolbar-role="filter"/, 'ResponsiveFilterBar must identify itself as a filter toolbar without claiming surface ownership');
assert.match(filterBar, /data-ui-filter-bar="true"/, 'ResponsiveFilterBar must retain the canonical filter-bar contract');

const start = partnerLedger.indexOf('data-ui-partner-ledger-toolbar="true"');
const end = partnerLedger.indexOf('{activeLedgerBatchId && activeBatchLedgerMetrics', start);
const source = start >= 0 && end > start ? partnerLedger.slice(start, end) : '';
assert.ok(source, 'partner ledger toolbar source must be discoverable');
assert.doesNotMatch(source, /<ResponsiveFilterBar/, 'partner ledger must not re-nest the generic responsive filter surface');
assert.doesNotMatch(source, /bg-slate-50\/50|dark:bg-slate-900\/30/, 'partner ledger toolbar must not own an extra tinted background');
assert.match(source, /md:grid-cols-\[minmax\(0,1fr\)_minmax\(15rem,0\.7fr\)_auto\]/, 'primary controls must use a bounded compact grid');
assert.match(source, /mt-2 flex min-w-0 flex-wrap items-center gap-2 border-t/, 'secondary controls must remain content-height and wrap naturally');
assert.match(source, /<FilterChipGroup/, 'compact canonical filter groups must remain in use');
assert.doesNotMatch(source, /style=\{\{/, 'partner ledger toolbar must not add inline layout CSS');

console.log('v296 partner ledger toolbar root-layout audit passed.');
