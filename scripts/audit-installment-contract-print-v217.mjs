import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`[v217 installment contract print audit] ${message}`); };
const expect = (source, token, label) => { if (!source.includes(token)) fail(`missing ${label}`); };
const reject = (source, token, label) => { if (source.includes(token)) fail(`unexpected ${label}`); };

if (!['v217', 'v218', 'v219', 'v220', 'v221'].includes(read('KOUROSH_SOURCE_VERSION').trim())) fail('release marker must be v217 or a compatible successor');

const layout = read('pages/PrintLayout.tsx');
const contract = read('pages/InstallmentSaleContractPrintPage.tsx');

expect(layout, "classList.toggle('kourosh-print-snapshot', active)", 'explicit print snapshot state');
expect(layout, 'data-print-layout-root="true"', 'isolated print layout root');
expect(layout, 'data-print-layout-frame="true"', 'isolated print layout frame');
expect(layout, 'body #root > :not([data-print-layout-root="true"])', 'non-print root child exclusion');
expect(layout, '[data-kourosh-layer], .app-portal-layer { display: none !important; }', 'portal and overlay exclusion');
expect(layout, '#report-print-root * {', 'contract descendant print stabilization');
expect(layout, '-webkit-text-fill-color: currentColor !important', 'Chrome text-fill stabilization');
expect(layout, 'window.setTimeout(resolve, 120)', 'post-layout snapshot delay');
reject(layout, '* { transform: none !important; filter: none !important; }', 'global transform reset');
reject(layout, '* { overflow: visible !important; max-height: none !important; }', 'global overflow reset');

expect(contract, 'id="report-print-root"', 'canonical contract print root');
expect(contract, '@media print', 'contract print rules');
expect(contract, 'resolveSmartSaleContractMode', 'scenario-aware contract body');

console.log('Installment contract print v217 audit passed: Chrome snapshot isolation, portal exclusion, A4 geometry reset, and contract visibility stabilization are wired.');
