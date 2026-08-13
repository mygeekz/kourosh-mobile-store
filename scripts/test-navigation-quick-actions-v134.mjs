import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const loadCommonJs = (file, extras = {}) => {
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports, URL, URLSearchParams, Number, String, Math, Set, console, ...extras };
  vm.createContext(sandbox);
  vm.runInContext(transpile(file), sandbox, { filename: file.replace(/\.ts$/, '.js') });
  return module.exports;
};

const resolver = loadCommonJs('utils/navigationEntityLabelResolver.ts');
const quickActions = loadCommonJs('utils/navigationQuickPreviewActions.ts');

const paymentStages = resolver.resolveNavigationEntityLabels({
  targetPath: '/installment-sales/8?tab=installments&paymentId=245',
  kind: 'installment_payment',
  sourceLabel: 'پرداخت قسط 3 · پرونده #8',
  amountText: '۲۸,۰۰۰,۰۰۰ تومان',
});
const payment = paymentStages.find((stage) => stage.key === 'entity-payment-245');
const paymentActions = quickActions.deriveNavigationQuickCopyActions(payment);
const paymentActionMap = new Map(paymentActions.map((action) => [action.label, action.value]));
if (paymentActionMap.get('کپی مبلغ پرداخت') !== '۲۸,۰۰۰,۰۰۰ تومان') throw new Error(`Payment amount copy action mismatch: ${JSON.stringify(paymentActions)}`);
if (paymentActionMap.get('کپی شناسه پرداخت') !== '245') throw new Error(`Payment id copy action mismatch: ${JSON.stringify(paymentActions)}`);

const phone = resolver.resolveNavigationEntityLabels({
  targetPath: '/mobile-phones?phoneId=22',
  kind: 'phone',
  entityName: 'iPhone 15 Pro',
  identifier: '356789123456789',
  amountText: '۹۵,۰۰۰,۰۰۰ تومان',
})[0];
const phoneActions = quickActions.deriveNavigationQuickCopyActions(phone);
const imeiAction = phoneActions.find((action) => action.label === 'کپی IMEI');
if (imeiAction?.value !== '356789123456789') throw new Error(`IMEI copy action must use full raw identifier, got: ${JSON.stringify(phoneActions)}`);
if (String(phone?.preview?.items?.find((item) => item.label === 'IMEI')?.value || '').includes('123456789')) throw new Error('IMEI display should remain compact while copy uses raw value.');

const product = resolver.resolveNavigationEntityLabels({
  targetPath: '/products?productId=7',
  kind: 'product',
  entityName: 'کابل Baseus',
  identifier: 'BS-100-LONG-REFERENCE',
})[0];
const productActions = quickActions.deriveNavigationQuickCopyActions(product);
if (productActions.find((action) => action.label === 'کپی SKU')?.value !== 'BS-100-LONG-REFERENCE') throw new Error(`SKU raw copy action mismatch: ${JSON.stringify(productActions)}`);

const check = resolver.resolveNavigationEntityLabels({
  targetPath: '/installment-sales/8?tab=checks&checkId=41',
  kind: 'installment_check',
  checkId: 41,
  checkNumber: '778899',
  amountText: '۱۲,۵۰۰,۰۰۰ تومان',
})[1];
const checkActions = quickActions.deriveNavigationQuickCopyActions(check);
const checkMap = new Map(checkActions.map((action) => [action.label, action.value]));
if (checkMap.get('کپی شماره چک') !== '778899') throw new Error(`Check number copy action mismatch: ${JSON.stringify(checkActions)}`);
if (checkMap.get('کپی مبلغ چک') !== '۱۲,۵۰۰,۰۰۰ تومان') throw new Error(`Check amount copy action mismatch: ${JSON.stringify(checkActions)}`);
if (checkMap.get('کپی شناسه چک') !== '41') throw new Error(`Check row id must come from the check stage itself, not a contract id in detail text: ${JSON.stringify(checkActions)}`);

const invoiceActions = quickActions.deriveNavigationQuickCopyActions({
  key: 'invoice-stage',
  label: 'فاکتور #۱۲۳',
  preview: { items: [{ label: 'مبلغ', value: '۵,۰۰۰,۰۰۰ تومان' }] },
});
if (invoiceActions.find((action) => action.label === 'کپی شناسه سند')?.value !== '123') throw new Error(`Stage document id fallback mismatch: ${JSON.stringify(invoiceActions)}`);
if (invoiceActions.length > 3) throw new Error('Quick action cap exceeded.');

console.log('Navigation quick actions v134 functional test passed: payment amount/id, full IMEI, full SKU, check number/amount and stage document id are copied from existing snapshots without fetching.');
