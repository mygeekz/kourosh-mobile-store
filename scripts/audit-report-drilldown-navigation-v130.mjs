import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const nav = read('utils/navigationReturnContext.ts');
const hook = read('hooks/useReportDrilldownNavigation.ts');
const panel = read('components/ui/PanelCard.tsx');
const table = read('components/ui/DataTableShell.tsx');

expect('Report drilldown has a typed return UI state', nav.includes("kind: 'report-drilldown'") && nav.includes('reportKey: string') && nav.includes('state: Record<string, unknown>'));
expect('Nested return records keep a parent id', nav.includes('parentReturnId?: string'));
expect('Origin navctx is preserved only while the parent record is valid', nav.includes('preserveValidParentReturnParam') && nav.includes('readNavigationReturnRecordById(parentReturnId)'));
expect('A stale parent navctx is removed instead of chained', nav.includes('params.delete(NAVIGATION_RETURN_QUERY_KEY)'));
expect('New target navctx is still sanitized before capture', nav.includes('const cleanTargetPath = stripNavigationReturnParam(targetPath)'));
expect('Captured origin keeps the valid parent query chain', nav.includes('const cleanOriginPath = originWithParent.path'));
expect('Captured record persists parentReturnId', nav.includes('parentReturnId: originWithParent.parentReturnId'));

expect('Report hook reads explicit return-restore state', hook.includes('getNavigationReturnRestoreRecord(location.state)'));
expect('Report hook validates report kind and exact report key', hook.includes("reportState.kind !== 'report-drilldown'") && hook.includes('reportState.reportKey !== reportKey'));
expect('Report hook avoids applying the same restore twice', hook.includes('appliedRestoreIdRef.current === record.id'));
expect('Report hook captures current pathname/search/hash', hook.includes('`${location.pathname}${location.search}${location.hash}`'));
expect('Report hook stores the report UI snapshot', hook.includes("kind: 'report-drilldown'") && hook.includes('state: uiState'));
expect('Report hook captures closest row/card anchor', hook.includes("closest<HTMLElement>('[data-navigation-anchor]')"));
expect('Report hook preserves native modifier-click/new-tab behavior', hook.includes('event.metaKey') && hook.includes('event.ctrlKey') && hook.includes('event.shiftKey') && hook.includes('event.altKey'));
expect('Report hook prevents only handled primary navigation', hook.includes('event.button !== 0') && hook.includes('event.preventDefault()'));

expect('PanelCard accepts native section attributes for report anchors', panel.includes("React.HTMLAttributes<HTMLElement>") && panel.includes('{...sectionProps}'));
expect('DataTableShell accepts row props for report anchors', table.includes('getRowProps?:') && table.includes('{...(getRowProps ? getRowProps(row, rowIndex) : {})}'));

const reports = [
  ['DebtorsReport.tsx', 'debtors'],
  ['CreditorsReport.tsx', 'creditors'],
  ['TopCustomersReport.tsx', 'top-customers'],
  ['TopSuppliersReport.tsx', 'top-suppliers'],
  ['PhoneSalesReport.tsx', 'phone-sales'],
  ['PhoneInstallmentSalesReport.tsx', 'phone-installment-sales'],
  ['RfmReport.tsx', 'rfm'],
  ['AgingReceivablesReport.tsx', 'aging-receivables'],
  ['FollowupsReport.tsx', 'followups'],
  ['ManagerCreditApprovalsReport.tsx', 'manager-credit-approvals'],
  ['SalesRiskDecisionsReport.tsx', 'sales-risk-decisions'],
  ['InstallmentsCalendar.tsx', 'installments-calendar'],
  ['CollectionFollowupCenter.tsx', 'collection-center'],
  ['RealizedProfitReport.tsx', 'realized-profit'],
  ['FinancialOverview.tsx', 'financial-overview'],
  ['ProductSalesReport.tsx', 'product-sales'],
  ['CompareSales.tsx', 'periodic-comparison'],
  ['AbcAnalysisReport.tsx', 'abc-analysis'],
  ['DeadStockReport.tsx', 'dead-stock'],
  ['FinancialAuditReport.tsx', 'financial-audit'],
  ['InventoryTurnoverReport.tsx', 'inventory-turnover'],
  ['SalesReport.tsx', 'sales-summary'],
];

for (const [file, key] of reports) {
  const src = read(`pages/reports/${file}`);
  expect(`${file} uses the shared report drilldown hook`, src.includes('useReportDrilldownNavigation'));
  expect(`${file} has a stable report key`, src.includes(`reportKey: '${key}'`));
  expect(`${file} captures a navigation anchor`, src.includes('reportNavigationAnchor'));
}

const debtors = read('pages/reports/DebtorsReport.tsx');
expect('Debtors restore search, page size and exact page', debtors.includes('searchQuery') && debtors.includes('pageSize') && debtors.includes('pageIndex'));
expect('Debtors customer/source drilldowns use return context', debtors.includes('onDrilldownClick'));

const creditors = read('pages/reports/CreditorsReport.tsx');
expect('Creditors restore search and pagination', creditors.includes('searchQuery') && creditors.includes('pageSize') && creditors.includes('pageIndex'));
expect('Creditors partner and root-document links use return context', creditors.includes('partnerLedgerPath(row.id)') && creditors.includes('reportSourcePath(row.sourceUrl)') && creditors.includes('onDrilldownClick'));

const topCustomers = read('pages/reports/TopCustomersReport.tsx');
expect('Top customers restore dates/search/pagination', topCustomers.includes('startDate:') && topCustomers.includes('endDate:') && topCustomers.includes('searchQuery') && topCustomers.includes('pageIndex'));
expect('Top customers preserve the restored page through async reload', topCustomers.includes('pendingRestorePageRef'));

const topSuppliers = read('pages/reports/TopSuppliersReport.tsx');
expect('Top suppliers restore dates/search/pagination', topSuppliers.includes('startDate:') && topSuppliers.includes('endDate:') && topSuppliers.includes('searchQuery') && topSuppliers.includes('pageIndex'));
expect('Top suppliers no longer reset restored page inside fetch', !topSuppliers.includes('setTopSuppliers(Array.isArray(json.data) ? json.data : []);\n      setPageIndex(0);'));

const phoneSales = read('pages/reports/PhoneSalesReport.tsx');
expect('Cash phone sales restore dates/search/pagination', phoneSales.includes('startDate:') && phoneSales.includes('endDate:') && phoneSales.includes('searchQuery') && phoneSales.includes('pageIndex'));
expect('Cash phone sales refetch when restored dates change', phoneSales.includes('}, [startDate, endDate]);'));

const phoneInstallments = read('pages/reports/PhoneInstallmentSalesReport.tsx');
expect('Installment phone sales restore dates/search/pagination', phoneInstallments.includes('startDate:') && phoneInstallments.includes('endDate:') && phoneInstallments.includes('searchQuery') && phoneInstallments.includes('pageIndex'));
expect('Installment phone sales refetch when restored dates change', phoneInstallments.includes('}, [token, startDate, endDate]);'));

const rfm = read('pages/reports/RfmReport.tsx');
expect('RFM restore includes segment/search/pagination', rfm.includes('activeSegment') && rfm.includes('searchQuery') && rfm.includes('pageIndex'));

const collection = read('pages/reports/CollectionFollowupCenter.tsx');
expect('Collection center restores filters/view and selected drawer', collection.includes('onlyUntouched') && collection.includes('viewMode') && collection.includes('selectedItemId'));
expect('Collection center reopens selected drawer after async rows load', collection.includes('pendingSelectedIdRef'));

const followups = read('pages/reports/FollowupsReport.tsx');
expect('Followups restore operational filters and pagination', followups.includes('status,') && followups.includes('dateField,') && followups.includes('owner,') && followups.includes('onlyMine,') && followups.includes('currentPage'));

const realized = read('pages/reports/RealizedProfitReport.tsx');
expect('Realized profit restores expanded document rows', realized.includes('expandedDocKeys') && realized.includes('setExpandedDocKeys'));
expect('Realized profit document subject delegates drilldown navigation', realized.includes('onOpen?.(event, href)'));

const productSales = read('pages/reports/ProductSalesReport.tsx');
expect('Product sales restore dates/audit/page/drawers', productSales.includes('auditMode') && productSales.includes('detailsPage') && productSales.includes('healthDrawerOpen') && productSales.includes('riskDrawerOpen'));
expect('Product sales audit restore only accepts published audit modes', productSales.includes("['all', 'item', 'invoice'].includes(restoredAudit)") && !productSales.includes("['all', 'discounted', 'item', 'invoice'].includes(restoredAudit)"));

const compare = read('pages/reports/CompareSales.tsx');
expect('Periodic comparison restores date baseline and open detail modal state', compare.includes('baseline') && compare.includes('detailsOpen') && compare.includes('detailsRows'));

const deadStock = read('pages/reports/DeadStockReport.tsx');
expect('Dead-stock restores threshold/search/pagination', deadStock.includes('days,') && deadStock.includes('query,') && deadStock.includes('pageSize') && deadStock.includes('pageIndex'));

const audit = read('pages/reports/FinancialAuditReport.tsx');
expect('Financial audit restores dates/severity/area', audit.includes('fromDate:') && audit.includes('toDate:') && audit.includes('severity,') && audit.includes('area,'));
expect('Financial audit report-to-report tracing uses return context', audit.includes('areaDrilldown[issue.area]') && audit.includes('onDrilldownClick'));

const turnover = read('pages/reports/InventoryTurnoverReport.tsx');
expect('Inventory turnover restores date range', turnover.includes('fromDate:') && turnover.includes('toDate:'));
expect('Inventory turnover report-to-report drilldowns keep origin context', turnover.includes("openDrilldown('/reports/dead-stock'") && turnover.includes("openDrilldown('/reports/abc'") && turnover.includes("openDrilldown('/reports/analysis/suggestions'"));

const sales = read('pages/reports/SalesReport.tsx');
expect('Sales summary has controlled table pagination for exact restore', sales.includes('tablePagination') && sales.includes('onPaginationChange: setTablePagination') && sales.includes('autoResetPageIndex: false'));
expect('Sales summary restores dates/search/page/page size', sales.includes('globalFilter') && sales.includes('pageIndex: Number(tablePagination.pageIndex') && sales.includes('pageSize: Number(tablePagination.pageSize'));
expect('Sales summary item rows expose exact anchors', sales.includes("reportNavigationAnchor('sales-summary', `${row.original.itemType}:${row.original.itemName}`)"));
expect('Sales summary report-to-report links use return context', sales.includes("onDrilldownClick(event, '/reports/financial-overview'") && sales.includes("onDrilldownClick(event, '/reports/product-sales'"));

const overview = read('pages/reports/FinancialOverview.tsx');
expect('Financial overview report-to-report drilldowns use the same return context', overview.includes("'/reports/product-sales'") && overview.includes("'/reports/financial-audit'") && overview.includes('onDrilldownClick'));

if (failures.length) {
  console.error(`Report drilldown navigation v130 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Report drilldown navigation v130 audit passed: ${checks}/${checks} checks.`);
