import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`FAIL management-directory-reference: ${message}`);
  process.exitCode = 1;
};

const directory = read('components/ui/ManagementDirectory.tsx');
const table = read('components/ui/ManagementDirectoryTable.tsx');
const toolbar = read('components/ui/ManagementDirectoryToolbar.tsx');
const pagination = read('components/ui/ManagementDirectoryPagination.tsx');
const customers = read('pages/Customers.tsx');
const partners = read('components/people/PartnerDirectoryList.tsx');
const repairs = read('pages/Repairs.tsx');

for (const token of ['ManagementDirectoryHero', 'ManagementKpiGrid', 'ManagementFilterSurface', 'ManagementListSurface']) {
  if (!directory.includes(`export const ${token}`)) fail(`shared primitive ${token} is missing`);
}

for (const token of [
  'overflow-hidden rounded-2xl border border-slate-200 bg-white',
  'overflow-x-auto overscroll-x-contain',
  'data-ui-table-layout="managed"',
  'data-ui-table-density="compact"',
  'sticky end-0 z-20',
]) {
  if (!table.includes(token)) fail(`canonical management table contract missing: ${token}`);
}

if (!toolbar.includes('ManagementFilterSurface')) fail('canonical management toolbar must use ManagementFilterSurface');
if (!pagination.includes('data-ui-management-directory-pagination="shared"')) fail('canonical management pagination marker missing');

for (const [name, source] of [['Customers', customers], ['Partners', partners]]) {
  if (!source.includes('<ManagementDirectoryTable')) fail(`${name} must be a canonical table reference consumer`);
  if (!source.includes('MANAGEMENT_DIRECTORY_ROW_CLASS')) fail(`${name} must use the canonical management row contract`);
}

if (!repairs.includes('<ManagementDirectoryTable')) fail('Repairs must use the canonical Customers/Partners table standard');
if (!repairs.includes('<ManagementDirectoryToolbar')) fail('Repairs must use the canonical management toolbar');
if (repairs.includes('repair-mobile-card')) fail('Repairs must not cardify the comparison table on compact viewports');
if (repairs.includes('repairs-premium-table')) fail('Repairs legacy page-specific table contract must not return');

if (!process.exitCode) console.log('PASS management-directory-reference');
