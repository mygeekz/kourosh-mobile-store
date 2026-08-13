import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditedFiles = [
  'pages/SalesCartPage.tsx',
  'pages/InstallmentSalesPage.tsx',
  'pages/InstallmentSaleDetailPage.tsx',
  'pages/InvoiceDetail.tsx',
  'pages/InvoiceForm.tsx',
  'pages/Invoices.tsx',
  'pages/PublicInvoiceDetail.tsx',
  'pages/SalesHub.tsx',
  'components/CartTable.tsx',
  'components/CartSummary.tsx',
  'components/ServiceQuickSell.tsx',
  'components/SmartSalesAdvisor.tsx',
  'components/FilterChipsBar.tsx',
];

const failures = [];
for (const relativePath of auditedFiles) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');

  if (/<button\b/.test(source)) {
    failures.push(`${relativePath}: raw <button> is not allowed in the audited sales/installment UI scope.`);
  }

  if (/data-skip-global-buttons?=/.test(source)) {
    failures.push(`${relativePath}: global Button styling must not be bypassed.`);
  }

  const buttonBlocks = source.match(/<Button\b[\s\S]*?(?:\/>|<\/Button>)/g) ?? [];
  buttonBlocks.forEach((block, index) => {
    const label = `${relativePath}: Button #${index + 1}`;
    if (!/\bvariant=/.test(block)) failures.push(`${label} must declare a central variant.`);
    if (/\bunstyled\b/.test(block)) failures.push(`${label} must not use unstyled.`);
    if (/\bstyle=\{\{/.test(block)) failures.push(`${label} must not use inline visual styles.`);
    if (/sales-clear-cart-btn|sales-risk-switch-cash-btn|finance-table-action--(?:danger|edit|history|payment)/.test(block)) {
      failures.push(`${label} still depends on a page-level button style.`);
    }
  });
}

if (failures.length) {
  console.error('Sales/installment button contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Sales/installment button contract audit passed: ${auditedFiles.length} files use central Button variants only.`);
