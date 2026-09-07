import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const read = (path) => fs.readFileSync(path, 'utf8');
const utility = read('utils/financialSourceLinks.ts');
const event = read('components/ui/FinancialTimelineEvent.tsx');
const customerRepo = read('server/repositories/customerLedgerReads.repo.ts');
const customerController = read('pages/customerDetail/CustomerDetailController.tsx');
const partnerController = read('pages/partnerDetail/PartnerDetailController.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const invoiceDetail = read('pages/InvoiceDetail.tsx');
const installmentDetail = read('pages/InstallmentSaleDetailPage.tsx');
const productsPage = read('pages/Products.tsx');
const phonesController = read('pages/mobilePhones/MobilePhonesController.tsx');

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

const transpiledUtility = ts.transpileModule(utility, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: 'utils/financialSourceLinks.ts',
  reportDiagnostics: true,
});
const utilityErrors = (transpiledUtility.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
expect('Financial source utility transpiles', utilityErrors.length === 0);

let routeBuilder = null;
if (!utilityErrors.length) {
  const mod = { exports: {} };
  const fn = new Function('exports', 'module', transpiledUtility.outputText);
  fn(mod.exports, mod);
  routeBuilder = mod.exports.buildFinancialSourceTarget;
}
expect('Financial source route builder is executable', typeof routeBuilder === 'function');
const route = (input) => routeBuilder?.(input)?.path || '';
expect('Sales-order source routes to invoice', route({ kind: 'sales_order', id: 41 }) === '/invoices/41');
expect('Legacy cash-sale source is collision-safe', route({ kind: 'legacy_sale', id: 41 }) === '/invoices/41?source=legacy');
expect('Installment payment routes to exact payment', route({ kind: 'installment_sale', id: 9, paymentId: 77 }) === '/installment-sales/9?tab=installments&paymentId=77');
expect('Installment check routes to exact check', route({ kind: 'installment_check', parentId: 9, checkId: 55 }) === '/installment-sales/9?tab=checks&checkId=55');
expect('Repair source routes to exact repair', route({ kind: 'repair', id: 8 }) === '/repairs/8');
expect('Phone source routes to inventory focus', route({ kind: 'phone', id: 3 }) === '/mobile-phones?phoneId=3');
expect('Product source routes to inventory focus', route({ kind: 'product', id: 4 }) === '/products?productId=4');
expect('Partner settlement source routes to filtered ledger', route({ kind: 'partner_settlement_batch', partnerId: 2, batchId: 'batch-abc' }) === '/partners/2?view=ledger&settlementBatchId=batch-abc');

expect('Phone target query opens the exact phone details', phonesController.includes("searchParams.get('phoneId')") && phonesController.includes('phones.find((phone) => Number(phone.id) === focusedPhoneId)') && phonesController.includes('openDetailsModal(target)'));
expect('Product target query narrows to the exact product ID', productsPage.includes("searchParams.get('productId')") && productsPage.includes('products.find((product) => Number(product.id) === focusedProductId)') && productsPage.includes('setFocusedProductOverrideId(focusedProductId)') && productsPage.includes('Number(product.id) === focusedProductOverrideId'));
expect('Product deep link visibly focuses the inventory list', productsPage.includes('products-list-surface') && productsPage.includes('Number(row.original.id) === focusedProductId') && productsPage.includes('ring-4 ring-sky-100'));

expect('Financial event supports multiple deep links', event.includes('deepLinks?: FinancialTimelineEventLink[]') && event.includes('resolvedDeepLinks.map'));
expect('Financial event remains backward compatible with one deep link', event.includes('deepLink?: FinancialTimelineEventLink | null') && event.includes('deepLink ? [deepLink] : []'));
expect('Financial event access buttons wrap responsively', event.includes('flex min-w-0 flex-wrap items-center gap-1.5') && event.includes('minmax(12rem,1.45fr)'));
expect('Shared financial event remains persistence-free', !event.includes('/api/') && !event.includes('apiFetch') && !event.includes('fetch('));

expect('Customer ledger recognizes installment payment source', customerRepo.includes('referenceType === "installment_payment_tx"') && customerRepo.includes('sourceKind: "installment_payment"'));
expect('Customer ledger recognizes installment check source', customerRepo.includes('referenceType === "installment_check_cashed"') && customerRepo.includes('sourceKind: "installment_check"'));
expect('Customer installment payment deep link is exact', customerRepo.includes('?tab=installments&paymentId=${paymentId}'));
expect('Customer installment check deep link is exact', customerRepo.includes('?tab=checks&checkId=${candidateId}'));
expect('Customer ledger resolves new sales-order invoices', customerRepo.includes('FROM sales_orders') && customerRepo.includes('`/invoices/${candidateId}`'));
expect('Customer ledger resolves legacy cash sales explicitly', customerRepo.includes('FROM sales_transactions') && customerRepo.includes('`/invoices/${candidateId}?source=legacy`'));
expect('Customer ledger resolves repair files', customerRepo.includes('FROM repairs') && customerRepo.includes('`/repairs/${candidateId}`'));
expect('Customer source hydration is batched', customerRepo.includes('await Promise.all([') && customerRepo.includes('loadIdRows(installmentTransactionIds') && customerRepo.includes('loadIdRows(legacySaleIds'));
expect('Customer source report no longer resolves rows one-by-one', !customerRepo.includes('resolveCustomerLedgerSourceInfo'));
expect('Customer UI fallback uses canonical route builder', customerController.includes('buildFinancialSourceTarget') && customerController.includes("kind: 'legacy_sale'") && customerController.includes("kind: 'repair'"));

expect('Legacy invoice route is explicit in UI', invoiceDetail.includes("searchParams.get('source') === 'legacy'") && invoiceDetail.includes('`/api/invoice-data/${orderId}`'));
expect('Normal invoice route remains unchanged', invoiceDetail.includes('`/api/sales-orders/${orderId}`'));
expect('Legacy invoice disables return/cancel mutations', invoiceDetail.includes('!isLegacySource ? <Button') && invoiceDetail.includes('فروش نقدی قدیمی · فقط خواندنی'));

expect('Installment page supports paymentId targeting', installmentDetail.includes("searchParams.get('paymentId')") && installmentDetail.includes('payment-row-${highlightedPaymentId}'));
expect('Installment page supports checkId targeting', installmentDetail.includes("searchParams.get('checkId')") && installmentDetail.includes('check-row-${highlightedCheckId}'));
expect('Check deep link opens and expands Checks tab', installmentDetail.includes("p.set('tab', 'checks')") && installmentDetail.includes('next.add(highlightedCheckId)'));
expect('Exact check card receives visible focus ring', installmentDetail.includes('checkId === highlightedCheckId') && installmentDetail.includes('ring-4 ring-sky-100'));

expect('Partner phone sale source uses canonical builder', partnerController.includes('buildFinancialSourceTarget') && partnerController.includes("'installment_sale', 'sales_order', 'legacy_sale'"));
expect('Partner profile reads settlement deep-link query', partnerController.includes("searchParams.get('settlementBatchId')") && partnerController.includes("searchParams.get('view') === 'ledger'"));
expect('Partner deep link is applied once per route key', partnerController.includes('appliedLedgerDeepLinkKey') && partnerController.includes('requestedLedgerDeepLinkKey'));
expect('Partner directory waits for deep-link filters before first request', partnerController.includes('if (!token || !id || ledgerDeepLinkPending) return;'));
expect('Partner batch filter is not cleared before metadata arrives', partnerController.includes('ledgerLoading || !ledgerDirectory?.metaIncluded'));
expect('Partner deep link scrolls to ledger workspace', partnerController.includes("getElementById('partner-ledger-section')") && partnerLedger.includes('id="partner-ledger-section"'));
expect('Partner timeline exposes multiple destinations', partnerLedger.includes('deepLinks={sourceLinks}') && partnerLedger.includes('sourceLinks.push'));
expect('Partner timeline links related sale source', partnerLedger.includes('relatedPurchase?.saleSourceType') && partnerLedger.includes("'sales_order', 'legacy_sale', 'installment_sale'"));
expect('Partner timeline links settlement document', partnerLedger.includes("kind: 'partner_settlement_batch'") && partnerLedger.includes('batchId'));
expect('Partner timeline keeps direct phone/product destinations', partnerLedger.includes("kind: 'phone'") && partnerLedger.includes("kind: 'product'"));

if (!process.exitCode) console.log(`Financial deep-link v128 audit passed: ${passed}/${passed}`);
