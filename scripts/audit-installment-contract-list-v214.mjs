import fs from 'node:fs';

const page = fs.readFileSync(new URL('../pages/InstallmentSalesPage.tsx', import.meta.url), 'utf8');
const fail = (message) => { throw new Error(message); };
const expect = (value, label) => { if (!page.includes(value)) fail(`Installment contract list v214: missing ${label}`); };

expect('const openInstallmentContractPrint = (saleId?: number) => {', 'shared list print handler');
expect('#/print/installment-contract/${id}?mode=print', '8-article print route');
expect("key: 'print-contract'", 'desktop table print action');
expect("label: 'چاپ قرارداد'", 'desktop table print label');
expect('onClick: () => openInstallmentContractPrint(sale.id)', 'desktop table print handler');
expect('>چاپ قرارداد</Button>', 'mobile card print button');
expect('onClick={() => openInstallmentContractPrint(sale.id)}', 'mobile card print handler');
expect("fa-solid fa-print", 'print icon');

console.log('Installment contract list v214 audit passed: print contract is available from desktop table actions and compact/mobile cards.');
