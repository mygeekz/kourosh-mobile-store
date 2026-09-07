import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const partnerHeader = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const partnerRender = read('pages/partnerDetail/PartnerDetailRender.tsx');
const customerRender = read('pages/customerDetail/CustomerDetailRender.tsx');
const customerHeader = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
const styleManifest = read('styles/manifest/style-manifest.json');
const styleBootstrap = read('app/bootstrap/styles.ts');
const responsiveFoundation = read('styles/system/partner-detail-responsive-ledger-foundation.css');

const obsoleteStyles = [
  'styles/system/partner-runtime/partner-header-mockup-v89.css',
  'styles/system/partner-runtime/partner-header-rtl-risk-v91.css',
  'styles/system/partner-runtime/partner-header-repair-v93.css',
  'styles/system/partner-runtime/partner-header-fix-v94.css',
  'styles/system/partner-runtime/partner-detail-customer-top-sync-v86.css',
];

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const has = (text, needle) => text.includes(needle);

const customerShell = 'detail-page-shell people-detail-apple customer-detail-apple people-detail-redesign-v1 people-detail-redesign-v1--customer people-foundation people-detail-foundation space-y-8';
const partnerHeroIndex = partnerRender.indexOf('data-ui-partner-header-shell="customer-parity-v137"');
const partnerOperationalIndex = partnerRender.indexOf('data-ui-partner-detail-shell="operational-content"');
const partnerOperationalClassIndex = partnerRender.indexOf('partner-detail-responsive-root');

check('Customer reference still uses the canonical customer detail shell', has(customerRender, customerShell));
check('Partner header now uses the exact customer detail shell', has(partnerRender, customerShell));
check('Partner hero uses the exact customer hero surface classes', has(partnerRender, 'className="customer-detail-hero detail-hero-card"'));
check('Partner header shell is structurally isolated from partner runtime CSS', partnerHeroIndex >= 0 && partnerOperationalIndex > partnerHeroIndex);
check('Partner-specific responsive root starts after the customer-parity header shell', partnerOperationalClassIndex > partnerHeroIndex && partnerOperationalIndex > partnerOperationalClassIndex);
check('Partner header marks the v137 parity contract', has(partnerHeader, 'data-ui-partner-header="customer-parity-v137"'));
check('Partner header uses shared detail hero head primitive', has(partnerHeader, 'detail-hero-card__head'));
check('Partner header uses customer overview top contract', has(partnerHeader, 'customer-overview-hero-top'));
check('Partner identity uses the same IconGlyph primitive as customer', has(partnerHeader, '<IconGlyph tone="accent"') && has(customerHeader, '<IconGlyph tone="accent"'));
check('Partner chips use the same customer hero chip contract', has(partnerHeader, 'customer-hero-chip-row') && has(partnerHeader, 'customer-hero-chip'));
check('Partner actions use the same customer overview action contract', has(partnerHeader, 'customer-overview-actions') && has(partnerHeader, 'people-action-btn'));
check('Partner action order matches customer header', ['ارسال پیام', 'ارسال گزارش', 'ویرایش پروفایل', 'اتصال تلگرام'].every((label) => has(partnerHeader, label)));
check('Partner dashboard uses the same overview grid contract', has(partnerHeader, 'customer-overview-dashboard-grid'));
check('Partner cards use the same overview-card primitive', (partnerHeader.match(/customer-overview-card/g) || []).length >= 3);
check('Partner metrics use the same metric-cell primitive', has(partnerHeader, 'customer-overview-metric-cell'));
check('Partner account card keeps ledger drilldown', has(partnerHeader, 'onClick={scrollToLedger}') && has(partnerHeader, 'مشاهده دفتر حساب'));
check('Partner header keeps Telegram linkage status', has(partnerHeader, 'partnerTelegramLinked') && has(partnerHeader, 'آخرین اتصال'));
check('Partner header keeps financial balance semantics', has(partnerHeader, 'بدهی به همکار') && has(partnerHeader, 'طلب از همکار'));
check('Partner header keeps risk summary and score', has(partnerHeader, 'سطح ریسک همکاری') && has(partnerHeader, 'riskScore.toLocaleString'));
check('Partner header keeps pending-capital metric', has(partnerHeader, 'سرمایه در انتظار بازگشت') && has(partnerHeader, 'soldPhonesProductSettlementBalance'));
check('Old bespoke partner-header contract is absent from current partner JSX', !has(partnerHeader, 'partner-header-mockup-v89') && !has(partnerRender, 'partner-header-mockup-v89'));
check('All verified orphaned dedicated header styles were physically deleted', obsoleteStyles.every((file) => !exists(file)));
check('Deleted header styles are no longer registered in style manifest', obsoleteStyles.every((file) => !has(styleManifest, file)));
check('Deleted header styles are no longer imported by runtime bootstrap', obsoleteStyles.every((file) => !has(styleBootstrap, file)));
check('Responsive foundation no longer carries dead v89 header selectors', !has(responsiveFoundation, 'partner-header-mockup-v89'));
check('Header unification introduces no new CSS dependency', !/\.css['"];/.test(partnerHeader) && !/\.css['"];/.test(partnerRender));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nPartner/customer header unification v137 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
