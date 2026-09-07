#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
const source = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const pkg = JSON.parse(read('package.json'));

assert.ok(Number.isInteger(versionNumber) && versionNumber >= 293, `KOUROSH_SOURCE_VERSION must be v293 or a compatible successor; found ${version || '(missing)'}`);
assert.match(source, /data-ui-partner-purchase-history-expanded="true"/, 'expanded purchase-history row boundary is required');
assert.match(source, /data-ui-partner-purchase-history-expanded-header="true"/, 'expanded purchase-history header boundary is required');
assert.match(source, /data-ui-partner-purchase-history-event-grid="true"/, 'responsive event grid boundary is required');
assert.match(source, /data-ui-partner-purchase-history-event="true"/, 'event card boundary is required');
assert.match(source, /grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3/, 'expanded history must use 1/2/3 responsive columns');
assert.doesNotMatch(source, /xl:grid-cols-4/, 'old four-column history grid must not remain');
assert.doesNotMatch(source, /flex-wrap-reverse/, 'expanded history header must not use reverse wrapping');
assert.doesNotMatch(source, /flex-row-reverse/, 'event headers must not use reverse row direction');
assert.match(source, /whitespace-nowrap font-black tabular-nums/, 'history monetary values must remain horizontally readable');
assert.match(source, /<bdi dir="ltr" className="shrink-0 whitespace-nowrap/, 'event dates must use bidi isolation and no wrapping');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:partner-purchase-history-v293/, 'audit:release must enforce v293 partner purchase-history audit');

console.log('v293 partner purchase history expanded-details audit passed.');
