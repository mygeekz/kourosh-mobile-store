import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const timeline = read('components/ui/FinancialTimeline.tsx');
const uiIndex = read('components/ui/index.ts');
const partner = read('pages/partnerDetail/PartnerDetailController.tsx');
const installment = read('pages/InstallmentSaleDetailPage.tsx');
const customer = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const legacyPartnerCss = read('styles/system/legacy-quarantine/partner-settlement-foundation.css');

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

expect('Shared FinancialTimeline component exists', timeline.includes('const FinancialTimeline: React.FC<FinancialTimelineProps>'));
expect('Shared FinancialTimelineEntry primitive exists', timeline.includes('export const FinancialTimelineEntry'));
expect('Financial timeline is exported from the UI barrel', uiIndex.includes("FinancialTimeline, FinancialTimelineEntry"));
expect('Shared shell has a canonical refresh affordance', timeline.includes('onRefresh') && timeline.includes('در حال بروزرسانی'));
expect('Shared shell has canonical initial loading state', timeline.includes('در حال دریافت تاریخچه') && timeline.includes('role="status"'));
expect('Shared shell has canonical hard error state', timeline.includes('دریافت تاریخچه کامل نشد') && timeline.includes('onRetry'));
expect('Shared shell preserves partial content on incremental errors', timeline.includes('error && hasVisibleContent'));
expect('Shared shell has a canonical empty state', timeline.includes('هنوز رویداد مالی ثبت نشده است'));
expect('Shared shell has bounded load-more support', timeline.includes('hasMore') && timeline.includes('loadingMore') && timeline.includes('onLoadMore'));
expect('Timeline entries provide a common marker and connector', timeline.includes('grid-cols-[34px_minmax(0,1fr)]') && timeline.includes('bottom-[-12px] top-7 w-px'));
expect('Shared timeline remains responsive without custom CSS selectors', timeline.includes('sm:flex-row') && timeline.includes('sm:items-center') && !timeline.includes('.financial-timeline'));
expect('Shared timeline supports semantic tones without changing accounting logic', timeline.includes("type FinancialTimelineTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'"));

expect('Partner settlement timeline uses the shared shell', partner.includes('<FinancialTimeline') && partner.includes('تاریخچه مستقل تسویه گوشی'));
expect('Partner settlement rows use the shared entry primitive', partner.includes('<FinancialTimelineEntry') && partner.includes('phone-payment-'));
expect('Partner timeline keeps per-phone refresh behavior', partner.includes('fetchPhoneSettlementTimeline(item, 1, false)'));
expect('Partner timeline keeps server-side load-more behavior', partner.includes('currentPage + 1') && partner.includes('loadMoreLabel='));
expect('Partner timeline still separates automatic and manual settlement', partner.includes('شناسایی خودکار از فروش') && partner.includes('پرداخت مستقیم همین گوشی'));
expect('Partner timeline still uses the existing settlement accounting summary', partner.includes('phoneSettlementPaidAmount') && partner.includes('phoneSettlementBalance'));

expect('Installment unified payment history uses the shared shell', installment.includes('eyebrow="تایم‌لاین پرونده اقساط"'));
expect('Installment unified payment rows use shared entries', installment.includes('marker={<i className={meta.icon}'));
expect('Installment payment history keeps edit/delete handlers', installment.includes('onClick: () => openEditTx(t)') && installment.includes('onClick: () => openDeleteTx(t)'));
expect('Installment history uses the existing sale-detail refresh path', installment.includes('onRefresh={() => void fetchInstallmentSaleDetail()}'));
expect('Per-installment receipt details use the shared shell', installment.includes('eyebrow="تایم‌لاین دریافت قسط"'));
expect('Per-installment receipt details preserve payment context', installment.includes("sourceType: 'installment'"));

expect('Check cash-recovery history uses the shared shell', installment.includes('eyebrow="تایم‌لاین وصول چک"'));
expect('Check recovery rows use the shared entry primitive', installment.includes('markerTone="warning"'));
expect('Check recovery history preserves check context', installment.includes("sourceType: 'check_recovery'"));
expect('Check recovery history keeps edit/delete handlers', installment.includes('openEditTx(decoratedTx)') && installment.includes('openDeleteTx(decoratedTx)'));

expect('Customer ledger uses the shared financial timeline shell', customer.includes('eyebrow="تایم‌لاین مالی مشتری"'));
expect('Customer ledger keeps server-side page refresh behavior', customer.includes('fetchCustomerLedgerDirectory(true, true, ledgerPage)'));
expect('Customer ledger keeps existing edit/delete actions', customer.includes('setEditingEntry(entry)') && customer.includes('handleLedgerDelete(entry.id)'));
expect('Customer timeline reflects live account balance semantically', customer.includes("tone={balance > 0 ? 'warning' : balance < 0 ? 'success' : 'neutral'}"));

expect('Old partner-specific settlement timeline CSS block was removed from legacy quarantine', !legacyPartnerCss.includes('Partner phone settlement timeline — Apple Minimal') && !legacyPartnerCss.includes('.phone-settlement-timeline__entry'));
expect('Shared timeline does not introduce database or API mutations', !timeline.includes('/api/') && !timeline.includes('fetch(') && !timeline.includes('apiFetch'));

if (!process.exitCode) console.log(`Financial timeline v126 audit passed: ${passed}/${passed}`);
