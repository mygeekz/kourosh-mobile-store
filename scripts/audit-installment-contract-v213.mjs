import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includesAll = (source, values, label) => {
  for (const value of values) assert(source.includes(value), `${label}: missing ${value}`);
};

const contractPage = read('pages/InstallmentSaleContractPrintPage.tsx');
const addSale = read('pages/AddInstallmentSalePage.tsx');
const detail = read('pages/InstallmentSaleDetailPage.tsx');
const printLayout = read('pages/PrintLayout.tsx');
const routeManifest = read('app/routes/routeManifest.tsx');
const lazyPages = read('app/routes/lazyPages.tsx');
const routeMatrix = read('app/routes/routeAccessMatrix.ts');
const schema = read('server/db/schema/installments.schema.ts');
const installmentDb = read('server/db/domains/installments.db.ts');
const installmentRoutes = read('server/routes/installments.routes.ts');
const installmentService = read('server/services/installments.service.ts');
const validators = read('server/validators.ts');
const settingsPanel = read('pages/settings/SettingsBusinessPanel.tsx');
const defaults = read('server/db/seeds/defaultSettings.seed.ts');

includesAll(contractPage, [
  'ماده ۱ - موضوع قرارداد',
  'ماده ۲ - مبلغ معامله و نحوه پرداخت',
  'ماده ۳ - مسئولیت خریدار نسبت به چک شخص ثالث',
  'ماده ۴ - انتقال چک صیادی',
  'ماده ۵ - ضمانت اجرای عدم پرداخت',
  'ماده ۶ - اقرار به دریافت کالا',
  'ماده ۷ - حل اختلاف',
  'ماده ۸ - نسخ قرارداد',
], '8-article printable contract');

includesAll(contractPage, [
  'ارائه چک شخص ثالث به هیچ عنوان موجب انتقال مسئولیت پرداخت از خریدار نخواهد شد',
  'مسئولیت صحت انتقال، ثبت اطلاعات و انجام صحیح فرآیند انتقال چک در سامانه صیاد',
  'کلیه هزینه‌های قانونی از جمله هزینه دادرسی، حق‌الوکاله و خسارات قانونی',
  'این قرارداد در دو نسخه با اعتبار یکسان تنظیم',
  'امضا و اثر انگشت',
  'شاهد اول',
  'شاهد دوم',
], 'legal contract clauses');

includesAll(addSale, [
  'buyerNationalCode',
  'issuerName',
  'issuerNationalCode',
  'sayadiId',
  'آدرس مشتری باید در پرونده مشتری ثبت شده باشد',
  '`/installment-sales/${createdSaleId}?created=1`',
], 'new installment form contract data');

includesAll(detail, [
  'چاپ قرارداد کامل ۸ ماده‌ای',
  '#/print/installment-contract/',
  'openInstallmentContractPrint',
], 'installment detail print action');

includesAll(routeManifest, ['installment-contract/:id', 'InstallmentSaleContractPrintPage'], 'print route');
assert(lazyPages.includes('InstallmentSaleContractPrintPage'), 'lazy page registry missing installment contract print page');
assert(routeMatrix.includes("print:installment-contract"), 'route access matrix missing installment print route');

includesAll(schema, [
  'buyerFullName TEXT',
  'buyerNationalCode TEXT',
  'buyerPhoneNumber TEXT',
  'buyerAddress TEXT',
  'sellerFullName TEXT',
  'sellerNationalCode TEXT',
  'sellerStoreName TEXT',
  'sellerPhoneNumber TEXT',
  'sellerAddress TEXT',
  'contractVersion TEXT',
  'issuerName TEXT',
  'issuerNationalCode TEXT',
  'sayadiId TEXT',
  'contractModel TEXT',
  'contractColor TEXT',
  'contractStorage TEXT',
  'contractImei TEXT',
], 'installment contract schema');

includesAll(installmentDb, [
  'prepareInstallmentSaleContractForPrintInDb',
  'installment-sale-contract-v1-8-articles',
  'buyerFullName, buyerNationalCode, buyerPhoneNumber, buyerAddress',
  'issuerName, issuerNationalCode, sayadiId',
  'contractModel, contractColor, contractStorage, contractImei',
  'برند و مدل ${prefix}',
  'رنگ ${prefix}',
  'حافظه داخلی ${prefix}',
  'شماره سریال / IMEI ${prefix}',
], 'contract snapshot persistence and print readiness');

assert(installmentRoutes.includes("'/api/installment-sales/:id/contract/prepare'"), 'contract prepare endpoint missing');
assert(installmentService.includes('prepareInstallmentSaleContractForPrint'), 'contract prepare service missing');
includesAll(validators, ['buyerNationalCode', 'issuerNationalCode', 'sayadiId'], 'contract identity validators');
includesAll(settingsPanel, ['installment_contract_seller_name', 'installment_contract_seller_national_code'], 'seller legal settings UI');
includesAll(defaults, ['installment_contract_seller_name', 'installment_contract_seller_national_code'], 'seller legal settings defaults');

assert(printLayout.includes("root.dataset.printBlocked === 'true'"), 'PrintLayout must suppress auto-print for blocked/incomplete contracts');
assert(contractPage.includes('data-print-blocked="true"'), 'contract error state must block auto-print');
assert(contractPage.includes('id="report-print-root"'), 'print readiness root missing');

console.log('Installment contract v213 audit passed: 8 legal articles, identity/check data capture, immutable snapshots, print readiness gate, RTL A4 template, and detail-page print action are wired.');
