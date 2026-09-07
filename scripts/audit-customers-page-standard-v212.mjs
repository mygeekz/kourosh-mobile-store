import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const absent = (source, pattern, message) => assert.doesNotMatch(source, pattern, message);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const directory = read('pages/Customers.tsx');
const overview = read('components/people/PeopleDirectoryOverview.tsx');
const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const directoryCss = read('styles/system/customers-directory-v73.css');
const render = read('pages/customerDetail/CustomerDetailRender.tsx');
const hero = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
const ledger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const telegram = read('pages/customerDetail/CustomerTelegramConversationSection.tsx');
const history = read('pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx').split('<div id="customer-ledger-print-area"')[0];
const authTheme = read('components/auth/authGoldControlTheme.ts');
const login = read('pages/Login.tsx');
const activeUi = [directory, overview, toolbar, render, hero, ledger, telegram, history, authTheme, login];

assert.equal(version, 'v212');

assert.match(directory, /<DataTableShell className="w-full"/);
assert.match(directory, /<table className="w-full min-w-\[62rem\] table-fixed text-xs"/);
assert.match(directory, /allow-truncate block truncate/);
assert.match(directory, /allow-line-clamp line-clamp-1/);
assert.match(directory, /flex flex-col items-stretch gap-2 border-t[\s\S]*lg:flex-row/);
assert.match(directory, /<SelectField\s+controlOnly/);
absent(directory, /sm:grid-cols-\[[^\]]+\]/, 'viewport grids must not be nested inside fixed table cells');
absent(directory, /getBalanceBadgeClass|getBalanceRowClass|table-row-state--/, 'directory statuses must remain compact semantic content');

absent(overview, /people-directory-overview__/, 'shared overview must not rely on page patch selectors');
absent(toolbar, /people-directory-toolbar__/, 'shared toolbar must not rely on page patch selectors');
absent(directoryCss, /people-directory-overview__|people-directory-toolbar__/, 'legacy CSS must not override the shared directory primitives');

assert.match(render, /mx-auto grid max-w-7xl min-w-0 gap-3 px-3 py-3 sm:px-4/);
absent(render, /data-ui-people-(?:page|surface)=/, 'customer detail utility layout must not reactivate legacy People page overrides');
assert.match(hero, /strokeDasharray=/, 'customer trust must retain the semantic circular score chart');
assert.match(hero, /text-emerald-500[\s\S]*text-amber-400[\s\S]*text-rose-500/, 'trust chart needs good, caution and risk tones');
assert.match(hero, /flex items-center justify-start gap-2[\s\S]*<IconGlyph[\s\S]*<h3[^>]*>اکشن‌های سریع پرونده مشتری/);
assert.match(hero, /grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4/);
assert.match(hero, /group flex min-h-12 min-w-0/);
assert.match(hero, /allow-truncate truncate text-xs/);
absent(hero, /min-h-\[68px\]|customer-(?:overview|hero|quick|extra|crm|basic)|detail-hero-card|people-action-btn/, 'customer hero must not depend on oversized or page-specific patch contracts');
absent(hero, /style=\{\{/, 'customer hero must not use inline layout CSS');

assert.match(ledger, /<FinancialTimelineEvent[\s\S]*compact/);
assert.match(ledger, /flex flex-col items-stretch gap-2 border-t[\s\S]*lg:flex-row/);
assert.match(ledger, /<SelectField\s+controlOnly/);
absent(ledger, /customer-ledger-(?:surface|panel|stack|toolbar|summary|smart|header|stream)|customers-directory-v73/, 'customer ledger must not depend on page-specific CSS hooks');

assert.match(telegram, /<Button[\s\S]*variant="primary"[\s\S]*size="sm"[\s\S]*ارسال تلگرام/);
assert.match(telegram, /max-h-\[520px\]/);
absent(telegram, /min-w-\[220px\]|absolute bottom-[^\"]*(?:left|right)-|customer-telegram-/, 'Telegram workspace must stay compact and must not overlap the timeline');

assert.match(history, /<table className="w-full min-w-\[48rem\] table-fixed/);
assert.match(history, /<DataTableShell className="w-full"/);
absent(history, /className="[^"]*(?:people-chip|detail-card|customer-history-)/, 'purchase history must use shared semantic table primitives');

assert.match(authTheme, /!bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent/);
assert.match(authTheme, /:-webkit-autofill[\s\S]*-webkit-background-clip:text/);
absent(authTheme, /focus-within:!bg-\[/, 'auth controls must not change fill color on focus');
assert.match(login, /surface="glass"[\s\S]*authGoldInputClasses/);

for (const source of activeUi) {
  absent(source, /className="[^"]*(?:fix-mobile|temp-responsive|ui-patch)/, 'temporary patch hooks are forbidden');
}

console.log('PASS Kourosh v212 customers page responsive SaaS standard audit');
