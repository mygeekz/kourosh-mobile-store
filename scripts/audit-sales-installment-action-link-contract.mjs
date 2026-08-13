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

  if (/<Link\b[\s\S]*?className=["'][^"']*(?:finance-table-action|ux-btn-table-icon)[^"']*["']/m.test(source)) {
    failures.push(`${relativePath}: operational router links must use the central ActionLink component.`);
  }

  const actionLinkBlocks = source.match(/<ActionLink\b[\s\S]*?(?:\/>|<\/ActionLink>)/g) ?? [];
  actionLinkBlocks.forEach((block, index) => {
    const label = `${relativePath}: ActionLink #${index + 1}`;
    if (!/\bvariant=/.test(block)) failures.push(`${label} must declare a central variant.`);
    if (!/\bsize=/.test(block)) failures.push(`${label} must declare a central size.`);
    if (/\n\s+className=/.test(block)) failures.push(`${label} must not depend on page-level visual classes.`);
    if (/\n\s+style=\{\{/.test(block)) failures.push(`${label} must not use inline visual styles.`);
  });

  const operationalLinkBlocks = source.match(/<Link\b[\s\S]*?<\/Link>/g) ?? [];
  operationalLinkBlocks.forEach((block, index) => {
    if (/(مشاهده\s*(?:فاکتور|قرارداد|همه)?|چاپ\s*(?:رسید)?|ثبت\s*قسط|پرداخت\s*بعدی|پرونده\s*مشتری)/.test(block)) {
      failures.push(`${relativePath}: Link #${index + 1} is an operational action and must use ActionLink.`);
    }
  });
}

const actionLinkSource = fs.readFileSync(path.join(root, 'components/ui/ActionLink.tsx'), 'utf8');
if (!/actionControlVariantClassMap\[variant\]/.test(actionLinkSource)
  || !/actionControlSizeClassMap\[size\]/.test(actionLinkSource)) {
  failures.push('components/ui/ActionLink.tsx must consume the same central variant and size contract as Button.');
}

if (failures.length) {
  console.error('Sales/installment ActionLink contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Sales/installment ActionLink contract audit passed: ${auditedFiles.length} files use the central ActionLink contract for operational navigation.`);
