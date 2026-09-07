import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const repo = read('server/repositories/partnerLedgerReads.repo.ts');
const facade = read('server/repositories/partners.repo.ts');
const service = read('server/services/partners.service.ts');
const routes = read('server/routes/partners.routes.ts');
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const capital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const fullModal = read('pages/partnerDetail/PartnerFullSettlementModal.tsx');
const viewModels = read('pages/partnerDetail/partnerDetailViewModels.ts');
const types = read('types.ts');
const phoneSchema = read('server/db/schema/phones.schema.ts');
const salesSchema = read('server/db/schema/sales.schema.ts');
const installmentSchema = read('server/db/schema/installments.schema.ts');

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

expect('Profile shell no longer hydrates every sold phone', service.includes('getPartnerPhoneSettlementProfileData(id)') && !service.match(/getPartnerProfileShell[\s\S]{0,700}getSoldPhoneSettlementItems\(id\)/));
expect('Profile shell exposes bounded settlement preview and global summary', service.includes('soldPhoneSettlementSummary: phoneSettlementProfile.summary') && service.includes('phoneSettlementProfile.previewItems'));
expect('Settlement profile summary is typed', types.includes('interface PartnerPhoneSettlementSummary') && types.includes('soldPhoneSettlementSummary: PartnerPhoneSettlementSummary'));
expect('Dedicated phone settlement directory route exists', routes.includes('/api/partners/:id/phone-settlements') && routes.includes('includeMeta'));
expect('Repository directory caps page size', repo.includes('PartnerPhoneSettlementDirectoryQuery') && repo.includes('Math.min(100, Math.max(10'));
expect('Repository supports open/settled server-side filtering', repo.includes("phoneSettlementBalance > 0.00001") && repo.includes("phoneSettlementBalance <= 0.00001"));
expect('Repository supports server-side settlement sorting', repo.includes("highestBalance") && repo.includes("highestCapital") && repo.includes("oldestSale") && repo.includes("lowestBalance"));
expect('Settlement state scopes sold phones to one supplier', repo.includes("ph.supplierId = ? AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')"));
expect('Settlement state preserves sale-driven installment collection', repo.includes('installmentCollectedAmount') && repo.includes('autoRecognizedPaidAmount') && repo.includes('installmentSaleCheckPaidAmount'));
expect('Settlement state preserves cash-sale automatic capital return', repo.includes("saleSourceType IN ('sales_order','legacy_sale')") && repo.includes("NOT LIKE '%credit%'"));
expect('Global summary uses final derived paid/balance values', repo.includes('SUM(phoneSettlementPaidAmount)') && repo.includes('SUM(phoneSettlementBalance)') && repo.includes('openBalanceTotal'));
expect('Only paged phone IDs are richly hydrated', repo.includes('phoneIds: ids') && repo.includes('LIMIT ? OFFSET ?'));
expect('Profile action preview is explicitly bounded', repo.includes('LIMIT 8') && repo.includes('previewItems'));
expect('Controller debounces settlement search', controller.includes('setDebouncedPhoneSettlementSearch') && controller.includes('320'));
expect('Controller protects settlement directory from stale requests', controller.includes('phoneSettlementRequestSeqRef') && controller.includes('requestId !== phoneSettlementRequestSeqRef.current'));
expect('Controller resets to page one when settlement filters change', controller.includes('lastPhoneSettlementFilterKeyRef') && controller.includes('setPhoneSettlementPage(1)'));
expect('Client no longer filters the full sold-phone array', controller.includes('Filtering and ordering are server-side') && !controller.includes('filterSoldPhoneDailyPriceRows(soldPhoneDailyPriceRows'));
expect('Client totals come from server filtered summary', controller.includes('phoneSettlementDirectory?.filteredSummary'));
expect('Global KPI totals come from profile settlement summary', controller.includes('settlementSummary?.paidTotal') && controller.includes('settlementSummary?.balanceTotal') && controller.includes('settlementSummary?.openSaleFiles'));
expect('Read-model can use global summary while keeping bounded candidates', viewModels.includes('settlementSummary?:') && viewModels.includes('soldPhoneItemCount') && viewModels.includes('settlementSummary?.open'));
expect('Capital table has server pagination controls', capital.includes('phoneSettlementTotalPages') && capital.includes('setPhoneSettlementPage') && capital.includes('تعداد در صفحه'));
expect('Capital export fetches full filtered data in 100-row chunks', controller.includes("pageSize: '100'") && controller.includes('do {') && controller.includes('phoneSettlementExporting'));
expect('Full settlement modal uses a separate open-only paginated directory', controller.includes("status: 'open'") && controller.includes('fullPhoneSettlementPageSize') && fullModal.includes('fullPhoneSettlementTotalPages'));
expect('Bulk selection persists across pages via row cache', controller.includes('bulkSettlementRowCache') && controller.includes('Array.from(bulkSettlementIdSet)'));
expect('Select-all semantics are page-scoped for pagination safety', fullModal.includes('انتخاب این صفحه') && controller.includes('Array.from(new Set([...previous, ...pageIds]))'));
expect('Full settlement aggregate cards use global summary, not current page sums', controller.includes('settlementSummary?.openBalanceTotal') && fullModal.includes('fullPhoneSettlementTotal'));
expect('Phone supplier/status/date index supports settlement directory', phoneSchema.includes('idx_phones_supplier_status_sale_date'));
expect('Sales source lookup indexes support phone settlement state', salesSchema.includes('idx_sales_transactions_item_lookup') && salesSchema.includes('idx_sales_order_items_item_lookup'));
expect('Installment source lookup indexes support settlement state', installmentSchema.includes('idx_installment_sale_items_phone_lookup') && installmentSchema.includes('idx_installment_payments_source_lookup'));
expect('Legacy sold-phone repository method remains for compatibility', facade.includes('getSoldPhoneSettlementItems') && repo.includes('getSoldPhoneSettlementItemsFromPartnerDb'));

if (!process.exitCode) console.log(`Partner phone settlement pagination v124 audit passed: ${passed}/${passed}`);
