import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const event = read('components/ui/FinancialTimelineEvent.tsx');
const uiIndex = read('components/ui/index.ts');
const partner = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const partnerState = read('pages/partnerDetail/usePartnerDetailControllerState.ts');
const customer = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');

let passed = 0;
const expect = (label, condition) => {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS: ${label}`);
  }
};

expect('Shared FinancialTimelineEvent exists', event.includes('const FinancialTimelineEvent: React.FC<FinancialTimelineEventProps>'));
expect('FinancialTimelineEvent is built on FinancialTimelineEntry', event.includes('<FinancialTimelineEntry') && event.includes('markerTone={markerTone}'));
expect('FinancialTimelineEvent is exported from the UI barrel', uiIndex.includes("default as FinancialTimelineEvent") && uiIndex.includes('FinancialTimelineEventProps'));
expect('Financial event contract exposes Source', event.includes("sourceLabel = 'منبع'") && event.includes('{source}'));
expect('Financial event contract exposes Amount', event.includes("amountLabel = 'مبلغ'") && event.includes('{amount}'));
expect('Financial event contract exposes Date', event.includes("dateLabel = 'تاریخ'") && event.includes('{date}'));
expect('Financial event contract exposes Status', event.includes("statusLabel = 'وضعیت'") && event.includes('{status}'));
expect('Financial event contract exposes Deep Link', (event.includes("deepLinkLabel = 'دسترسی'") || event.includes("deepLinkLabel = 'دسترسی‌ها'")) && (event.includes('deepLink.onClick') || event.includes('resolvedDeepLinks.map')));
expect('Financial event amounts are nowrap/tabular', event.includes('whitespace-nowrap tabular-nums'));
expect('Financial event remains responsive', event.includes('sm:grid-cols-2') && event.includes('xl:grid-cols-['));
expect('Financial event has no network or persistence side effects', !event.includes('/api/') && !event.includes('apiFetch') && !event.includes('fetch('));

expect('Partner ledger imports shared financial event', partner.includes('FinancialTimelineEvent'));
expect('Partner ledger defaults to timeline mode', partnerState.includes("useState<'table' | 'timeline'>('timeline')"));
expect('Partner ledger keeps dense table mode', partner.includes("{ key: 'table', label: 'جدول'") && partner.includes('<DataTableShell'));
expect('Partner ledger timeline mode is explicit', partner.includes("{ key: 'timeline', label: 'تایم‌لاین'") && partner.includes("ledgerDisplayMode === 'timeline'"));
expect('Partner ledger exposes source field', partner.includes('source={sourceLabel}'));
expect('Partner ledger exposes amount field', partner.includes('amountLabel={amountLabel}') && partner.includes('formatCurrencyText(Math.abs(primaryAmount)'));
expect('Partner ledger exposes transaction date', partner.includes('date={formatLedgerTransactionDate(entry.transactionDate)}'));
expect('Partner ledger exposes balance status', partner.includes("const status = balanceValue > 0 ? 'بدهی به همکار'"));
expect('Partner ledger deep-links phone and product sources', partner.includes("kind: 'phone'") && partner.includes("kind: 'product'") && partner.includes('buildFinancialSourceTarget'));
expect('Partner ledger preserves edit/delete actions', partner.includes('setEditingEntry(entry)') && partner.includes('handleLedgerDelete(entry.id)'));
expect('Partner ledger preserves settlement batch drilldown', partner.includes('setActiveLedgerBatchId(batchId)'));
expect('Partner ledger preserves related asset history in expanded view', partner.includes('relatedPurchase?.history?.length') && partner.includes('تاریخچه دارایی مرتبط'));
expect('Legacy duplicate recent-ledger custom timeline was removed', !partner.includes('partner-ledger-timeline-card'));

expect('Customer ledger imports shared financial event', customer.includes('FinancialTimelineEvent'));
expect('Customer ledger exposes source field', customer.includes('source={sourceLabel}'));
expect('Customer ledger exposes amount field', customer.includes('amountLabel={amountLabel}') && customer.includes('primaryAmount'));
expect('Customer ledger exposes transaction date', customer.includes("date={formatKnownShamsiDate(entry.transactionDate, '—')}"));
expect('Customer ledger exposes balance status', customer.includes('status={balanceDirection}') && customer.includes("'مانده بدهکار'"));
expect('Customer ledger keeps source deep-link navigation', customer.includes('deepLink={sourceTarget ?') && customer.includes('navigate(sourceTarget.path)'));
expect('Customer ledger preserves edit/delete actions', customer.includes('setEditingEntry(entry)') && customer.includes('handleLedgerDelete(entry.id)'));
expect('Customer ledger preserves server-side pagination', customer.includes('setLedgerPageSize') && customer.includes('safeLedgerTotalPages'));
expect('Customer ledger old hand-built stream row was removed', !customer.includes('customer-ledger-stream-row-grid'));

if (!process.exitCode) console.log(`Financial event contract v127 audit passed: ${passed}/${passed}`);
