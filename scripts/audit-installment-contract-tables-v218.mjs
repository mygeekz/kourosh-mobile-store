import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`[v218 installment contract tables audit] ${message}`); };
const expect = (source, token, label) => { if (!source.includes(token)) fail(`missing ${label}`); };
const reject = (source, token, label) => { if (source.includes(token)) fail(`unexpected ${label}`); };

if (!['v218', 'v219', 'v220', 'v221'].includes(read('KOUROSH_SOURCE_VERSION').trim())) fail('release marker must be v218 or a later compatible successor');

const contract = read('pages/InstallmentSaleContractPrintPage.tsx');

expect(contract, '.contract-table { width: 100%; border-collapse: separate; border-spacing: 0;', 'single-surface table geometry');
expect(contract, '.contract-cell-stack { display: flex;', 'grouped cell stack');
expect(contract, '.contract-cell-primary { color: #0f172a;', 'primary cell typography');
expect(contract, '.contract-cell-meta { color: #64748b;', 'secondary cell typography');
expect(contract, '.contract-cell-ltr { direction: ltr;', 'stable numeric direction');
reject(contract, '.contract-value-ltr { direction: ltr; unicode-bidi: isolate; display: inline-block;', 'table-breaking inline-block helper');

expect(contract, '<th>کالا و مدل</th>', 'grouped item identity column');
expect(contract, '<th>مشخصات</th>', 'grouped item specs column');
expect(contract, 'رنگ: {clean(item.phoneColor)}', 'item color in related cell');
expect(contract, 'حافظه: {clean(item.phoneStorage)}', 'item storage in related cell');

expect(contract, '<th>شناسه‌های چک</th>', 'grouped check identities column');
expect(contract, '<th>مبلغ و سررسید</th>', 'grouped check finance column');
expect(contract, 'کد ملی: <b className="contract-cell-ltr">', 'issuer identity grouping');
expect(contract, 'صیادی: <b className="contract-cell-ltr">', 'Sayad identity grouping');
expect(contract, 'سررسید: <b className="contract-cell-ltr contract-cell-nowrap">', 'due-date finance grouping');
reject(contract, '<th>کد ملی صادرکننده</th>', 'legacy narrow issuer-national-code column');
reject(contract, '<th>شناسه صیادی</th>', 'legacy narrow Sayad column');

console.log('Installment contract tables v218 audit passed: table-cell integrity, grouped information architecture, compact A4 columns, and unified people-table styling are wired.');
