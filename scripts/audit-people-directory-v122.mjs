import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (label, condition) => checks.push({ label, ok: Boolean(condition) });

const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const peopleUi = read('components/people/PeopleUiKit.tsx');
const customerRoutes = read('server/routes/customers.routes.ts');
const customerReads = read('server/repositories/customerReads.repo.ts');
const customerLedgerReads = read('server/repositories/customerLedgerReads.repo.ts');
const customerController = read('pages/customerDetail/CustomerDetailController.tsx');
const customerLedgerUi = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const customerPrint = read('pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx');
const partnerRoutes = read('server/routes/partners.routes.ts');
const partnerReads = read('server/repositories/partnerReads.repo.ts');
const partnerService = read('server/services/partners.service.ts');
const partnerMutations = read('server/repositories/partnerMutations.repo.ts');
const installmentRoutes = read('server/routes/installments.routes.ts');
const trustRoutes = read('server/routes/customerTrust.routes.ts');

expect('Customers uses server directory view', customers.includes("view: 'directory'") && customerRoutes.includes("String(req.query.view || '') === 'directory'"));
expect('Customers search is debounced', customers.includes('setDebouncedSearchTerm') && customers.includes('320'));
expect('Customers page only scopes due overview to current customer IDs', customers.includes('customer-due-overview') && customers.includes("customerIds.join(','"));
expect('Customers page only scopes trust profiles to current customer IDs', customers.includes('trust-profiles') && customers.includes("ids: customerIds.join(','"));
expect('Customer directory repository paginates and caps page size', customerReads.includes('LIMIT ? OFFSET ?') && customerReads.includes('Math.min(100'));
expect('Customer directory has summary batch', customerReads.includes('getCustomerDirectorySummaryFromDb'));
expect('Customer due endpoint accepts scoped customer IDs', installmentRoutes.includes('customer-due-overview') && installmentRoutes.includes('customerIds'));
expect('Trust endpoint accepts scoped IDs', trustRoutes.includes('trust-profiles') && trustRoutes.includes('req.query.ids'));

expect('Partners uses server directory view', partners.includes("view: 'directory'") && partnerRoutes.includes("String(req.query.view || '') === 'directory'"));
expect('Partners search is debounced', partners.includes('setDebouncedSearchTerm') && partners.includes('320'));
expect('Partner directory repository paginates', partnerReads.includes('listPartnersDirectoryFromDb') && partnerReads.includes('LIMIT ? OFFSET ?'));
expect('Partner directory scopes heavy row hydration to current page IDs', partnerReads.includes('getAllPartnersWithBalanceFromDb(undefined, ids)'));
expect('Partner deletion guards operational dependencies', partnerService.includes('getPartnerDeleteDependencies') && partnerMutations.includes('getPartnerDeleteDependenciesFromDb'));
expect('Partner deletion returns conflict for linked history', partnerService.includes('409') && partnerService.includes('سوابق وابسته'));

expect('Shared people modal summary exists', peopleUi.includes('PeopleModalSummaryCard'));
expect('Shared people delete confirmation exists', peopleUi.includes('PeopleDeleteConfirmContent'));
expect('Customer add modal uses split operational layout', customers.includes('data-ui-customer-modal="canonical-split"') && customers.includes('layout="split"'));
expect('Partner add modal uses split operational layout', partners.includes('data-ui-partner-modal="canonical-split"') && partners.includes('layout="split"'));
expect('Customer delete uses shared confirmation', customers.includes('<PeopleDeleteConfirmContent'));
expect('Partner delete uses shared confirmation', partners.includes('<PeopleDeleteConfirmContent'));

expect('Customer profile bundle can skip full ledger', customerController.includes('?includeLedger=0'));
expect('Customer ledger has server directory GET', customerRoutes.includes('listCustomerLedgerDirectory'));
expect('Customer ledger directory paginates', customerLedgerReads.includes('listCustomerLedgerDirectoryFromDb') && customerLedgerReads.includes('LIMIT ? OFFSET ?'));
expect('Customer ledger source hydration is batch based', customerLedgerReads.includes('decorateCustomerLedgerSourceRows') && customerLedgerReads.includes('IN ('));
expect('Customer ledger search includes amounts and date', customerLedgerReads.includes('CAST(COALESCE(debit,0) AS TEXT) LIKE ?') && customerLedgerReads.includes("COALESCE(transactionDate,'') LIKE ?"));
expect('Customer detail UI shows server pagination', customerLedgerUi.includes('صفحه‌بندی دفتر حساب مشتری') && customerLedgerUi.includes('ledgerTotalPages'));
expect('Customer ledger refresh is scoped', customerLedgerUi.includes('fetchCustomerLedgerDirectory(true, true, ledgerPage)'));
expect('Print fetches full ledger in chunks', customerController.includes("pageSize: '100'") && customerController.includes('fetchAllLedgerRowsForPrint'));
expect('Print view renders full fetched rows', customerPrint.includes('printableLedger') && customerPrint.includes('ledgerPrintRows'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.label}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
