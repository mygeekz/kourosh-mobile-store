#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetFiles = [
  'components/reports/PremiumDataTable.tsx',
  'pages/reports/InstallmentsCalendar.tsx',
  'pages/reports/FollowupsReport.tsx',
  'pages/reports/SalesReport.tsx',
  'pages/reports/CollectionFollowupCenter.tsx',
  'components/reports/mlWorkbenchImportDashboard/MetadataImportAnnotationSearchPanel.tsx',
  'components/reports/mlWorkbenchImportDashboard/MetadataImportAnnotationPanel.tsx',
  'components/reports/mlOperator/MlOperatorFilterToolbar.tsx',
];

const totals = {
  TextField: 0,
  AppSearchField: 0,
  SelectField: 0,
  CheckboxField: 0,
  nativeInput: 0,
  nativeSelect: 0,
  nativeTextarea: 0,
};

for (const file of targetFiles) {
  const absolute = path.resolve(root, file);
  assert.ok(fs.existsSync(absolute), `Missing guarded report/tooling file: ${file}`);
  const source = fs.readFileSync(absolute, 'utf8');

  totals.TextField += (source.match(/<TextField\b/g) ?? []).length;
  totals.AppSearchField += (source.match(/<AppSearchField\b/g) ?? []).length;
  totals.SelectField += (source.match(/<SelectField\b/g) ?? []).length;
  totals.CheckboxField += (source.match(/<CheckboxField\b/g) ?? []).length;
  totals.nativeInput += (source.match(/<input\b/g) ?? []).length;
  totals.nativeSelect += (source.match(/<select\b/g) ?? []).length;
  totals.nativeTextarea += (source.match(/<textarea\b/g) ?? []).length;

  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*components\/ui\/(?:TextField|SelectField|CheckboxField)["']/,
    `${file} imports a primitive directly instead of the canonical @/components/ui barrel.`,
  );
}

assert.equal(totals.nativeInput, 0, `Guarded report/tooling files must not render native input elements; found ${totals.nativeInput}.`);
assert.equal(totals.nativeSelect, 0, `Guarded report/tooling files must not render native select elements; found ${totals.nativeSelect}.`);
assert.equal(totals.nativeTextarea, 0, `Guarded report/tooling files must not render native textarea elements; found ${totals.nativeTextarea}.`);
assert.ok(totals.TextField >= 9, `Expected at least 9 TextField consumers after Collection Center search migration; found ${totals.TextField}.`);
assert.ok(totals.AppSearchField >= 2, `Expected PremiumDataTable and Collection Center to use AppSearchField; found ${totals.AppSearchField}.`);
assert.ok(totals.SelectField >= 12, `Expected at least 12 SelectField consumers; found ${totals.SelectField}.`);
assert.ok(totals.CheckboxField >= 5, `Expected at least 5 CheckboxField consumers after Collection Center migration; found ${totals.CheckboxField}.`);

const premiumTable = fs.readFileSync(path.resolve(root, 'components/reports/PremiumDataTable.tsx'), 'utf8');
assert.match(premiumTable, /el\.indeterminate\s*=/, 'PremiumDataTable must preserve indeterminate select-all behavior.');
assert.match(premiumTable, /data-ui-table-checkbox="true"/, 'PremiumDataTable must preserve table checkbox hooks.');
assert.match(premiumTable, /<DataTableShell\b/, 'PremiumDataTable must use the canonical DataTableShell.');
assert.match(premiumTable, /<ColumnPicker\b/, 'PremiumDataTable must use the canonical ColumnPicker.');
assert.match(premiumTable, /<AppSearchField\b/, 'PremiumDataTable must use the canonical AppSearchField.');
assert.match(premiumTable, /<Button\b/, 'PremiumDataTable actions must use the canonical Button.');
assert.doesNotMatch(premiumTable, /<button\b/, 'PremiumDataTable must not render raw buttons.');
assert.doesNotMatch(premiumTable, /<details\b|<summary\b/, 'PremiumDataTable must not render a local details/summary column menu.');

const annotationSearch = fs.readFileSync(path.resolve(root, 'components/reports/mlWorkbenchImportDashboard/MetadataImportAnnotationSearchPanel.tsx'), 'utf8');
assert.match(annotationSearch, /<TextField[^>]*type="date"/, 'ML annotation date bounds must remain canonical date inputs.');

const reportControlDock = fs.readFileSync(path.resolve(root, 'components/reports/ReportControlDock.tsx'), 'utf8');
assert.match(reportControlDock, /<Surface\b/, 'ReportControlDock must own the canonical standalone report control surface.');
assert.match(reportControlDock, /<ResponsiveFilterBar\b/, 'ReportControlDock must delegate toolbar geometry to ResponsiveFilterBar.');
assert.match(reportControlDock, /data-ui-report-control-dock="true"/, 'ReportControlDock must expose the report control dock semantic hook.');
assert.doesNotMatch(reportControlDock, /<button\b|<input\b|<select\b|<textarea\b/, 'ReportControlDock must not render local raw controls.');

const salesProfitCenterFiles = [
  'pages/reports/AllSalesLedgerReport.tsx',
  'pages/reports/SalesReport.tsx',
  'pages/reports/ProductSalesReport.tsx',
  'pages/reports/CompareSales.tsx',
  'pages/reports/ProductProfitReal.tsx',
  'pages/reports/ProfitabilityReport.tsx',
];

for (const file of salesProfitCenterFiles) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDock\b/, `${file} must use the canonical ReportControlDock.`);
  assert.match(source, /presentation=["']approved["']/, `${file} must use the approved report-control presentation.`);
  assert.doesNotMatch(source, /className=["'][^"']*report-filter-grid/, `${file} must not own report filter grid geometry locally.`);
  assert.doesNotMatch(
    source,
    /report-exec-filter-card|product-sales-control-panel|product-profit-real-control-dock/,
    `${file} must not reintroduce a legacy report-control dock.`,
  );
}

for (const file of [
  'pages/reports/AllSalesLedgerReport.tsx',
  'pages/reports/SalesReport.tsx',
  'pages/reports/ProductSalesReport.tsx',
  'pages/reports/ProductProfitReal.tsx',
  'pages/reports/ProfitabilityReport.tsx',
]) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<DataTableShell\b/, `${file} must use the canonical DataTableShell for its primary report table.`);
  assert.match(source, /\bmeta=\{\(/, `${file} must place result/page metadata in the DataTableShell header meta slot.`);
}

for (const file of [
  'pages/reports/SalesReport.tsx',
  'pages/reports/ProductSalesReport.tsx',
  'pages/reports/CompareSales.tsx',
  'pages/reports/ProductProfitReal.tsx',
]) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDateSection\b/, `${file} must use the canonical approved date-range section.`);
}

const managerFinanceCenterFiles = [
  'pages/reports/FinancialOverview.tsx',
  'pages/reports/RealizedProfitReport.tsx',
  'pages/reports/CashflowReport.tsx',
];

const mobileSalesCenterFiles = [
  'pages/reports/PhoneSalesReport.tsx',
  'pages/reports/PhoneInstallmentSalesReport.tsx',
  'pages/reports/MobileSalesAnalytics.tsx',
];

for (const file of mobileSalesCenterFiles) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDock\b/, `${file} must use the canonical ReportControlDock.`);
  assert.match(source, /presentation=["']approved["']/, `${file} must use the approved report-control presentation.`);
  assert.match(source, /<ReportControlDateSection\b/, `${file} must use the canonical approved date-range section.`);
  assert.match(source, /<ReportControlSearch\b/, `${file} must place report search inside the canonical control dock.`);
  assert.doesNotMatch(
    source,
    /phone-sales-filter-panel|installment-sales-filter-panel|msa-control-panel/,
    `${file} must not reintroduce a legacy mobile-sales control dock.`,
  );
}


const integratedMobileAnalyticsSource = fs.readFileSync(path.resolve(root, 'pages/reports/MobileSalesAnalytics.tsx'), 'utf8');
const integratedMobileTableShellCount = (integratedMobileAnalyticsSource.match(/<DataTableShell\b/g) || []).length;
assert.ok(integratedMobileTableShellCount >= 4, 'MobileSalesAnalytics must use canonical DataTableShell for cash, installment, real-profit, and partner-capital tabs.');
assert.match(integratedMobileAnalyticsSource, /title=["']فروش‌های نقدی["']/, 'MobileSalesAnalytics cash tab must use a canonical table title.');
assert.match(integratedMobileAnalyticsSource, /title=["']فروش‌های اقساطی["']/, 'MobileSalesAnalytics installment tab must use a canonical table title.');
assert.match(integratedMobileAnalyticsSource, /title=["']سود جایگزینی با قیمت خرید روز["']/, 'MobileSalesAnalytics real-profit tab must use a canonical table title.');
assert.match(integratedMobileAnalyticsSource, /title=["']بازگشت سرمایه همکاران["']/, 'MobileSalesAnalytics partner-capital tab must use a canonical table title.');
assert.ok((integratedMobileAnalyticsSource.match(/\bmeta=\{\(/g) || []).length >= 4, 'MobileSalesAnalytics tabular reports must place visible-result metadata in DataTableShell meta slots.');
assert.ok((integratedMobileAnalyticsSource.match(/\bfooter=\{/g) || []).length >= 4, 'MobileSalesAnalytics tabular reports must place pagination in DataTableShell footers.');
assert.ok((integratedMobileAnalyticsSource.match(/hidden xl:block/g) || []).length >= 4, 'MobileSalesAnalytics tabular reports must use the canonical desktop table breakpoint.');
assert.ok((integratedMobileAnalyticsSource.match(/xl:hidden/g) || []).length >= 4, 'MobileSalesAnalytics tabular reports must provide responsive card views below desktop.');
assert.match(integratedMobileAnalyticsSource, /title="صف پیگیری اقساط"/, 'MobileSalesAnalytics risk tab must use the canonical SurfaceHeader title.');
assert.match(integratedMobileAnalyticsSource, /FinancialStatusBadge/, 'MobileSalesAnalytics risk tab must use the canonical financial status badge primitive.');
assert.match(integratedMobileAnalyticsSource, /مشاهده جزئیات/, 'MobileSalesAnalytics risk cards must expose an explicit canonical Button action.');
assert.match(integratedMobileAnalyticsSource, /<DialogShell[\s\S]*?layer="drawer"/, 'MobileSalesAnalytics risk detail must use the canonical DialogShell drawer.');
assert.doesNotMatch(integratedMobileAnalyticsSource, /className="msa-risk-row"/, 'MobileSalesAnalytics must not restore the legacy clickable risk-row control.');
assert.doesNotMatch(integratedMobileAnalyticsSource, /className="msa-drawer-backdrop/, 'MobileSalesAnalytics must not restore the legacy risk drawer backdrop.');
assert.match(integratedMobileAnalyticsSource, /<FilterChipsBar[\s\S]*?ariaLabel="بخش‌های تحلیل فروش گوشی"/, 'MobileSalesAnalytics tabs must use the canonical FilterChipsBar reference primitive.');
assert.doesNotMatch(integratedMobileAnalyticsSource, /className="msa-tabs"|className=\{`msa-tab/, 'MobileSalesAnalytics must not restore legacy msa tab controls.');
assert.match(integratedMobileAnalyticsSource, /<PremiumStatCard\s+label="فروش ثبت‌شده"/, 'MobileSalesAnalytics executive KPI row must use the canonical PremiumStatCard primitive.');
assert.match(integratedMobileAnalyticsSource, /<PremiumStatCard\s+label="همکاران دارای سرمایه"/, 'MobileSalesAnalytics partner-capital KPI row must use the canonical PremiumStatCard primitive.');
assert.doesNotMatch(integratedMobileAnalyticsSource, /function\s+KpiCard\b|<KpiCard\b/, 'MobileSalesAnalytics must not restore its legacy page-owned KpiCard component.');
assert.doesNotMatch(integratedMobileAnalyticsSource, /msa-kpi(?:__|--|-grid)/, 'MobileSalesAnalytics must not restore legacy msa KPI card or grid classes.');

assert.doesNotMatch(
  integratedMobileAnalyticsSource,
  /className=(?:["'][^"']*\bmsa-|\{[^}]*\bmsa-)/,
  'MobileSalesAnalytics must not restore page-owned msa-* styling classes after reference-surface migration.',
);
assert.match(integratedMobileAnalyticsSource, /<FinancialProgressBar\b/, 'MobileSalesAnalytics quality metrics must use the canonical FinancialProgressBar primitive.');
assert.match(integratedMobileAnalyticsSource, /title="ترکیب فروش و وصول"/, 'MobileSalesAnalytics overview must use the canonical SurfaceHeader for the sales mix panel.');
assert.match(integratedMobileAnalyticsSource, /title="کیفیت داده و وصول"/, 'MobileSalesAnalytics overview must use the canonical SurfaceHeader for the data quality panel.');
assert.equal(
  fs.existsSync(path.resolve(root, 'styles/system/reports-redesign/reports-stage85-mobile-sales-analytics-executive.css')),
  false,
  'MobileSalesAnalytics must not restore its retired page-owned Stage85 stylesheet.',
);

const reportModalVisualRegressionSource = fs.readFileSync(
  path.resolve(root, 'scripts/run-report-modals-visual-regression.mjs'),
  'utf8',
);
assert.doesNotMatch(reportModalVisualRegressionSource, /\.msa-tabs|\.msa-risk-row/, 'Report visual regression must not target removed MobileSalesAnalytics legacy selectors.');
assert.match(reportModalVisualRegressionSource, /\[data-ui-card-kind="risk-followup"\]/, 'Report visual regression must target the canonical MobileSalesAnalytics risk card hook.');
assert.match(reportModalVisualRegressionSource, /data-kourosh-overlay="mobile-sales-risk"/, 'Report visual regression must target the canonical DialogShell risk drawer overlay.');

for (const file of [
  'pages/reports/PhoneSalesReport.tsx',
  'pages/reports/PhoneInstallmentSalesReport.tsx',
]) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<DataTableShell\b/, `${file} must use the canonical DataTableShell for its primary report table.`);
  assert.match(source, /\bmeta=\{\(/, `${file} must place visible-result metadata in the DataTableShell header meta slot.`);
  assert.match(source, /\bfooter=\{/, `${file} must place pagination inside the DataTableShell footer slot.`);
  assert.match(source, /hidden xl:block/, `${file} must keep the desktop table view behind the canonical responsive breakpoint.`);
  assert.match(source, /xl:hidden/, `${file} must provide a responsive card view below the desktop breakpoint.`);
  assert.match(source, /<PanelCard\b/, `${file} summary KPIs must use the canonical PanelCard primitive.`);
  assert.match(source, /<SurfaceHeader\b/, `${file} summary and ranking sections must use the canonical SurfaceHeader primitive.`);
  assert.match(source, /<ActionLink\b/, `${file} row navigation must use the canonical ActionLink primitive.`);
  assert.match(source, /className=["']report-table ux-data-table["']/, `${file} desktop rows must use the shared report-table contract.`);
  assert.doesNotMatch(source, /<button\b/, `${file} pagination must use the canonical Button primitive.`);
  assert.doesNotMatch(
    source,
    /phone-sales-table-header|phone-sales-pagination|installment-sales-table-header|installment-sales-pagination/,
    `${file} must not reintroduce legacy table header or pagination wrappers.`,
  );
  assert.doesNotMatch(
    source,
    /className=(?:["'][^"']*\b(?:phone-sales|installment-sales)-|\{[^}]*\b(?:phone-sales|installment-sales)-)/,
    `${file} must not restore page-owned phone/installment sales styling classes.`,
  );
}

const retiredPhoneSalesStyles = [
  'styles/system/reports-redesign/reports-stage72-phone-sales-executive.css',
  'styles/system/reports-redesign/reports-stage73-phone-sales-polish-fixes.css',
  'styles/system/reports-redesign/reports-stage74-phone-sales-filter-financial-style.css',
  'styles/system/reports-redesign/reports-stage75-phone-sales-filter-box-cleanup.css',
  'styles/system/reports-redesign/reports-stage76-phone-sales-table-search-placement.css',
  'styles/system/reports-redesign/reports-stage77-phone-sales-table-tools-cleanup.css',
  'styles/system/reports-redesign/reports-stage82-phone-sales-search-final.css',
  'styles/system/reports-redesign/reports-stage83-phone-sales-table-tools-final.css',
  'styles/system/reports-redesign/reports-stage84-phone-installment-sales-executive.css',
];
for (const file of retiredPhoneSalesStyles) {
  assert.equal(
    fs.existsSync(path.resolve(root, file)),
    false,
    `${file} is retired; cash/installment phone sales must use shared UI primitives without page-owned runtime CSS.`,
  );
}

for (const file of managerFinanceCenterFiles) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDock\b/, `${file} must use the canonical ReportControlDock.`);
  assert.match(source, /presentation=["']approved["']/, `${file} must use the approved report-control presentation.`);
  assert.match(source, /<ReportControlDateSection\b/, `${file} must use the canonical approved date-range section.`);
  assert.match(source, /<PanelCard\b/, `${file} must use the canonical PanelCard for manager-finance content surfaces.`);
  assert.match(source, /<PanelCard\s+variant=["']metric["']/, `${file} manager-finance KPIs must use the canonical PanelCard metric variant.`);
  assert.doesNotMatch(source, /PremiumStatCard/, `${file} must not add new consumers of the retired PremiumStatCard adapter.`);
  assert.doesNotMatch(
    source,
    /fo-executive-filter-card|realized-profit-live-filter|cashflow-filter-panel__body|cashflow-control-dock/,
    `${file} must not reintroduce a legacy manager-finance control dock.`,
  );
}

const financialOverviewSource = fs.readFileSync(path.resolve(root, 'pages/reports/FinancialOverview.tsx'), 'utf8');
assert.match(financialOverviewSource, /<ActionLink\b/, 'FinancialOverview debtor/creditor navigation must use the canonical ActionLink primitive.');
assert.doesNotMatch(
  financialOverviewSource,
  /className=(?:["'][^"']*\b(?:fo-|financial-overview-redesign-v1|financial-overview-stage27-shell|reports-financial-redesign-v1)|\{[^}]*\b(?:fo-|financial-overview-redesign-v1|financial-overview-stage27-shell|reports-financial-redesign-v1))/,
  'FinancialOverview must not restore page-owned legacy financial-overview styling classes.',
);

const realizedProfitSource = fs.readFileSync(path.resolve(root, 'pages/reports/RealizedProfitReport.tsx'), 'utf8');
assert.doesNotMatch(
  realizedProfitSource,
  /className=(?:["'][^"']*\brealized-profit-|\{[^}]*\brealized-profit-)/,
  'RealizedProfitReport must not restore page-owned realized-profit-* styling classes.',
);

const cashflowSource = fs.readFileSync(path.resolve(root, 'pages/reports/CashflowReport.tsx'), 'utf8');
assert.doesNotMatch(
  cashflowSource,
  /className=(?:["'][^"']*\b(?:cashflow-|reports-financial-redesign-v1)|\{[^}]*\b(?:cashflow-|reports-financial-redesign-v1))/,
  'CashflowReport must not restore page-owned cashflow styling classes.',
);
assert.match(financialOverviewSource, /data-manager-profit-section=["']true["']/, 'FinancialOverview must expose a semantic manager-profit section hook for regression checks.');
assert.match(realizedProfitSource, /data-realized-profit-documents=["']true["']/, 'RealizedProfitReport must expose a semantic documents section hook for regression checks.');

const reportCentersRuntimeSource = fs.readFileSync(path.resolve(root, 'scripts/test-report-centers-responsive-runtime.mjs'), 'utf8');
assert.doesNotMatch(reportCentersRuntimeSource, /\.fo-realized-section|\.fo-metric-card|\.fo-compact-metric|\.realized-profit-docs-panel/, 'Manager-finance runtime regression tests must target semantic/canonical hooks instead of retired page-owned classes.');
assert.match(reportCentersRuntimeSource, /data-manager-profit-primary/, 'Manager-finance runtime regression must target the semantic profit-card hook.');
assert.match(reportCentersRuntimeSource, /data-realized-profit-documents/, 'Realized-profit runtime regression must target the semantic document-section hook.');

const managerFinanceVisualRegressionSource = fs.readFileSync(path.resolve(root, 'scripts/run-report-modals-visual-regression.mjs'), 'utf8');
assert.doesNotMatch(managerFinanceVisualRegressionSource, /\.fo-realized-section/, 'Manager-finance visual regression must not target retired financial-overview selectors.');
assert.match(managerFinanceVisualRegressionSource, /data-manager-profit-section/, 'Manager-finance visual regression must wait on the semantic manager-profit section hook.');

const managerFinanceSharedStyleFiles = [
  'styles/system/finance-tables-foundation.css',
  'styles/system/reports-filter-kpi-foundation.css',
  'styles/system/reports-redesign/reports-redesign-pass-4.css',
  'styles/system/reports-redesign/reports-stage236-risk-profit-live.css',
  'styles/system/reports-redesign/reports-stage27-financial-aging-workspace-fixes.css',
  'styles/system/reports-redesign/reports-stage29-calendar-kpi-cleanup.css',
  'styles/system/reports-redesign/reports-stage30-kpi-text-highlight-cleanup.css',
  'styles/system/reports-risk-cashflow-foundation.css',
];
for (const file of managerFinanceSharedStyleFiles) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.doesNotMatch(
    source,
    /\.(?:fo-|financial-overview-redesign-v1\b|financial-overview-stage27-shell\b|reports-financial-redesign-v1\b|realized-profit-|cashflow-|cashflow-report\b|report-basis-badge--(?:realized-profit|cashflow)\b)/,
    `${file} must not retain retired manager-finance page selectors after the shared-style dependency sweep.`,
  );
}

const retiredManagerFinanceStyles = [
  'styles/system/reports-redesign/reports-redesign-pass-3.css',
  'styles/system/reports-redesign/reports-stage28-financial-overview-executive.css',
  'styles/system/reports-redesign/reports-stage31-financial-metric-card-clean.css',
  'styles/system/reports-redesign/reports-stage128-realized-profit-executive.css',
  'styles/system/reports-redesign/reports-stage129-realized-profit-date-row-fix.css',
  'styles/system/reports-redesign/reports-stage130-cashflow-executive.css',
  'styles/system/reports-redesign/reports-stage131-cashflow-filter-row-fix.css',
  'styles/system/reports-redesign/reports-stage132-cashflow-premium-control-dock.css',
  'styles/system/reports-redesign/reports-stage133-cashflow-date-double-box-fix.css',
];
for (const file of retiredManagerFinanceStyles) {
  assert.equal(
    fs.existsSync(path.resolve(root, file)),
    false,
    `${file} is retired; the manager-finance center must use shared UI primitives without page-owned runtime CSS.`,
  );
}


const financialOperationsSweep = [
  'pages/reports/FinancialAuditReport.tsx',
  'pages/reports/AgingReceivablesReport.tsx',
  'pages/reports/CollectionFollowupCenter.tsx',
];
for (const file of financialOperationsSweep) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDock\b/, `${file} must use the canonical ReportControlDock.`);
  assert.match(source, /presentation=["']approved["']/, `${file} must use the approved report-control presentation.`);
  assert.match(source, /<PanelCard\b/, `${file} must use canonical PanelCard surfaces.`);
  assert.doesNotMatch(source, /<button\b/, `${file} must not render raw buttons after the financial-operations sweep.`);
}

const financialAuditSource = fs.readFileSync(path.resolve(root, 'pages/reports/FinancialAuditReport.tsx'), 'utf8');
assert.match(financialAuditSource, /<ReportControlDateSection\b/, 'FinancialAuditReport must use the approved date-range section.');
assert.match(financialAuditSource, /<DataTableShell\b/, 'FinancialAuditReport must use canonical DataTableShell.');
assert.match(financialAuditSource, /<FinancialStatusBadge\b/, 'FinancialAuditReport severity must use FinancialStatusBadge.');
assert.match(financialAuditSource, /<ActionLink\b/, 'FinancialAuditReport drill-down navigation must use ActionLink.');
assert.doesNotMatch(financialAuditSource, /financial-audit-(?:compact-page|hero|kpi|table|filter|panel)/, 'FinancialAuditReport must not restore retired page-owned financial-audit classes.');

const agingReceivablesSource = fs.readFileSync(path.resolve(root, 'pages/reports/AgingReceivablesReport.tsx'), 'utf8');
assert.match(agingReceivablesSource, /<DataTableShell\b/, 'AgingReceivablesReport must use canonical DataTableShell.');
assert.match(agingReceivablesSource, /مبنای گزارش: وضعیت جاری مطالبات/, 'AgingReceivablesReport must state its current-snapshot accounting basis.');
assert.doesNotMatch(agingReceivablesSource, /<ReportControlDateSection\b/, 'AgingReceivablesReport must not fabricate a date-range filter for a snapshot backend endpoint.');
assert.doesNotMatch(agingReceivablesSource, /aging-receivables__/, 'AgingReceivablesReport must not restore retired page-owned aging selectors.');

const collectionCenterSource = fs.readFileSync(path.resolve(root, 'pages/reports/CollectionFollowupCenter.tsx'), 'utf8');
assert.match(collectionCenterSource, /<ReportControlDateSection\b/, 'CollectionFollowupCenter must use the approved date-range section.');
assert.match(collectionCenterSource, /<ReportControlSearch\b/, 'CollectionFollowupCenter must place search in the approved control dock.');
assert.match(collectionCenterSource, /<AppSearchField\b/, 'CollectionFollowupCenter search must use AppSearchField.');
assert.match(collectionCenterSource, /<CheckboxField\b/, 'CollectionFollowupCenter untouched-today filter must use CheckboxField.');
assert.match(collectionCenterSource, /<FilterChipsBar\b/, 'CollectionFollowupCenter risk/view choices must use FilterChipsBar.');
assert.match(collectionCenterSource, /<DialogShell[\s\S]*?layer="drawer"/, 'CollectionFollowupCenter detail must use the canonical DialogShell drawer.');
assert.match(collectionCenterSource, /<ActionLink\b/, 'CollectionFollowupCenter document/customer navigation must use ActionLink.');
assert.doesNotMatch(collectionCenterSource, /collection-center-|collection-kanban-|collection-action-link|collection-selectable-card/, 'CollectionFollowupCenter must not restore retired page-owned collection styling classes.');
assert.doesNotMatch(collectionCenterSource, /createPortal|from ['"]react-dom['"]/, 'CollectionFollowupCenter must not restore its manual portal drawer.');

const retiredFinancialOperationsStyles = [
  'styles/system/reports-redesign/aging-receivables-stage21-commercial.css',
  'styles/system/reports-redesign/reports-stage134-financial-audit-executive.css',
  'styles/system/reports-redesign/reports-stage87-collection-header-compact.css',
  'styles/system/reports-redesign/reports-stage88-collection-header-layout-v2.css',
  'styles/system/reports-redesign/reports-stage89-collection-search-single-frame.css',
  'styles/system/reports-redesign/reports-stage90-collection-kanban-dnd-fix.css',
  'styles/system/reports-redesign/reports-stage180-collection-followup-persistence-fix.css',
  'styles/system/reports-redesign/reports-stage181-collection-actions-root-fix.css',
  'styles/system/legacy-quarantine/collection-cleanup-foundation.css',
];
for (const file of retiredFinancialOperationsStyles) {
  assert.equal(fs.existsSync(path.resolve(root, file)), false, `${file} is retired after the financial audit / aging / collection dependency sweep.`);
}

const financialOperationsCssFiles = fs.readdirSync(path.resolve(root, 'styles'), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => path.join(entry.parentPath || entry.path, entry.name));
for (const absolute of financialOperationsCssFiles) {
  const source = fs.readFileSync(absolute, 'utf8');
  assert.doesNotMatch(
    source,
    /\.(?:aging-receivables__|collection-center-|collection-action-link\b|collection-selectable-card\b|collection-kanban-)/,
    `${path.relative(root, absolute)} must not retain retired aging/collection selectors.`,
  );
}

const pageShellSource = fs.readFileSync(path.resolve(root, 'components/ui/PageShell.tsx'), 'utf8');
assert.doesNotMatch(pageShellSource, /financial-audit-compact-page/, 'PageShell must not retain the retired financial-audit page-class exception.');

for (const file of [
  'components/reports/ModernTableTools.tsx',
  'components/reports/PremiumDataTable.tsx',
]) {
  const source = fs.readFileSync(path.resolve(root, file), 'utf8');
  assert.match(source, /<ReportControlDock\b/, `${file} must use the canonical ReportControlDock.`);
  assert.doesNotMatch(source, /className=["'][^"']*report-filter-grid/, `${file} must not own report filter grid geometry locally.`);
}

console.log(JSON.stringify({
  status: 'passed',
  scannedFiles: targetFiles.length,
  canonicalUsages: {
    text: totals.TextField,
    search: totals.AppSearchField,
    select: totals.SelectField,
    checkbox: totals.CheckboxField,
  },
  remainingNativeControls: {
    input: totals.nativeInput,
    select: totals.nativeSelect,
    textarea: totals.nativeTextarea,
  },
  policy: 'Sales & Profit, Manager Finance, Mobile Sales, Financial Audit, Aging Receivables, and Collection Center use approved/shared report primitives; retired page-owned financial-operations CSS cannot return.',
}, null, 2));
