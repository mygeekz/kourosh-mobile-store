import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const nav = read('utils/navigationReturnContext.ts');
const crumb = read('utils/operationalNavigationBreadcrumb.ts');
const bar = read('components/main-layout/NavigationReturnBar.tsx');
const customerLedger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');

expect('Return context exposes a bounded parent-chain reader', nav.includes('getNavigationReturnChain') && nav.includes('visited.has(cursor.id)') && nav.includes('readNavigationReturnRecordById(cursor.parentReturnId)'));
expect('Return context can clear several records when jumping back multiple levels', nav.includes('removeNavigationReturnRecords') && nav.includes('new Set(ids.map'));
expect('Operational breadcrumb is built from the persisted return chain', crumb.includes('getNavigationReturnChain(record)') && crumb.includes('chain.map'));
expect('Operational breadcrumb resolves ordinary page titles through navigation context', crumb.includes('resolveNavigationContext(pathname)'));
expect('Breadcrumb keeps report stages identifiable', crumb.includes("pathname.startsWith('/reports')") && crumb.includes("fa-chart-line"));
expect('Breadcrumb keeps customer stages identifiable', crumb.includes("pathname.startsWith('/customers')") && crumb.includes("fa-regular fa-user"));
expect('Breadcrumb keeps partner stages identifiable', crumb.includes("pathname.startsWith('/partners')") && crumb.includes("fa-solid fa-handshake"));
expect('Installment drilldown creates contract and exact payment stages', crumb.includes('current-installment-') && crumb.includes('current-payment-') && crumb.includes('paymentId'));
expect('Installment drilldown creates exact check stage', crumb.includes('current-check-') && crumb.includes('checkId'));
expect('Invoice breadcrumb distinguishes legacy cash sale from invoice', crumb.includes("params.get('source') === 'legacy'") && crumb.includes("'فروش نقدی' : 'فاکتور'"));
expect('Repair detail has an exact operational stage', crumb.includes('current-repair-') && crumb.includes('تعمیر #'));
expect('Phone deep-link has an exact operational stage', crumb.includes("pathname === '/mobile-phones'") && crumb.includes('current-phone-'));
expect('Product deep-link has an exact operational stage', crumb.includes("pathname === '/products'") && crumb.includes('current-product-'));
expect('Partner settlement shows partner and settlement-document stages', crumb.includes('settlementBatchId') && crumb.includes('current-settlement-') && crumb.includes('سند تسویه'));
expect('Synthetic contract stage keeps current navctx while removing payment/check focus', crumb.includes("baseParams.delete('paymentId')") && crumb.includes("baseParams.delete('checkId')") && crumb.includes('const basePath'));
expect('Synthetic partner stage keeps navctx while removing settlement focus', crumb.includes("partnerParams.delete('settlementBatchId')") && crumb.includes('const partnerPath'));
expect('Operational breadcrumb does not arbitrarily drop old stages', !crumb.includes('slice(-7)'));
expect('Bar renders the operational breadcrumb contract marker', bar.includes('data-ui-operational-breadcrumb="true"'));
expect('Bar exposes the breadcrumb as navigation for accessibility', bar.includes('aria-label="بازگشت به مبدا"') && bar.includes('aria-label="مراحل بررسی"'));
expect('Bar supports direct return to any persisted origin stage', bar.includes('returnToRecord(stage.record') && bar.includes('chain.findIndex'));
expect('Jumping to an older stage clears that stage and all descendants', bar.includes('chain.slice(targetIndex)') && bar.includes('removeNavigationReturnRecords(recordsToClear.map'));
expect('One-step return remains available', bar.includes('const handleReturn = () => {') && bar.includes('buildNavigationReturnRestoreState(record)') && bar.includes('removeNavigationReturnRecords([record.id])'));
expect('Dismiss clears the whole active breadcrumb chain', bar.includes('removeNavigationReturnRecords(chain.map'));
expect('Synthetic current-page parent stages are directly navigable', bar.includes('if (stage.path) navigate(stage.path'));
expect('Breadcrumb has horizontal overflow handling for narrow screens', bar.includes('overflow-x-auto') && bar.includes('min-w-max'));
expect('Breadcrumb stays compact instead of adding a second tall page header', bar.includes('py-1.5') && bar.includes('h-7'));
expect('Customer-origin records use the actual customer name when available', customerLedger.includes("originTitle: profile?.fullName ? `مشتری ${profile.fullName}`"));
expect('Partner-origin records use the actual partner name when available', partnerLedger.includes("originTitle: profile?.partnerName ? `همکار ${profile.partnerName}`"));
expect('No dedicated breadcrumb CSS file was introduced', !fs.existsSync('styles/components/operational-navigation-breadcrumb.css'));

if (failures.length) {
  console.error(`Operational breadcrumb v131 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Operational breadcrumb v131 audit passed: ${checks}/${checks} checks.`);
