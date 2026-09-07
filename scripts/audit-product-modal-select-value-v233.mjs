import fs from 'node:fs';

const shared = fs.readFileSync(new URL('../components/ui/SearchableSelectField.tsx', import.meta.url), 'utf8');
for (const token of [
  "const hasTypedValue = Boolean(state.selectProps.inputValue)",
  "flex: hasTypedValue ? '1 1 auto' : '0 1 auto'",
  "singleValue: (base) =>",
  "position: 'relative'",
  "valueContainer: () => cn('flex min-w-0 flex-1 items-center",
]) {
  if (!shared.includes(token)) throw new Error(`SearchableSelectField missing: ${token}`);
}

for (const file of ['pages/Products.tsx', 'pages/inventory/ProductsManager.tsx']) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const productSelectArea = source.includes('جستجو و انتخاب دسته‌بندی محصول') || source.includes('نام دسته‌بندی را تایپ کنید');
  if (!productSelectArea) throw new Error(`${file}: product category searchable select not found`);
  if (/ariaLabel="جستجو و انتخاب (?:دسته‌بندی|تأمین‌کننده) محصول"[\s\S]{0,280}controlClassName="inventory-premium-select"/.test(source)) {
    throw new Error(`${file}: legacy inventory-premium-select still applied to product searchable select`);
  }
}

console.log('audit-product-modal-select-value-v233: PASS');
