import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const source = fs.readFileSync('utils/navigationReturnContext.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

const storageMap = new Map();
const sessionStorage = {
  getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
  setItem: (key, value) => { storageMap.set(String(key), String(value)); },
  removeItem: (key) => { storageMap.delete(String(key)); },
};

const module = { exports: {} };
const sandbox = {
  module,
  exports: module.exports,
  require: (id) => {
    if (id === './navigationContext') return { resolveNavigationContext: () => ({ pageTitle: 'Test origin' }) };
    if (id === './navigationEntityLabelResolver') return { resolveNavigationEntityLabels: () => [] };
    throw new Error(`Unexpected require: ${id}`);
  },
  window: { sessionStorage, setTimeout, clearTimeout },
  document: { querySelector: () => null, querySelectorAll: () => [] },
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
vm.createContext(sandbox);
vm.runInContext(compiled, sandbox, { filename: 'navigationReturnContext.js' });
const nav = module.exports;

const calls = [];
const navigate = (to, options) => calls.push({ to, options });

nav.navigateWithReturnContext(navigate, '/customers/5', {
  originPath: '/reports/debtors?search=akb&page=3',
  originPathname: '/reports/debtors',
  originAnchorId: 'report:debtors:5',
  originUiState: { kind: 'report-drilldown', reportKey: 'debtors', state: { searchQuery: 'akb', pageIndex: 2 } },
});
if (calls.length !== 1) throw new Error('First drilldown did not navigate exactly once.');
const firstUrl = new URL(calls[0].to, 'https://kourosh.local');
const firstId = firstUrl.searchParams.get('navctx');
if (!firstId) throw new Error('First drilldown did not append navctx.');
const first = nav.readNavigationReturnRecordById(firstId);
if (!first || first.originPath !== '/reports/debtors?search=akb&page=3') throw new Error('First origin report path was not captured exactly.');

calls.length = 0;
nav.navigateWithReturnContext(navigate, '/invoices/9?mode=read', {
  originPath: `/customers/5?navctx=${encodeURIComponent(firstId)}#customer-ledger-section`,
  originPathname: '/customers/5',
  originAnchorId: 'customer-ledger-entry-77',
  originUiState: { kind: 'customer-ledger', customerId: 5, page: 2, pageSize: '25', search: '', direction: 'all', range: 'all' },
});
if (calls.length !== 1) throw new Error('Nested drilldown did not navigate exactly once.');
const secondUrl = new URL(calls[0].to, 'https://kourosh.local');
const secondId = secondUrl.searchParams.get('navctx');
if (!secondId || secondId === firstId) throw new Error('Nested drilldown did not create a new return id.');
const second = nav.readNavigationReturnRecordById(secondId);
if (!second) throw new Error('Nested return record was not persisted.');
if (second.parentReturnId !== firstId) throw new Error('Nested return record lost parentReturnId.');
if (!second.originPath.includes(`navctx=${firstId}`)) throw new Error('Nested return record stripped the valid parent navctx.');
if (!second.originPath.includes('#customer-ledger-section')) throw new Error('Nested return record lost the origin hash.');
if (!calls[0].to.includes('mode=read') || !calls[0].to.includes('navctx=')) throw new Error('Nested destination lost its own query parameter when navctx was appended.');

nav.removeNavigationReturnRecord(firstId);
calls.length = 0;
nav.navigateWithReturnContext(navigate, '/repairs/3', {
  originPath: `/customers/5?navctx=${encodeURIComponent(firstId)}&tab=ledger`,
  originPathname: '/customers/5',
  originUiState: { kind: 'customer-ledger', customerId: 5, page: 1, pageSize: '25', search: '', direction: 'all', range: 'all' },
});
const thirdId = new URL(calls[0].to, 'https://kourosh.local').searchParams.get('navctx');
const third = nav.readNavigationReturnRecordById(thirdId);
if (!third) throw new Error('Stale-parent test did not persist a return record.');
if (third.parentReturnId) throw new Error('Stale parent id was preserved unexpectedly.');
if (third.originPath.includes('navctx=')) throw new Error('Stale parent navctx was not stripped from origin.');
if (!third.originPath.includes('tab=ledger')) throw new Error('Origin query parameters other than navctx were lost.');

console.log('Navigation return chain v130 functional test passed: report -> customer -> document chain preserved; stale parent sanitized.');
