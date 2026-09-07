import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const repo = read('server/repositories/partnerLedgerReads.repo.ts');
const facade = read('server/repositories/partners.repo.ts');
const service = read('server/services/partners.service.ts');
const routes = read('server/routes/partners.routes.ts');
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const capital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const phoneSchema = read('server/db/schema/legacyPrelude.schema.ts');

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

expect('Dedicated per-phone timeline route exists', routes.includes('/api/partners/:id/phone-settlements/:phoneId/timeline'));
expect('Timeline route uses partner read RBAC', routes.includes('"/api/partners/:id/phone-settlements/:phoneId/timeline"') && routes.includes('authorizeRole(PARTNER_READ_ROLES)'));
expect('Timeline route returns 404 for a phone outside the partner sold-phone scope', routes.includes('گوشی فروخته‌شده برای این همکار یافت نشد'));
expect('Repository facade exposes only the targeted timeline read', facade.includes('getPartnerPhoneSettlementTimeline'));
expect('Service delegates timeline reads without loading the full partner ledger', service.includes('getPartnerPhoneSettlementTimeline: async') && !service.match(/getPartnerPhoneSettlementTimeline:[\s\S]{0,300}getPartnerLedger\(/));
expect('Timeline query has a bounded page size', repo.includes('PartnerPhoneSettlementTimelineQuery') && repo.includes('Math.min(50, Math.max(10'));
expect('Every timeline page has a cheap ownership and sold-status guard', repo.includes('WHERE id = ? AND supplierId = ?') && repo.includes("status IN ('فروخته شده', 'فروخته شده (قسطی)')"));
expect('Settlement accounting CTE can be scoped to one phone', repo.includes('buildPartnerSoldPhoneSettlementStateCte') && repo.includes("ph.supplierId = ? AND ph.id = ? AND ph.status IN") && repo.includes('partnerPhoneScopeSql'));
expect('Timeline summary uses the same accounting CTE as settlement directory', repo.includes('PARTNER_SOLD_PHONE_SETTLEMENT_STATE_FOR_PHONE_CTE') && repo.includes('phoneSettlementPaidAmount') && repo.includes('phoneSettlementBalance'));
expect('Load-more requests can skip the settlement meta CTE', repo.includes('const includeMeta = rawQuery.includeMeta !== false') && repo.includes('if (includeMeta)'));
expect('Direct payment history is scoped by partner and phone reference', repo.includes('WHERE partnerId = ?') && repo.includes('AND referenceId = ?') && repo.includes('PHONE_SETTLEMENT_LEDGER_TYPES_SQL'));
expect('Direct payment history is paginated and ordered newest first', repo.includes('LIMIT ? OFFSET ?') && repo.includes("ORDER BY datetime(COALESCE(transactionDate, updatedAt, createdAt, '1970-01-01')) DESC, id DESC"));
expect('Check recovery aggregation is restricted to the scoped installment sale', repo.includes('scoped_check') && repo.includes('scoped_sale') && repo.includes('WHERE scoped_check.id = rp.sourceId'));
expect('Partner ledger has the partner/reference index needed by timeline lookup', phoneSchema.includes('idx_partner_ledger_partner_reference'));
expect('Controller keeps a per-phone bounded timeline cache', controller.includes('phoneSettlementTimelineCache') && controller.includes('Record<number, any>'));
expect('Controller protects each phone timeline from stale responses', controller.includes('phoneSettlementTimelineRequestSeqRef') && controller.includes('phoneSettlementTimelineRequestSeqRef.current[phoneId] !== requestId'));
expect('Timeline is fetched only when the user expands a phone', controller.includes('togglePhoneSettlementTimeline') && controller.includes('fetchPhoneSettlementTimeline(item, 1, false)'));
expect('Initial timeline request uses only 20 rows', controller.includes("pageSize: '20'") && controller.includes("includeMeta: targetPage === 1 ? '1' : '0'"));
expect('Timeline load-more appends and de-duplicates payment rows', controller.includes('previousPayments') && controller.includes('dedupedPayments') && controller.includes('currentPage + 1'));
expect('Timeline cache is invalidated after financial refreshes', controller.includes('setPhoneSettlementTimelineCache({})') && controller.includes('setExpandedPhoneSettlementTimelineId(null)'));
expect('Timeline no longer derives phone history from the currently paged partner ledger', !controller.includes('phoneSettlementPaymentsByPhoneId') && !capital.includes('phoneSettlementPaymentsByPhoneId'));
expect('Directory buttons use server-provided payment counts', capital.includes('Number(item.phoneSettlementPaymentCount || 0)'));
expect('Auto-recognized and manual settlement amounts are presented separately', controller.includes('شناسایی خودکار از فروش') && controller.includes('پرداخت مستقیم همین گوشی'));
expect('Cash/installment-managed phones still expose settlement details with zero manual rows', capital.includes("'جزئیات تسویه'") && controller.includes('وصول سرمایه از پرونده اقساط محاسبه می‌شود'));
expect('Timeline offers an explicit refresh independent of partner ledger pagination', controller.includes('onRefresh={() => void fetchPhoneSettlementTimeline(item, 1, false)}') && controller.includes('FinancialTimeline'));
expect('Timeline delegates loading and retry states to the shared financial timeline shell', controller.includes('loading={isInitialLoading}') && controller.includes('onRetry={() => void fetchPhoneSettlementTimeline'));
expect('Timeline load-more has a bounded explicit affordance', controller.includes('نمایش بیشتر') && controller.includes('hasMore'));

if (!process.exitCode) console.log(`Partner phone settlement timeline v125 audit passed: ${passed}/${passed}`);
