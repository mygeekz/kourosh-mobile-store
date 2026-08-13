import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const resolverModule = { exports: {} };
const resolverSandbox = { module: resolverModule, exports: resolverModule.exports, URL, URLSearchParams, Number, String, Math, Set, console };
vm.createContext(resolverSandbox);
vm.runInContext(transpile('utils/navigationEntityLabelResolver.ts'), resolverSandbox, { filename: 'navigationEntityLabelResolver.js' });
const resolver = resolverModule.exports;

const stages = resolver.resolveNavigationEntityLabels({
  targetPath: '/installment-sales/8?tab=installments&paymentId=245',
  kind: 'installment_payment',
  sourceLabel: 'پرداخت قسط 3 · پرونده #8',
  amountText: '۲۸,۰۰۰,۰۰۰ تومان',
  preview: {
    status: 'مانده بدهکار',
    statusTone: 'warning',
    items: [
      { label: 'مانده پس از رویداد', value: '۴۲,۰۰۰,۰۰۰ تومان' },
      { label: 'تاریخ', value: '۱۴۰۵/۰۵/۲۰' },
    ],
    note: 'ثبت از دفتر حساب مشتری',
  },
});

const installment = stages.find((stage) => stage.label === 'قسط سوم');
const payment = stages.find((stage) => stage.label === 'پرداخت ۲۸,۰۰۰,۰۰۰ تومان');
if (!installment?.preview) throw new Error('Installment stage quick preview missing.');
if (!payment?.preview) throw new Error('Payment stage quick preview missing.');
const installmentItems = new Map((installment.preview.items || []).map((item) => [item.label, item.value]));
if (installmentItems.get('شماره قسط') !== '۳') throw new Error(`Installment number preview mismatch: ${JSON.stringify(installment.preview)}`);
if (installmentItems.get('پرداخت این رویداد') !== '۲۸,۰۰۰,۰۰۰ تومان') throw new Error('Installment event amount not reused from snapshot.');
if (installmentItems.get('مانده پس از رویداد') !== '۴۲,۰۰۰,۰۰۰ تومان') throw new Error('Explicit page-scoped balance preview was not merged.');
if (installmentItems.get('تاریخ') !== '۱۴۰۵/۰۵/۲۰') throw new Error('Explicit page-scoped date preview was not merged.');
if (payment.preview.status !== 'مانده بدهکار' || payment.preview.statusTone !== 'warning') throw new Error('Payment status preview was not preserved.');

const phone = resolver.resolveNavigationEntityLabels({
  targetPath: '/mobile-phones?phoneId=22',
  kind: 'phone',
  entityName: 'iPhone 15 Pro',
  identifier: '356789123456789',
})[0];
const phoneItems = new Map((phone?.preview?.items || []).map((item) => [item.label, item.value]));
if (phoneItems.get('IMEI') !== '356789…6789') throw new Error(`Phone preview did not reuse compact IMEI snapshot: ${JSON.stringify(phone?.preview)}`);

const product = resolver.resolveNavigationEntityLabels({
  targetPath: '/products?productId=7',
  kind: 'product',
  entityName: 'کابل Baseus',
  identifier: 'BS-100',
})[0];
const productItems = new Map((product?.preview?.items || []).map((item) => [item.label, item.value]));
if (productItems.get('SKU / شناسه') !== 'BS-100') throw new Error(`Product preview did not reuse SKU snapshot: ${JSON.stringify(product?.preview)}`);

console.log('Navigation quick preview v133 functional test passed: installment/payment snapshot merge, status, date, balance, phone IMEI and product SKU are previewed without fetching.');
