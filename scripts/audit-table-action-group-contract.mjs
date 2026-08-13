import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditedFiles = [
  'pages/Invoices.tsx',
  'pages/InstallmentSalesPage.tsx',
  'pages/InstallmentSaleDetailPage.tsx',
  'components/CartTable.tsx',
  'components/customers/CustomerRowActions.tsx',
  'components/people/PartnerDirectoryList.tsx',
  'pages/Repairs.tsx',
  'pages/Products.tsx',
  'pages/mobilePhones/MobilePhonesMainWorkspace.tsx',
  'pages/Expenses.tsx',
  'pages/Purchases.tsx',
  'pages/InvoiceDetail.tsx',
  'pages/customerDetail/CustomerLedgerRenderSection.tsx',
  'pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx',
  'pages/partnerDetail/PartnerPurchaseHistorySection.tsx',
  'pages/StockCounts.tsx',
  'pages/inventoryPro/InventoryProPage.tsx',
  'pages/AuditLog.tsx',
  'pages/settings/SettingsUsersPanel.tsx',
  'components/reports/OfflineEvaluationComparisonDashboard.tsx',
];

const failures = [];
for (const relativePath of auditedFiles) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (!/TableActionGroup/.test(source)) {
    failures.push(`${relativePath}: row operations must use TableActionGroup.`);
  }
  if (/installment-table-actions|sales-line-actions|partners-actions|phone-table-inline-actions|inventory-table-row-actions|product-management-row-actions|settings-users-row-actions|audit-detail-button/.test(source)) {
    failures.push(`${relativePath}: legacy page-level action wrappers must be removed.`);
  }
  if (/<div\b[^>]*>\s*(?:<ActionLink|<Button)[\s\S]{0,900}?size="tableIcon"[\s\S]{0,900}?(?:<ActionLink|<Button)[\s\S]{0,300}?size="tableIcon"/m.test(source)) {
    failures.push(`${relativePath}: compact row-action clusters must be represented by TableActionGroup.`);
  }
}

const componentPath = path.join(root, 'components/ui/TableActionGroup.tsx');
if (!fs.existsSync(componentPath)) {
  failures.push('components/ui/TableActionGroup.tsx is missing.');
} else {
  const source = fs.readFileSync(componentPath, 'utf8');
  const requiredSignals = [
    /data-ui-table-action-group="true"/,
    /data-ui-table-action-control/,
    /fa-ellipsis/,
    /PortalLayer/,
    /role="menu"/,
    /collapseBelow/,
    /ActionLink/,
    /Button/,
  ];
  requiredSignals.forEach((signal) => {
    if (!signal.test(source)) failures.push(`TableActionGroup is missing contract signal ${signal}.`);
  });
  if (/<button\b/.test(source)) {
    failures.push('TableActionGroup must use the central Button component rather than raw buttons.');
  }
  if (/data-no-tooltip=["']true["']/.test(source)) {
    failures.push('TableActionGroup inline actions must keep the canonical tooltip layer enabled.');
  }
  if (!/tooltip:\s*action\.tooltip\s*\?\?\s*action\.label/.test(source)) {
    failures.push('TableActionGroup must forward every action tooltip to the central action controls.');
  }
}


const tableActionCssPath = path.join(root, 'styles/system/table-actions-foundation.css');
if (!fs.existsSync(tableActionCssPath)) {
  failures.push('styles/system/table-actions-foundation.css is missing.');
} else {
  const css = fs.readFileSync(tableActionCssPath, 'utf8');
  const requiredCssSignals = [
    /\[data-ui-table-action-control="true"\]/,
    /background:\s*transparent\s*!important/,
    /box-shadow:\s*none\s*!important/,
    /border-radius:\s*0\s*!important/,
  ];
  requiredCssSignals.forEach((signal) => {
    if (!signal.test(css)) failures.push(`TableActionGroup CSS is missing bare-control contract ${signal}.`);
  });
}


const tableCardContractPath = path.join(root, 'styles/system/ui-contracts/table-card-contract-phase6.css');
if (!fs.existsSync(tableCardContractPath)) {
  failures.push('styles/system/ui-contracts/table-card-contract-phase6.css is missing.');
} else {
  const css = fs.readFileSync(tableCardContractPath, 'utf8');
  const exemptions = [
    /\.ux-table-shell button:not\(\[data-ui-table-action-control="true"\]\)/,
    /\.report-data-table button:not\(\[data-ui-table-action-control="true"\]\)/,
  ];
  exemptions.forEach((signal) => {
    if (!signal.test(css)) failures.push(`Generic table button contract must exempt canonical row actions: ${signal}.`);
  });
}

const barrel = fs.readFileSync(path.join(root, 'components/ui/index.ts'), 'utf8');
if (!/TableActionGroup/.test(barrel)) failures.push('components/ui/index.ts must export TableActionGroup.');

if (failures.length) {
  console.error('TableActionGroup contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`TableActionGroup contract audit passed: ${auditedFiles.length} sales, purchase, return, expense, ledger, customer, partner, repair, stock-count, audit-log, user-management and inventory-adjustment surfaces use the central responsive row-action primitive.`);
