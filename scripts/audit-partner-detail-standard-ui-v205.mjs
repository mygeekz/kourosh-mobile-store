import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const absent = (source, pattern, label) => assert.doesNotMatch(source, pattern, label);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const render = read('pages/partnerDetail/PartnerDetailRender.tsx');
const header = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const capital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const settlement = read('pages/partnerDetail/PartnerSettlementSubmitUiIntegrationSection.tsx');
const telegram = read('pages/partnerDetail/PartnerTelegramConversationSection.tsx');
const purchases = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const actions = read('pages/partnerDetail/usePartnerDetailCommunicationActions.ts');

assert.equal(version, 'v205');

absent(render, /partner-detail-(?:compact-v203|polish-v204|responsive-root|apple|safe-gutter)/, 'legacy partner detail roots must be inactive');
assert.match(render, /max-w-\[1280px\]/);

assert.match(header, /data-ui-partner-header="standard-v205"/);
assert.match(header, /data-ui-partner-risk=/);
for (const tone of ['rose', 'amber', 'orange', 'emerald']) assert.match(header, new RegExp(`text-${tone}`));
absent(header, /customer-overview-|partner-detail-risk-|style=\{\{/i, 'risk header must use standard utility classes only');
assert.match(header, /gap-0\.5 text-center/);

assert.match(capital, /data-ui-section="partner-phone-capital"/);
assert.match(capital, /نمای سرمایه گوشی‌ها[\s\S]*?text-right[\s\S]*?نمای سرمایه و وضعیت فروش گوشی‌ها/);
assert.match(capital, /<SelectField[\s\S]*?ariaLabel="مرتب‌سازی جزئیات سرمایه"[\s\S]*?options=/);
assert.match(capital, /data-ui-capital-table="true"/);
assert.match(capital, /min-w-\[1100px\][\s\S]*?table-fixed/);
absent(capital, /partner-phone-capital-(?:header|copy|eyebrow|summary|metric|table)|partner-operational-table-v105|partner-capital-|unstyled/, 'capital view must not activate custom CSS hooks');

assert.match(settlement, /rounded-2xl border border-slate-200 bg-white p-3/);
assert.match(settlement, /grid grid-cols-2 gap-2 lg:grid-cols-4/);
absent(settlement, /className="[^"]*partner-settlement-/, 'settlement must not activate custom CSS classes');

assert.match(telegram, /lg:grid-cols-\[240px_minmax\(0,1fr\)\]/);
assert.match(telegram, /max-h-\[360px\]/);
assert.match(telegram, /rows=\{4\}/);
absent(telegram, /partner-telegram-(?:customer|compact|layout|sidebar|main|header|search|timeline|composer|v114)/, 'telegram must not activate custom CSS hooks');

assert.match(purchases, /id="partner-purchase-history-section"/);
assert.match(purchases, /grid gap-3 lg:hidden/);
assert.match(purchases, /hidden overflow-x-auto[^"]*lg:block/);
assert.match(purchases, /min-w-\[1120px\] table-auto/);
assert.match(purchases, /\[overflow-wrap:anywhere\]/);
absent(purchases, /partner-purchase-history-(?:header|filters|mobile|card|table|event)|people-ledger-grid|detail-card|customers-directory-v73/, 'purchase history must not activate legacy custom CSS hooks');
assert.match(actions, /getElementById\('partner-purchase-history-section'\)/);

console.log('PASS Kourosh v205 partner detail standard UI audit');
