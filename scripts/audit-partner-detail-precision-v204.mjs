import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const render = read('pages/partnerDetail/PartnerDetailRender.tsx');
const header = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const phone = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const telegram = read('pages/partnerDetail/PartnerTelegramConversationSection.tsx');
const css = read('styles/system/partner-detail-responsive-ledger-foundation.css');

assert.equal(version, 'v204');
assert.match(render, /partner-detail-polish-v204/);

assert.match(header, /partner-detail-risk-ring-copy/);
assert.match(header, /partner-detail-risk-scale/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-detail-risk-scale[\s\S]*?margin-top: 0 !important/);

assert.match(phone, /partner-phone-capital-metric-card/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-phone-capital-summary-card::before[\s\S]*?display: none !important/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-phone-capital-metrics > \.partner-phone-capital-metric-card[\s\S]*?min-height: 84px !important/);
assert.match(css, /grid-template-areas: "summary copy" !important/);

assert.match(css, /grid-template-areas: "filters title" !important/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-operational-table-v105__filter[\s\S]*?height: 30px !important/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-operational-table-v105 \.partner-capital-compact-table[\s\S]*?min-width: 1220px !important/);
assert.match(css, /@container partner-detail \(max-width: 1050px\)[\s\S]*?\.partner-phone-capital-mobile-list[\s\S]*?display: grid !important[\s\S]*?\.partner-phone-capital-table-view[\s\S]*?display: none !important/);

for (const hook of [
  'partner-telegram-compact-v204',
  'partner-telegram-layout-v204',
  'partner-telegram-sidebar-v204',
  'partner-telegram-main-v204',
  'partner-telegram-timeline-panel-v204',
  'partner-telegram-composer-v204',
]) {
  assert.ok(telegram.includes(hook), `missing Telegram compact hook: ${hook}`);
}
assert.match(css, /\.partner-detail-polish-v204 \.partner-telegram-layout-v204[\s\S]*?grid-template-columns: 248px minmax\(0, 1fr\) !important/);
assert.match(css, /\.partner-detail-polish-v204 \.partner-telegram-timeline-panel-v204 \.min-h-/);
assert.match(css, /v204 final lock/);

console.log('PASS Kourosh v204 Partner detail precision polish audit');
