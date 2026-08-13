import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const resolver = read('utils/navigationEntityLabelResolver.ts');
const nav = read('utils/navigationReturnContext.ts');
const crumb = read('utils/operationalNavigationBreadcrumb.ts');
const reportHook = read('hooks/useReportDrilldownNavigation.ts');
const customerLedger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const cashPhoneReport = read('pages/reports/PhoneSalesReport.tsx');
const installmentPhoneReport = read('pages/reports/PhoneInstallmentSalesReport.tsx');
const debtors = read('pages/reports/DebtorsReport.tsx');
const creditors = read('pages/reports/CreditorsReport.tsx');

expect('Entity label resolver is a dedicated utility', fs.existsSync('utils/navigationEntityLabelResolver.ts'));
expect('Resolver is pure and does not call fetch', !resolver.includes('fetch('));
expect('Resolver does not import database/query helpers', !/allAsync|getAsync|server\//.test(resolver));
expect('Resolver accepts target path plus already-loaded entity snapshot', resolver.includes('targetPath: string') && resolver.includes('entityName?:') && resolver.includes('identifier?:'));
expect('Resolver can represent captured breadcrumb stages', resolver.includes('NavigationEntityBreadcrumbStageSnapshot'));
expect('Installment resolver builds a contract stage', resolver.includes('entity-contract-') && resolver.includes('قرارداد #'));
expect('Installment resolver builds semantic installment ordinal stage', resolver.includes('entity-installment-') && resolver.includes('قسط ${installmentOrdinal'));
expect('Installment resolver builds payment amount stage when amount is known', resolver.includes('amountText ? `پرداخت ${amountText}`'));
expect('Installment resolver still falls back to payment id without amount', resolver.includes('`پرداخت #${faNumber(paymentId)}`'));
expect('Check resolver uses check number when available', resolver.includes('checkNumber ? `چک ${checkNumber}`'));
expect('Phone resolver renders model and compact IMEI in the visible label', resolver.includes('گوشی ${phoneName}') && resolver.includes("compactIdentifier(identifier || parseImei(sourceLabel), 'IMEI '"));
expect('Product resolver renders product name and SKU identifier', resolver.includes('کالا ${productName}') && resolver.includes("compactIdentifier(identifier, 'SKU '"));
expect('Resolver has no arbitrary asynchronous/network dependency', !/async\s+|Promise\s*</.test(resolver));
expect('Navigation record persists captured target entity stages', nav.includes('targetEntityStages?: NavigationEntityBreadcrumbStageSnapshot[]'));
expect('Navigation capture accepts a lightweight targetEntity snapshot', nav.includes('targetEntity?: NavigationEntityLabelContext'));
expect('Navigation labels are resolved once at navigation capture time', nav.includes('targetEntityStages: resolveNavigationEntityLabels({'));
expect('Navigation capture forwards origin context as fallback label evidence', nav.includes('contextLabel: input.originContextLabel'));
expect('Operational breadcrumb prefers captured entity labels when available', crumb.includes('capturedTargetStages') && crumb.includes('enrichedTargetStages.length > 0'));
expect('Operational breadcrumb retains old path-based fallback resolver', crumb.includes('currentTargetStages(pathname, search, lastRecord)'));
expect('Captured parent stage receives active navctx before navigation', crumb.includes('withActiveNavigationContext(stage.path, search)'));
expect('Captured stage visibility is recalculated after jumping to a parent stage', crumb.includes('directStageIndex') && crumb.includes('visibleSnapshots = snapshots.slice(0, directStageIndex + 1)'));
expect('Current and stored target paths are compared without navctx', crumb.includes("url.searchParams.delete('navctx')") && crumb.includes('comparablePath(record.targetPath)'));
expect('Report drilldown API can optionally pass targetEntity without changing every caller', reportHook.includes('targetEntity?: NavigationEntityLabelContext') && reportHook.includes('targetEntity: options.targetEntity'));
expect('Customer ledger reuses already loaded source kind', customerLedger.includes("kind: String((entry as any)?.sourceKind || '')"));
expect('Customer ledger reuses already loaded source label', customerLedger.includes('sourceLabel,'));
expect('Customer ledger sends the already rendered transaction amount to resolver', customerLedger.includes('amountText: primaryAmount > 0'));
expect('Partner ledger reuses page-scoped related entity name', partnerLedger.includes('entityName: relatedName || undefined'));
expect('Partner ledger reuses page-scoped identifier instead of querying again', partnerLedger.includes("identifier: String(relatedPurchase?.identifier || '').trim() || undefined"));
expect('Partner settlement deep-link forwards batch id metadata', partnerLedger.includes("kind: 'partner_settlement_batch'") && partnerLedger.includes('batchId,'));
expect('Cash phone report passes model/IMEI/amount snapshot', cashPhoneReport.includes("targetEntity: { kind: 'sales_order'") && cashPhoneReport.includes('identifier: row.imei') && cashPhoneReport.includes('amountText: money(row.totalPrice)'));
expect('Installment phone report passes model/IMEI/amount snapshot', installmentPhoneReport.includes("targetEntity: { kind: 'installment_sale'") && installmentPhoneReport.includes('identifier: row.imei') && installmentPhoneReport.includes('amountText: money(row.actualSalePrice)'));
expect('Debtors source drilldown forwards its already-resolved source label', debtors.includes('targetEntity: { sourceLabel: row.sourceLabel || undefined'));
expect('Creditors source drilldown forwards its already-resolved source label', creditors.includes('targetEntity: { sourceLabel: row.sourceLabel || undefined'));
expect('No dedicated entity breadcrumb CSS file was introduced', !fs.existsSync('styles/components/navigation-entity-labels.css'));

if (failures.length) {
  console.error(`Navigation entity labels v132 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Navigation entity labels v132 audit passed: ${checks}/${checks} checks.`);
