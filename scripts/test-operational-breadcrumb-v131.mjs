import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;


const resolverModule = { exports: {} };
const resolverSandbox = {
  module: resolverModule,
  exports: resolverModule.exports,
  URL,
  URLSearchParams,
  Number,
  String,
  Math,
  console,
};
vm.createContext(resolverSandbox);
vm.runInContext(transpile('utils/navigationEntityLabelResolver.ts'), resolverSandbox, { filename: 'navigationEntityLabelResolver.js' });
const entityResolver = resolverModule.exports;

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
    if (id === './navigationEntityLabelResolver') return entityResolver;
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
if (!firstId) throw new Error('First navigation did not create navctx.');

nav.navigateWithReturnContext(navigate, '/installment-sales/8?tab=installments&paymentId=245', {
  originPath: `/customers/5?navctx=${encodeURIComponent(firstId)}#customer-ledger-section`,
  originPathname: '/customers/5',
  originTitle: 'مشتری اکبری',
  originContextLabel: 'تراکنش #۲۴۵ • پرداخت قسط پرونده ۸',
  originAnchorId: 'customer-ledger-entry-77',
  originUiState: { kind: 'customer-ledger', customerId: 5, page: 2, pageSize: '25', search: '', direction: 'all', range: 'all' },
});
const secondUrl = new URL(calls.at(-1).to, 'https://kourosh.local');
const secondId = secondUrl.searchParams.get('navctx');
const second = nav.readNavigationReturnRecordById(secondId);
if (!second) throw new Error('Second navigation record missing.');
const chain = nav.getNavigationReturnChain(second);
if (chain.length !== 2 || chain[0].id !== firstId || chain[1].id !== secondId) throw new Error('Return chain order is not oldest -> newest.');

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

const stages = crumb.buildOperationalNavigationBreadcrumb(
  second,
  '/installment-sales/8',
  secondUrl.search,
);
const labels = stages.map((stage) => stage.label);
const requiredLabels = ['گزارش بدهکاران', 'مشتری اکبری', 'قرارداد اقساطی #۸', 'پرداخت #۲۴۵'];
for (const label of requiredLabels) {
  if (!labels.includes(label)) throw new Error(`Missing operational breadcrumb stage: ${label}; got ${labels.join(' | ')}`);
}
const contractStage = stages.find((stage) => stage.label === 'قرارداد اقساطی #۸');
if (!contractStage?.path) throw new Error('Contract parent stage is not directly navigable.');
const contractUrl = new URL(contractStage.path, 'https://kourosh.local');
if (!contractUrl.searchParams.get('navctx')) throw new Error('Contract parent stage lost active navctx.');
if (contractUrl.searchParams.has('paymentId') || contractUrl.searchParams.has('checkId')) throw new Error('Contract parent stage kept leaf focus params.');
const paymentStage = stages.at(-1);
if (!paymentStage?.current || paymentStage.label !== 'پرداخت #۲۴۵') throw new Error('Exact payment stage is not the current breadcrumb leaf.');

const staleIds = chain.map((item) => item.id);
nav.removeNavigationReturnRecords(staleIds);
if (staleIds.some((id) => nav.readNavigationReturnRecordById(id))) throw new Error('Bulk chain cleanup did not remove all active records.');

console.log('Operational breadcrumb v131 functional test passed: report -> customer -> contract -> payment chain, direct parent path, and bulk cleanup are correct.');
