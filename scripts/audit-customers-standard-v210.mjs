import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const absent = (source, pattern, message) => assert.doesNotMatch(source, pattern, message);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const directory = read('pages/Customers.tsx');
const render = read('pages/customerDetail/CustomerDetailRender.tsx');
const hero = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
const ledger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const telegram = read('pages/customerDetail/CustomerTelegramConversationSection.tsx');
const history = read('pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx').split('<div id="customer-ledger-print-area"')[0];
const editModal = read('pages/customerDetail/CustomerProfileEditModal.tsx');
const ledgerEditModal = read('pages/customerDetail/CustomerLedgerEntryEditModal.tsx');
const activeUi = [directory, render, hero, ledger, telegram, history, editModal, ledgerEditModal];

assert.equal(version, 'v210');

assert.match(directory, /<table className="w-full min-w-\[58rem\] table-fixed text-xs"/);
assert.match(directory, /<DataTableShell className="w-full"/);
assert.match(directory, /flex flex-col gap-2 border-t border-slate-200 px-3 py-2 sm:flex-row/);
assert.match(directory, /<div className="w-20"><SelectField/);
absent(directory, /customers-directory-v73|customers-directory-page/, 'customer directory must not reactivate its legacy custom stylesheet');
absent(directory, /getDueCountBadgeClassName|countClassName/, 'counts must remain readable text, not decorative number tiles');

absent(render, /className="[^"]*(?:detail-page-shell|people-detail-apple|customer-detail-page-root)/, 'customer detail must use the canonical utility shell');
assert.match(render, /mx-auto grid max-w-7xl min-w-0 gap-4 px-3 py-4 sm:px-4/);

assert.match(hero, /strokeDasharray=/, 'customer trust must retain the semantic circular score chart');
assert.match(hero, /text-emerald-500[\s\S]*text-amber-400[\s\S]*text-rose-500/, 'trust chart needs good, caution and risk tones');
absent(hero, /customer-(?:overview|hero|quick|extra|crm|basic)|detail-hero-card|people-action-btn/, 'customer hero must not depend on page-specific CSS hooks');
absent(hero, /style=\{\{/, 'customer hero must not use inline layout CSS');

assert.match(ledger, /className="overflow-hidden rounded-2xl border border-slate-200/);
assert.match(ledger, /absolute end-0 top-full/);
assert.match(ledger, /flex flex-col gap-2 border-t border-slate-200 px-3 py-2 sm:flex-row/);
absent(ledger, /customer-ledger-(?:surface|panel|stack|toolbar|summary|smart|header|stream)|customers-directory-v73/, 'customer ledger must not depend on page-specific CSS hooks');
absent(ledger, /className="[^\"]*\b(?:left|right|ml|mr|pl|pr)-/, 'customer ledger layout must use RTL logical utilities');

assert.match(telegram, /<TextField controlOnly[\s\S]{0,500}placeholder="جستجو در گفتگو/);
absent(telegram, /contentEditable|style=\{\{/, 'Telegram search must be a stable native input without inline layout CSS');
absent(telegram, /absolute bottom-[^\"]*(?:left|right)-/, 'new-message action must not overlap the message timeline');
absent(telegram, /customer-telegram-|customer-extra-card-header/, 'Telegram workspace must not depend on page-specific CSS hooks');

assert.match(history, /<table className="w-full min-w-\[48rem\] table-fixed/);
assert.match(history, /<DataTableShell className="w-full"/);
absent(history, /className="[^"]*(?:people-chip|detail-card|customer-history-)/, 'purchase history must use the shared semantic table primitives');

absent(editModal, /customer-edit-v2/, 'customer edit modal must use canonical form primitives');
assert.match(editModal, /widthClass="max-w-2xl"/);
assert.match(editModal, /label="نام کامل"/);
absent(ledgerEditModal, /customer-ledger-edit-modal-center/, 'ledger edit dialog must use the canonical dialog shell');

for (const source of activeUi) {
  absent(source, /className="[^\"]*(?:fix-mobile|temp-responsive|ui-patch)/, 'temporary patch hooks are forbidden');
}

console.log('PASS Kourosh v210 customers responsive SaaS standard audit');
