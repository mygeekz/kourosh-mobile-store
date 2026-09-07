import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const nav = read('utils/navigationReturnContext.ts');
const bar = read('components/main-layout/NavigationReturnBar.tsx');
const main = read('components/MainLayout.tsx');
const event = read('components/ui/FinancialTimelineEvent.tsx');
const customerView = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const customerController = read('pages/customerDetail/CustomerDetailController.tsx');
const partnerView = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const partnerController = read('pages/partnerDetail/PartnerDetailController.tsx');
const repair = read('pages/RepairDetail.tsx');

expect('Return context has a dedicated navctx query key', nav.includes("NAVIGATION_RETURN_QUERY_KEY = 'navctx'"));
expect('Return context is session scoped instead of local-storage persistent', nav.includes('window.sessionStorage') && !nav.includes('window.localStorage'));
expect('Return context expires stale session records', nav.includes('MAX_AGE_MS') && nav.includes('Date.now() - Number(parsed.createdAt) > MAX_AGE_MS'));
expect('Return context stores original route', nav.includes('originPath: cleanOriginPath'));
expect('Return context stores original page title', nav.includes('originTitle'));
expect('Return context stores financial event anchor', nav.includes('originAnchorId'));
expect('Return context captures scroll container position', nav.includes("[data-ui-shell=\"main-scroll\"]") && nav.includes('originScrollTop'));
expect('Return context captures anchor relative offset', nav.includes('originAnchorOffsetTop'));
expect('Return context appends navctx without deleting target query parameters', nav.includes('new URLSearchParams(search)') && nav.includes('params.set(NAVIGATION_RETURN_QUERY_KEY, id)'));
expect('Return context preserves a valid parent navctx while still stripping navctx from the new target', nav.includes('preserveValidParentReturnParam(input.originPath') && nav.includes('readNavigationReturnRecordById(parentReturnId)') && nav.includes('stripNavigationReturnParam(targetPath)'));
expect('Return context has state fallback when sessionStorage is blocked', nav.includes('navigationReturnContext: record') && nav.includes('fallbackState'));
expect('Return restore state is explicit and separate from destination context', nav.includes('navigationReturnRestore: record'));
expect('Return restore waits for async server-side rows', nav.includes('MutationObserver') && nav.includes('childList: true, subtree: true'));
expect('Return restore aligns to the same vertical event offset', nav.includes('currentOffset - Number(record.originAnchorOffsetTop'));
expect('Return restore highlights the exact returned event', nav.includes("anchor.dataset.navigationReturnHighlight = 'true'"));
expect('Return restore has timeout fallback to captured scroll position', nav.includes('5200') && nav.includes('main.scrollTop = Math.max(0, Number(record.originScrollTop || 0))'));
expect('Search-param preservation helper keeps navctx through local page modes', nav.includes('preserveNavigationReturnSearch'));

expect('Main layout renders one compact return bar', main.includes('<NavigationReturnBar />'));
expect('Main layout installs generic anchor restoration', main.includes('useNavigationReturnRestore();'));
expect('Return bar exposes accessible origin navigation', bar.includes('aria-label="بازگشت به مبدا"'));
expect('Return bar returns to the exact transaction context', bar.includes('بازگشت به همان تراکنش'));
expect('Return bar restores state while replacing destination entry', bar.includes('buildNavigationReturnRestoreState(record)') && bar.includes('replace: true'));
expect('Return bar supports dismiss without destroying target query state', bar.includes('stripNavigationReturnParam(`${location.pathname}${location.search}`)'));

expect('Financial event accepts a reusable navigation anchor id', event.includes('navigationAnchorId?: string'));
expect('Financial event exposes the anchor to generic restore logic', event.includes('data-navigation-anchor={navigationAnchorId}'));
expect('Financial event highlight uses existing utility classes, not new CSS', event.includes('data-[navigation-return-highlight=true]:ring-2'));

expect('Customer financial links capture return context', customerView.includes('navigateWithReturnContext(navigate, sourceTarget.path'));
expect('Customer origin snapshot includes page/search/filter/range', customerView.includes("kind: 'customer-ledger'") && customerView.includes('pageSize:') && customerView.includes('search:') && customerView.includes('direction:') && customerView.includes('range:'));
expect('Customer event has exact transaction anchor', customerView.includes('navigationAnchorId={`customer-ledger-entry-${entry.id}`}'));
expect('Customer controller consumes return UI state', customerController.includes("getNavigationReturnUiState<CustomerLedgerReturnUiState>(location.state, 'customer-ledger')"));
expect('Customer restore blocks premature page-reset queries', customerController.includes('pendingLedgerReturnRestoreRef.current') && customerController.includes('ledgerReturnRestoring || pendingLedgerReturnRestoreRef.current'));
expect('Customer restore waits for debounced search before fetching restored page', customerController.includes('filtersReady = ledgerDebouncedSearch === String(pending.search || \'\').trim()'));

expect('Partner financial links capture return context', partnerView.includes('navigateWithReturnContext(navigate, financialTarget.path'));
expect('Partner origin snapshot includes page/search/system/batch/display mode', partnerView.includes("kind: 'partner-ledger'") && partnerView.includes('systemId:') && partnerView.includes('settlementBatchId:') && partnerView.includes('displayMode:'));
expect('Partner event has exact transaction anchor', partnerView.includes('navigationAnchorId={navigationAnchorId}'));
expect('Partner controller consumes return UI state', partnerController.includes("getNavigationReturnUiState<PartnerLedgerReturnUiState>(location.state, 'partner-ledger')"));
expect('Partner restore blocks directory fetch until filters are stable', partnerController.includes('if (!token || !id || ledgerDeepLinkPending) return;') && partnerController.includes('if (ledgerReturnRestoring || pendingLedgerReturnRestoreRef.current) return;'));
expect('Partner restore preserves requested server-side page instead of reset-to-one', partnerController.includes('lastLedgerFilterKeyRef.current = ledgerFilterKey') && partnerController.includes('setLedgerPage(Math.max(1, Number(pending.page || 1)))'));

expect('Repair edit mode preserves navctx', repair.includes('preserveNavigationReturnSearch(searchParams.toString()'));
expect('No backend mutation was needed for navigation return context', !nav.includes('/api/') && !bar.includes('/api/'));

if (failures.length) {
  console.error(`Navigation return v129 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Navigation return v129 audit passed: ${checks}/${checks} checks.`);
