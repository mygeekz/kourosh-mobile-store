import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const resolver = read('utils/navigationEntityLabelResolver.ts');
const nav = read('utils/navigationReturnContext.ts');
const crumb = read('utils/operationalNavigationBreadcrumb.ts');
const bar = read('components/main-layout/NavigationReturnBar.tsx');
const preview = read('components/main-layout/NavigationBreadcrumbQuickPreview.tsx');
const customerLedger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const cashPhoneReport = read('pages/reports/PhoneSalesReport.tsx');
const installmentPhoneReport = read('pages/reports/PhoneInstallmentSalesReport.tsx');
const debtors = read('pages/reports/DebtorsReport.tsx');
const creditors = read('pages/reports/CreditorsReport.tsx');

expect('Quick preview component exists', fs.existsSync('components/main-layout/NavigationBreadcrumbQuickPreview.tsx'));
expect('Preview snapshot is serializable plain data', resolver.includes('NavigationEntityQuickPreviewSnapshot') && resolver.includes('items?: NavigationEntityQuickPreviewItem[]'));
expect('Captured breadcrumb stage persists quick preview snapshot', resolver.includes('preview?: NavigationEntityQuickPreviewSnapshot'));
expect('Navigation capture remains snapshot-only and does not fetch preview data', !resolver.includes('fetch(') && !nav.includes('breadcrumbPreviewFetch'));
expect('Resolver sanitizes preview payload before session storage capture', resolver.includes('cleanPreview') && resolver.includes('.slice(0, 8)'));
expect('Resolver merges page-scoped preview data with semantic entity preview', resolver.includes('mergePreview') && resolver.includes('explicitPreview'));
expect('Installment stage exposes semantic quick preview', resolver.includes("eyebrow: 'قسط قرارداد'") && resolver.includes("label: 'شماره قسط'"));
expect('Payment stage exposes amount quick preview', resolver.includes("eyebrow: 'پرداخت اقساطی'") && resolver.includes("label: 'مبلغ پرداخت'"));
expect('Check stage exposes quick preview', resolver.includes("eyebrow: 'چک اقساطی'") && resolver.includes("label: 'مبلغ چک'"));
expect('Phone preview reuses captured IMEI without querying', resolver.includes("label: 'IMEI'") && resolver.includes('identifier || parseImei'));
expect('Product preview reuses captured SKU without querying', resolver.includes("label: 'SKU / شناسه'") && resolver.includes('compactIdentifier(identifier)'));
expect('Operational breadcrumb forwards captured preview snapshots', crumb.includes('preview: stage.preview || basicPreview'));
expect('Origin breadcrumb stages also have a useful fallback preview', crumb.includes("index === 0 ? 'مبدأ بررسی' : 'مرحله قبلی'"));
expect('Fallback preview indicates exact return anchor state when available', crumb.includes("ردیف و موقعیت قبلی ذخیره شده"));
expect('Duplicate breadcrumb merge preserves richer target preview', crumb.includes('preview: target.preview || stages[stages.length - 1].preview'));
expect('Return bar supports hover preview', bar.includes('onMouseEnter={(event) => showPreview(stage, event.currentTarget, false)}'));
expect('Return bar supports keyboard focus preview', bar.includes('onFocusCapture={(event) => showPreview(stage, event.currentTarget, false)}'));
expect('Return bar exposes explicit click/touch preview control', bar.includes('پیش‌نمایش سریع ${stage.label}') && bar.includes('fa-circle-info'));
expect('Current breadcrumb stage can pin preview on click', bar.includes('togglePinnedPreview(stage'));
expect('Pinned preview can be dismissed by outside click', bar.includes("closest('[data-ui-breadcrumb-quick-preview=\"true\"]')"));
expect('Pinned preview can be dismissed with Escape', bar.includes("event.key === 'Escape'"));
expect('Hover close is delayed so pointer can enter the popover', bar.includes('}, 140);'));
expect('Preview is rendered outside horizontal breadcrumb overflow using a portal', preview.includes("createPortal") && preview.includes('document.body'));
expect('Preview position follows trigger on resize and scroll', preview.includes("window.addEventListener('resize'") && preview.includes("document.addEventListener('scroll', updatePosition, true)"));
expect('Preview has a mobile-safe bounded width', preview.includes('Math.min(360') && preview.includes('viewportWidth - 24'));
expect('Preview is RTL and accessible as a dialog', preview.includes('role="dialog"') && preview.includes('dir="rtl"'));
expect('Preview supports status and compact item grid', preview.includes('preview.status') && preview.includes('<dl className="grid grid-cols-2 gap-2">'));
expect('Customer ledger sends already-rendered amount/balance/date into preview snapshot', customerLedger.includes("eyebrow: 'رویداد دفتر مشتری'") && customerLedger.includes("label: 'مانده پس از رویداد'") && customerLedger.includes("label: 'تاریخ'"));
expect('Partner ledger sends already-rendered amount/balance/date into preview snapshot', partnerLedger.includes("eyebrow: 'رویداد دفتر همکار'") && partnerLedger.includes("label: 'مانده پس از رویداد'") && partnerLedger.includes('formatLedgerTransactionDate(entry.transactionDate)'));

expect('Cash phone report enriches preview from already-loaded report row', cashPhoneReport.includes("eyebrow: 'فروش نقدی گوشی'") && cashPhoneReport.includes("label: 'قیمت خرید'") && cashPhoneReport.includes("label: 'سود'"));
expect('Installment phone report enriches preview from already-loaded report row', installmentPhoneReport.includes("eyebrow: 'فروش اقساطی گوشی'") && installmentPhoneReport.includes("label: 'تاریخ قرارداد'") && installmentPhoneReport.includes("label: 'سود'"));
expect('Debtors root-source preview reuses current debt balance', debtors.includes("eyebrow: 'سند ریشه بدهی'") && debtors.includes("label: 'مانده بدهی'"));
expect('Creditors root-source preview reuses current credit balance', creditors.includes("eyebrow: 'سند ریشه بستانکاری'") && creditors.includes("label: 'مانده بستانکاری'"));
expect('No preview-specific server route was introduced', !fs.existsSync('server/routes/navigationBreadcrumbPreview.routes.ts'));
expect('No dedicated quick-preview CSS file was introduced', !fs.existsSync('styles/components/navigation-breadcrumb-quick-preview.css'));
expect('Quick preview component contains no network call', !preview.includes('fetch('));

if (failures.length) {
  console.error(`Navigation quick preview v133 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Navigation quick preview v133 audit passed: ${checks}/${checks} checks.`);
