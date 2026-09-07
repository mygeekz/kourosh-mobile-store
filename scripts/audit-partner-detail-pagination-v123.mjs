import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (label, condition) => checks.push({ label, ok: Boolean(condition) });

const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const ledgerUi = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const purchasesUi = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const routes = read('server/routes/partners.routes.ts');
const service = read('server/services/partners.service.ts');
const repoFacade = read('server/repositories/partners.repo.ts');
const ledgerRepo = read('server/repositories/partnerLedgerReads.repo.ts');
const historyRepo = read('server/repositories/partnerPurchaseHistory.repo.ts');
const legacySchema = read('server/db/schema/legacyPrelude.schema.ts');
const salesSchema = read('server/db/schema/sales.schema.ts');
const phonesSchema = read('server/db/schema/phones.schema.ts');

expect('Partner detail loads the lightweight profile shell', controller.includes('?view=profile') && routes.includes("String(req.query.view || '') === 'profile'"));
expect('Profile shell uses a dedicated lightweight ledger snapshot', service.includes('getPartnerLedgerProfileSnapshot') && ledgerRepo.includes('getPartnerLedgerProfileSnapshotFromDb'));
expect('Profile shell does not call full legacy partner bundle', !controller.includes('const data: PartnerDetailsPageData') && controller.includes('PartnerDetailProfileShellData'));

expect('Partner ledger has a server-side GET directory endpoint', routes.includes('"/api/partners/:id/ledger"') && routes.includes('listPartnerLedgerDirectory'));
expect('Partner ledger server query caps page size', ledgerRepo.includes('Math.min(100') && ledgerRepo.includes('LIMIT ? OFFSET ?'));
expect('Partner ledger CTE is scoped to one partner before ranking', ledgerRepo.includes('WHERE l.partnerId = ${safePartnerId}'));
expect('Partner ledger supports server search', ledgerRepo.includes("COALESCE(description, '') LIKE ?") && ledgerRepo.includes('settlementBatchId'));
expect('Partner ledger supports server direction and date-range filtering', ledgerRepo.includes('query.direction') && ledgerRepo.includes('query.range'));
expect('Partner ledger supports server system-id filtering', ledgerRepo.includes('phoneMatch') && ledgerRepo.includes('productMatch') && ledgerRepo.includes('typedMatch'));
expect('Partner ledger metadata can be skipped on simple page navigation', ledgerRepo.includes('includeMeta?: boolean') && ledgerRepo.includes('metaIncluded') && controller.includes("includeMeta: includeMeta ? '1' : '0'"));
expect('Chunk export skips ledger metadata', controller.includes("includeMeta: '0'") && controller.includes("includeRelated: '0'"));
expect('Ledger page related purchases can be skipped independently', ledgerRepo.includes('includeRelated?: boolean') && service.includes('query.includeRelated === false'));
expect('Partner ledger filter search is debounced', controller.includes('setDebouncedLedgerSearch') && controller.includes('320'));
expect('Partner ledger ignores stale async responses', controller.includes('ledgerRequestSeqRef') && controller.includes('requestId !== ledgerRequestSeqRef.current'));
expect('Partner ledger avoids double fetch when filters reset page', controller.includes('lastLedgerFilterKeyRef') && controller.includes('filterChanged && ledgerPage !== 1'));
expect('Partner ledger UI exposes server pagination controls', ledgerUi.includes('صفحه‌بندی دفتر همکار') && ledgerUi.includes('ledgerPageSize'));
expect('Partner ledger page sizes are bounded UI choices', ledgerUi.includes("value: '25'") && ledgerUi.includes("value: '50'") && ledgerUi.includes("value: '100'"));
expect('Partner ledger UI reports filtered total across all pages', ledgerUi.includes('مطابق فیلترهای فعلی در همه صفحات'));

expect('Partner purchase history has a server-side GET endpoint', routes.includes('"/api/partners/:id/purchases"') && routes.includes('listPartnerPurchaseDirectory'));
expect('Partner purchase directory uses lightweight paged keys first', ledgerRepo.includes('WITH purchase_keys AS') && ledgerRepo.includes("'product' AS assetType") && ledgerRepo.includes("'phone' AS assetType"));
expect('Partner purchase hydration is scoped to current page IDs', ledgerRepo.includes('productIds') && ledgerRepo.includes('phoneIds') && ledgerRepo.includes('getPurchasedItemsFromPartnerDb(partnerId, {'));
expect('Partner purchase page count avoids full total-value aggregation', ledgerRepo.includes('getPartnerPurchaseCountsFromDb') && ledgerRepo.includes('const counts = await getPartnerPurchaseCountsFromDb(partnerId)'));
expect('Phone purchase history is fetched in one batch', historyRepo.includes('listPhoneInventoryEventsForPartnerProfileBatchFromRepo') && historyRepo.includes('phoneId IN (${placeholders})'));
expect('Partner service batches phone history instead of N+1 loop', service.includes('listPhoneInventoryEventsBatch') && !service.includes('await partnersRepo.listPhoneInventoryEvents(phoneId)'));
expect('Product history is fetched in a batch for page IDs', service.includes('buildProductHistoryMap(productIds)') && historyRepo.includes('productId IN (${placeholders})'));
expect('Ledger rows receive related purchase history scoped to current ledger page', service.includes('relatedPurchases: buildPurchaseHistory') && controller.includes('ledgerRelatedPurchases'));
expect('Partner purchase UI exposes server pagination controls', purchasesUi.includes('صفحه‌بندی خریدهای همکار') && purchasesUi.includes('purchasePageSize'));
expect('Partner purchase requests ignore stale async responses', controller.includes('purchaseRequestSeqRef') && controller.includes('requestId !== purchaseRequestSeqRef.current'));
expect('Partner purchase filter reset avoids stale page fetch', controller.includes('lastPurchaseFilterKeyRef') && controller.includes('filterChanged && purchasePage !== 1'));

expect('Full partner ledger export is fetched in chunks of 100', controller.includes('const chunkSize = 100') && controller.includes('fetchAllPartnerLedgerChunks'));
expect('Active batch CSV uses fully fetched chunk rows', controller.includes('fullBatchRows = await fetchAllPartnerLedgerChunks(activeLedgerBatchId)') && controller.includes('partner-settlement-${activeLedgerBatchId}.csv'));
expect('Active batch print uses fully fetched chunk rows', controller.includes('handlePrintActiveBatch') && controller.includes('fullBatchRows.map'));

expect('Partner ledger activity/reference/batch indexes exist', legacySchema.includes('idx_partner_ledger_partner_activity') && legacySchema.includes('idx_partner_ledger_partner_reference') && legacySchema.includes('idx_partner_ledger_partner_batch_activity'));
expect('Purchase supplier and item join indexes exist', salesSchema.includes('idx_purchases_supplier_purchase_date') && salesSchema.includes('idx_purchase_items_purchase_product') && salesSchema.includes('idx_purchase_items_product_purchase'));
expect('Phone supplier purchase-date index exists', phonesSchema.includes('idx_phones_supplier_purchase_date'));
expect('Phone event batch-history index exists', phonesSchema.includes('idx_phone_inventory_events_phone_event_date'));
expect('Repository facade exposes scoped purchase hydration', repoFacade.includes('getPurchasedItemsScoped') && repoFacade.includes('PartnerPurchasedItemsScope'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.label}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
