import fs from 'node:fs';

const files = [
  'pages/Products.tsx',
  'pages/inventory/ProductsManager.tsx',
];

const mustContain = [
  'ManagementDirectoryPagination',
  'InventoryDeleteConfirmContent',
];

for (const file of files) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  for (const token of mustContain) {
    if (!source.includes(token)) {
      throw new Error(`${file} is missing required token: ${token}`);
    }
  }
}

const componentFile = fs.readFileSync(new URL('../components/inventory/InventoryDeleteConfirmContent.tsx', import.meta.url), 'utf8');
if (!componentFile.includes('عملیات غیرقابل بازگشت') || !componentFile.includes('حذف دائمی')) {
  throw new Error('InventoryDeleteConfirmContent does not contain the redesigned confirmation copy.');
}

console.log('audit-inventory-products-modal-pagination-v232: PASS');
