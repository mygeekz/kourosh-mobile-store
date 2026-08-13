import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`FAIL management-directory-reference: ${message}`);
  process.exitCode = 1;
};

const reference = read('components/ui/ManagementDirectory.tsx');
const pageKit = read('components/ui/PageKit.tsx');
const sales = read('pages/SalesHub.tsx');
const products = read('pages/Products.tsx');
const installments = read('pages/InstallmentSalesPage.tsx');

for (const token of ['ManagementDirectoryHero', 'ManagementKpiGrid', 'ManagementFilterSurface', 'ManagementListSurface']) {
  if (!reference.includes(`export const ${token}`)) fail(`shared primitive ${token} is missing`);
  if (!sales.includes(`<${token}`)) fail(`SalesHub must use ${token}`);
  if (!products.includes(`<${token}`)) fail(`Products must use ${token}`);
}

if (!pageKit.includes('hideAutoHeader?: boolean') || !pageKit.includes('hideAutoHeader={hideAutoHeader}')) {
  fail('PageKit must expose the shared hideAutoHeader contract instead of class-name workarounds');
}

for (const legacy of ['QuickActionCard', 'MetricTile', 'bg-gradient-to-', 'from-blue-', 'from-emerald-', 'from-violet-']) {
  if (sales.includes(legacy)) fail(`SalesHub legacy visual pattern returned: ${legacy}`);
}

for (const legacy of ['InventoryStatCard', 'FilterChipsBar', 'HubCard', 'products-commerce-control-row', 'products-commerce-local-search']) {
  if (products.includes(legacy)) fail(`Products legacy directory pattern returned: ${legacy}`);
}

if (!products.includes('data-ui-management-directory="products"')) fail('Products management directory marker missing');
if (!sales.includes('data-ui-management-directory="sales"')) fail('Sales management directory marker missing');

// The installment page remains the approved visual reference and must keep its semantic contract.
for (const token of ['نمای کلی فروش اقساطی', 'فهرست فروش اقساطی', 'data-ui-installment-directory="true"']) {
  if (!installments.includes(token)) fail(`Installment reference marker missing: ${token}`);
}

if (!process.exitCode) console.log('PASS management-directory-reference');
