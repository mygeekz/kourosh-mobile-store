import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const render = read('pages/partnerDetail/PartnerDetailRender.tsx');
const header = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const css = read('styles/system/partner-detail-responsive-ledger-foundation.css');

assert.match(version, /^v\d+$/);
assert.match(render, /partner-detail-page-root partner-detail-compact-v203/);
assert.match(css, /v203 — Partner detail compact density contract/);
assert.match(css, /v203 final cascade lock/);
assert.match(css, /\.partner-detail-compact-v203 \[data-ui-partner-detail-shell\] > \* \+ \*/);
assert.match(css, /--partner-detail-compact-gap: 12px/);
assert.match(css, /\.partner-detail-compact-v203 \.customer-overview-metric-cell[\s\S]*?min-height: 82px !important/);
assert.match(css, /\.partner-detail-compact-v203 \.partner-detail-risk-ring,[\s\S]*?width: 108px !important/);
assert.match(css, /\.partner-detail-compact-v203 \.partner-phone-capital-summary-card[\s\S]*?width: 270px !important/);
assert.match(css, /\.partner-detail-compact-v203 :where\([\s\S]*?\.partner-purchase-history-section[\s\S]*?padding: 12px !important/);
assert.match(css, /@container partner-detail \(max-width: 680px\)[\s\S]*?padding: 10px !important/);

for (const hook of [
  'partner-detail-balance-value',
  'partner-detail-balance-icon',
  'partner-detail-finance-metric-value',
  'partner-detail-risk-ring',
  'partner-detail-risk-score',
]) {
  assert.ok(header.includes(hook), `missing compact semantic hook: ${hook}`);
}

assert.doesNotMatch(css, /\.customer-detail-page-root\.partner-detail-compact-v203/);
console.log('PASS Kourosh v203 Partner detail compact density audit');
