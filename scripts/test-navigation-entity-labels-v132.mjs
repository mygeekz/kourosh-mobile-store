import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const loadResolver = () => {
  const mod = { exports: {} };
  const sandbox = { module: mod, exports: mod.exports, URL, URLSearchParams, Number, String, Math, console };
  vm.createContext(sandbox);
  vm.runInContext(transpile('utils/navigationEntityLabelResolver.ts'), sandbox, { filename: 'navigationEntityLabelResolver.js' });
  return mod.exports;
};

const resolver = loadResolver();
const paymentStages = resolver.resolveNavigationEntityLabels({
  targetPath: '/installment-sales/8?tab=installments&paymentId=245',
  kind: 'installment_payment',
  sourceLabel: 'پرداخت قسط 3 · پرونده #8',
  amountText: '۲۸,۰۰۰,۰۰۰ تومان',
});
const paymentLabels = paymentStages.map((stage) => stage.label);
for (const expected of ['قرارداد #۸', 'قسط سوم', 'پرداخت ۲۸,۰۰۰,۰۰۰ تومان']) {
  if (!paymentLabels.includes(expected)) throw new Error(`Missing semantic payment breadcrumb label: ${expected}; got ${paymentLabels.join(' | ')}`);
}

const phoneStage = resolver.resolveNavigationEntityLabels({
  targetPath: '/mobile-phones?phoneId=22',
  kind: 'phone',
  entityName: 'iPhone 15 Pro',
  identifier: '356789123456789',
})[0];
if (!phoneStage?.label.includes('iPhone 15 Pro') || !phoneStage.label.includes('IMEI 356789…6789')) {
  throw new Error(`Phone semantic label missing model/compact IMEI: ${phoneStage?.label}`);
}

const productStage = resolver.resolveNavigationEntityLabels({
  targetPath: '/products?productId=7',
  kind: 'product',
  entityName: 'کابل Baseus',
  identifier: 'BS-100',
})[0];
if (!productStage?.label.includes('کابل Baseus') || !productStage.label.includes('SKU BS-100')) {
  throw new Error(`Product semantic label missing name/SKU: ${productStage?.label}`);
}

const storageMap = new Map();
const sessionStorage = {
  getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
  setItem: (key, value) => { storageMap.set(String(key), String(value)); },
  removeItem: (key) => { storageMap.delete(String(key)); },
};
const navModule = { exports: {} };
const navSandbox = {
  module: navModule,
  exports: navModule.exports,
  require: (id) => {
    if (id === './navigationContext') return { resolveNavigationContext: () => ({ pageTitle: 'صفحه تست' }) };
    if (id === './navigationEntityLabelResolver') return resolver;
    throw new Error(`Unexpected nav require: ${id}`);
  },
  window: { sessionStorage, setTimeout, clearTimeout },
  document: { querySelector: () => null, querySelectorAll: () => [] },
  URL,
  URLSearchParams,
  Date,
  Math,
  JSON,
  crypto: globalThis.crypto,
  MutationObserver: class { observe() {} disconnect() {} },
  console,
  setTimeout,
  clearTimeout,
};
vm.createContext(navSandbox);
vm.runInContext(transpile('utils/navigationReturnContext.ts'), navSandbox, { filename: 'navigationReturnContext.js' });
const nav = navModule.exports;

const calls = [];
const navigate = (to, options) => calls.push({ to, options });
nav.navigateWithReturnContext(navigate, '/customers/5', {
  originPath: '/reports/debtors?search=akb&page=3',
  originPathname: '/reports/debtors',
  originTitle: 'گزارش بدهکاران',
  originContextLabel: 'اکبری • بدهی ۱۲۰٬۰۰۰٬۰۰۰ تومان',
  originAnchorId: 'report:debtors:5',
  originUiState: { kind: 'report-drilldown', reportKey: 'debtors', state: { searchQuery: 'akb', pageIndex: 2 } },
});
const firstId = new URL(calls.at(-1).to, 'https://kourosh.local').searchParams.get('navctx');
const firstRecord = nav.readNavigationReturnRecordById(firstId);
if (!firstRecord?.targetEntityStages?.some((stage) => stage.label === 'مشتری اکبری')) {
  throw new Error(`Report -> customer entity label was not captured: ${JSON.stringify(firstRecord?.targetEntityStages)}`);
}

nav.navigateWithReturnContext(navigate, '/installment-sales/8?tab=installments&paymentId=245', {
  originPath: `/customers/5?navctx=${encodeURIComponent(firstId)}#customer-ledger-section`,
  originPathname: '/customers/5',
  originTitle: 'مشتری اکبری',
  originContextLabel: 'تراکنش #۷۷ • دریافت بابت قسط سوم',
  originAnchorId: 'customer-ledger-entry-77',
  originUiState: { kind: 'customer-ledger', customerId: 5, page: 2, pageSize: '25', search: '', direction: 'all', range: 'all' },
  targetEntity: {
    kind: 'installment_payment',
    sourceLabel: 'پرداخت قسط 3 · پرونده #8',
    amountText: '۲۸,۰۰۰,۰۰۰ تومان',
  },
});
const secondUrl = new URL(calls.at(-1).to, 'https://kourosh.local');
const secondId = secondUrl.searchParams.get('navctx');
const secondRecord = nav.readNavigationReturnRecordById(secondId);
if (!secondRecord) throw new Error('Second navigation record missing.');

const crumbModule = { exports: {} };
const crumbSandbox = {
  module: crumbModule,
  exports: crumbModule.exports,
  require: (id) => {
    if (id === './navigationReturnContext') return nav;
    if (id === './navigationContext') return { resolveNavigationContext: (pathname) => ({ pageTitle: pathname.startsWith('/reports') ? 'گزارش' : 'صفحه جاری' }) };
    throw new Error(`Unexpected crumb require: ${id}`);
  },
  URL,
  URLSearchParams,
  Number,
  String,
  console,
};
vm.createContext(crumbSandbox);
vm.runInContext(transpile('utils/operationalNavigationBreadcrumb.ts'), crumbSandbox, { filename: 'operationalNavigationBreadcrumb.js' });
const crumb = crumbModule.exports;

const stages = crumb.buildOperationalNavigationBreadcrumb(secondRecord, '/installment-sales/8', secondUrl.search);
const labels = stages.map((stage) => stage.label);
for (const expected of ['گزارش بدهکاران', 'مشتری اکبری', 'قرارداد #۸', 'قسط سوم', 'پرداخت ۲۸,۰۰۰,۰۰۰ تومان']) {
  if (!labels.includes(expected)) throw new Error(`Missing full semantic chain label: ${expected}; got ${labels.join(' | ')}`);
}
const contractStage = stages.find((stage) => stage.label === 'قرارداد #۸');
if (!contractStage?.path) throw new Error('Semantic contract stage is not directly navigable.');
const contractUrl = new URL(contractStage.path, 'https://kourosh.local');
if (contractUrl.searchParams.get('navctx') !== secondId) throw new Error('Semantic contract stage lost active navctx.');
if (contractUrl.searchParams.has('paymentId') || contractUrl.searchParams.has('checkId')) throw new Error('Semantic contract stage retained leaf focus params.');

const parentStages = crumb.buildOperationalNavigationBreadcrumb(secondRecord, '/installment-sales/8', contractUrl.search);
const parentLabels = parentStages.map((stage) => stage.label);
if (!parentLabels.includes('قرارداد #۸') || parentLabels.includes('قسط سوم') || parentLabels.some((label) => label.startsWith('پرداخت '))) {
  throw new Error(`Jumping to contract parent did not trim leaf semantic stages: ${parentLabels.join(' | ')}`);
}

console.log('Navigation entity labels v132 functional test passed: semantic payment chain, phone IMEI, product SKU, captured customer name, and parent-stage trimming are correct.');
