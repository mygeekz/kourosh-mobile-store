import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const css = read('styles/system/partner-detail-responsive-ledger-foundation.css');
const stylesBootstrap = read('app/bootstrap/styles.ts');
const manifest = JSON.parse(read('styles/manifest/style-manifest.json'));
const render = read('pages/partnerDetail/PartnerDetailRender.tsx');
const phoneCapital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const settlement = read('pages/partnerDetail/PartnerSettlementSubmitUiIntegrationSection.tsx');
const purchases = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const partnerHeader = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });
const has = (text, needle) => text.includes(needle);

const responsiveImport = "import '../../styles/system/partner-detail-responsive-ledger-foundation.css';";
const ledgerModalImport = "import '../../styles/system/partner-runtime/partner-ledger-edit-modal-v141.css';";
const hardFocusImport = "import '../../styles/system/global-focus-reset-hard-v140.css';";
const responsiveIndex = stylesBootstrap.indexOf(responsiveImport);
const ledgerIndex = stylesBootstrap.indexOf(ledgerModalImport);
const hardFocusIndex = stylesBootstrap.indexOf(hardFocusImport);

check('PartnerDetail root has semantic responsive scope', has(render, 'partner-detail-responsive-root'));
check('PartnerDetail root retains safe-gutter compatibility class for override', has(render, 'partner-detail-safe-gutter-v84'));
check('Responsive stylesheet is imported', responsiveIndex >= 0);
check('Responsive stylesheet loads after all PartnerDetail runtime ledger styles', responsiveIndex > ledgerIndex && ledgerIndex >= 0);
check('Responsive stylesheet still loads before unrelated hard global focus reset', responsiveIndex < hardFocusIndex && hardFocusIndex >= 0);

const manifestResponsive = manifest.localStyles.find((item) => item.path === 'styles/system/partner-detail-responsive-ledger-foundation.css');
const manifestLedger = manifest.localStyles.find((item) => item.path === 'styles/system/partner-runtime/partner-ledger-edit-modal-v141.css');
const manifestHardFocus = manifest.localStyles.find((item) => item.path === 'styles/system/global-focus-reset-hard-v140.css');
check('Style manifest contains responsive stylesheet', Boolean(manifestResponsive));
check('Style manifest order matches runtime cascade', manifestResponsive && manifestLedger && manifestHardFocus && manifestResponsive.bootstrapOrder > manifestLedger.bootstrapOrder && manifestResponsive.bootstrapOrder < manifestHardFocus.bootstrapOrder);

const finalMarker = 'v135 — PartnerDetail final container-aware responsive contract';
const finalContractIndex = css.indexOf(finalMarker);
const finalCss = finalContractIndex >= 0 ? css.slice(finalContractIndex) : '';
check('Final v135 responsive contract exists', finalContractIndex >= 0);
check('PartnerDetail uses inline-size container queries', has(finalCss, 'container-type: inline-size') && has(finalCss, 'container-name: partner-detail'));
check('PartnerDetail root is width-safe', has(finalCss, 'width: 100% !important') && has(finalCss, 'min-width: 0 !important'));
check('Old physical 42px gutter is explicitly retired', has(finalCss, 'partner-detail-safe-gutter-v84') && has(finalCss, 'padding-left: clamp(8px, 1.25vw, 18px) !important'));
check('Root horizontal bleed is clipped', has(finalCss, 'overflow-x: clip !important'));
check('Responsive breakpoints are based on actual content width', [1080, 900, 680, 440].every((px) => has(finalCss, `@container partner-detail (max-width: ${px}px)`)));

check('Header uses the canonical customer detail shell instead of partner fixed columns', has(render, 'data-ui-partner-header-shell="customer-parity-v137"') && has(render, 'customer-detail-apple'));
check('Header action buttons inherit the responsive customer action row', has(partnerHeader, 'customer-overview-actions flex flex-wrap items-center gap-2'));
check('Header chips inherit the responsive customer chip row', has(partnerHeader, 'customer-hero-chip-row mt-3 flex flex-wrap items-center gap-2'));
check('Header is isolated before the partner container-responsive operational shell', render.indexOf('data-ui-partner-header-shell="customer-parity-v137"') < render.indexOf('partner-detail-responsive-root'));

check('Phone capital desktop header has explicit summary/copy areas', has(finalCss, 'grid-template-areas: "summary copy" !important'));
check('Phone capital constrained header stacks copy then summary', has(finalCss, 'grid-template-areas: "copy" "summary" !important'));
check('Phone capital fixed 440px summary minimum is neutralized', has(finalCss, '.partner-phone-capital-summary-card') && has(finalCss, 'min-width: 0 !important'));
check('Phone capital small-width decoration padding is reduced', has(finalCss, 'padding: 16px 68px 16px 14px !important'));
check('Phone capital table has semantic desktop wrapper', has(phoneCapital, 'partner-phone-capital-table-view'));
check('Phone capital has semantic compact card wrapper', has(phoneCapital, 'partner-phone-capital-mobile-list'));
check('Phone capital swaps table/cards at content-width breakpoint', has(finalCss, '.partner-phone-capital-mobile-list') && has(finalCss, '.partner-phone-capital-table-view') && has(finalCss, 'display: none !important'));

check('Settlement workspace has semantic responsive hooks', has(settlement, 'partner-settlement-workspace') && has(settlement, 'partner-settlement-workspace__header') && has(settlement, 'partner-settlement-workspace__metrics'));
check('Settlement KPI grid collapses safely', has(finalCss, '.partner-settlement-workspace__metrics') && has(finalCss, 'grid-template-columns: 1fr !important'));

check('Telegram split is container-width aware', has(finalCss, '.partner-telegram-customer-copy-v119 > .grid') && has(finalCss, 'grid-template-columns: 320px minmax(0, 1fr) !important'));
check('Telegram collapses to one column', has(finalCss, '.partner-telegram-customer-copy-v119 > .grid') && has(finalCss, 'grid-template-columns: 1fr !important'));

check('Ledger removes fixed 430px search width', has(finalCss, '.partner-ledger-v133__search-wrap') && has(finalCss, 'max-width: none !important') && has(finalCss, 'min-width: 0 !important'));
check('Ledger search input can shrink to 320px-class mobile widths', has(finalCss, '.partner-ledger-v133__search-input') && has(finalCss, 'box-sizing: border-box !important'));
check('Ledger search/filter layout collapses by container width', has(finalCss, '.partner-ledger-v133__search-grid') && has(finalCss, 'grid-template-columns: 1fr !important'));
check('Ledger summary collapses to one column on narrow containers', has(finalCss, '.partner-ledger-v133__summary-grid') && has(finalCss, 'grid-template-columns: 1fr !important'));

check('Purchase history has semantic section/header/filter hooks', ['partner-purchase-history-section', 'partner-purchase-history-header', 'partner-purchase-history-filters'].every((token) => has(purchases, token)));
check('Purchase history retains desktop table representation', has(purchases, 'partner-purchase-history-table-view'));
check('Purchase history adds compact mobile representation', has(purchases, 'partner-purchase-history-mobile-list') && has(purchases, 'partner-purchase-history-card'));
check('Purchase mobile cards include required operational fields', ['قیمت واحد', 'مبلغ کل', 'آخرین تغییر', 'IMEI:', 'نوع خرید'].every((token) => has(purchases, token)));
check('Purchase mobile/table views swap at constrained width', has(finalCss, '.partner-purchase-history-mobile-list') && has(finalCss, '.partner-purchase-history-table-view'));

check('Wide table shells keep overflow internal', has(finalCss, 'overflow-x: auto !important') && has(finalCss, 'overscroll-behavior-inline: contain'));
check('Pagination is single-column on narrow containers', has(finalCss, '.people-directory-pagination') && has(finalCss, 'grid-template-columns: 1fr !important'));

check('Partner edit modal has viewport fallback', has(finalCss, '.partner-edit-v98-overlay .customer-edit-v2__layout'));
check('Partner ledger edit modal collapses split layout', has(finalCss, '.partner-ledger-edit-modal-canonical .partner-ledger-edit-canonical') && has(finalCss, 'grid-template-columns: 1fr !important'));
check('Phone settlement modal has viewport fallback', has(finalCss, '.phone-settlement-finance-modal'));
check('Full settlement modal fixed widths are neutralized', has(finalCss, '.partner-full-settlement-modal-body') && has(finalCss, 'min-width: 0 !important'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nPartnerDetail responsive v135 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
