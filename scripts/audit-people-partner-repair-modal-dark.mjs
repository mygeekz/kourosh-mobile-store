import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const modalCss = read('styles/components/modal-system.css');
const modalHeader = read('components/modals/ModalHeader.tsx');
const peopleCss = read('styles/system/modal-people-foundation.css');
const partnerCss = read('styles/system/modal-partner-foundation.css');
const customerEditCss = read('styles/system/customer-detail/customer-edit-modal-v60-final.css');
const customerLedgerCss = read('styles/system/customer-detail/customer-ledger-real-responsive-fix.css');
const customerLedgerView = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const customerDetailRender = read('pages/customerDetail/CustomerDetailRender.tsx');
const customerLedgerPaymentView = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const repairCss = read('styles/system/products-services-repairs/services-inventory-foundation.css');
const detailCss = read('styles/components/detail.css');
const generatedTailwindCss = read('styles/generated/tailwind-entry.generated.css');
const peopleCommercialCss = read('styles/system/people-runtime/people-commercial-redesign-foundation.css');
const peopleDetailPass2Css = read('styles/system/people-detail-redesign/people-detail-redesign-pass-2.css');

for (const token of [
  '--kourosh-modal-panel: var(--ds-surface-elevated)',
  '--kourosh-modal-control-bg: var(--ds-control-bg)',
  '--kourosh-modal-control-bg-soft: var(--ds-surface-card-muted)',
  '--kourosh-modal-control-border: var(--ds-control-border)',
  '--kourosh-modal-control-text: var(--ds-control-fg)',
  '--kourosh-modal-control-muted: var(--ds-control-muted)',
]) expect(modalCss.includes(token), `modal-system.css missing semantic palette token: ${token}`);
expect(!/--kourosh-modal-control-bg:\s*(?:#fff(?:fff)?|rgba\(15,\s*23,\s*42)/i.test(modalCss), 'modal-system.css must not restore hard-coded light/dark control surfaces');

expect(/\.kourosh-modal__header\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*row\s*!important;/.test(modalCss), 'canonical modal header must remain a true horizontal flex row');
expect(/\.kourosh-modal__title\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?text-overflow:\s*ellipsis;/.test(modalCss), 'canonical modal title must stay on one line');
expect(modalHeader.indexOf('kourosh-modal__title modal-premium-title') < modalHeader.indexOf('kourosh-modal__description'), 'modal description must render below the title');
expect(!modalHeader.includes('className="sr-only">{ariaDescription}'), 'modal description must not be hidden when provided');
expect(/\.kourosh-modal__icon\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?background:\s*transparent\s*!important;/.test(modalCss), 'canonical modal header icon must be chrome-free');
expect(/\.service-modal-v57 \.kourosh-modal__header\s*\{[^}]*min-height:\s*64px/.test(repairCss), 'service modal header must use the compact horizontal header height');
expect(!/\.service-modal-v57 \.kourosh-modal__header\s*\{[^}]*grid-template-columns:/.test(repairCss), 'service modal must not restore the broken RTL grid header');
expect(/\.service-modal-v57 \.kourosh-modal__icon[\s\S]*?border:\s*0\s*!important;[\s\S]*?background:\s*transparent\s*!important;/.test(repairCss), 'service modal header icon must be chrome-free');

for (const [file, source] of [
  ['modal-people-foundation.css', peopleCss],
  ['modal-partner-foundation.css', partnerCss],
  ['customer-edit-modal-v60-final.css', customerEditCss],
  ['customer-ledger-real-responsive-fix.css', customerLedgerCss],
]) {
  expect(source.includes('var(--kourosh-modal-control-bg)'), `${file} is not using the canonical dark-aware surface token`);
  expect(!/background(?:-color)?:\s*(?:#fff(?:fff)?|rgb\(255,\s*255,\s*255\))\s*!important/i.test(source), `${file} reintroduced an important light-only background`);
}

expect(repairCss.includes('--service-v57-panel: rgb(15, 23, 42)'), 'service/repair modal dark surface variables are incomplete');
expect(repairCss.includes('var(--service-v57-panel)'), 'service/repair modal does not consume its surface token');
expect(customerLedgerView.includes('customer-ledger-surface'), 'customer ledger must expose its dedicated surface class');
expect(customerLedgerView.includes('data-ui-customer-ledger-root="standalone"'), 'customer ledger must expose its standalone root wrapper');
expect(!customerLedgerView.includes('customer-ledger-surface detail-card'), 'customer ledger must stay outside the generic detail-card surface stack');
expect(customerLedgerView.includes('data-ui-customer-ledger-surface="solid"'), 'customer ledger solid surface marker is missing');
expect(customerLedgerView.includes('data-ui-customer-ledger-panel="scoped"'), 'customer ledger scoped panel marker is missing');
expect(!/dark:bg-[a-z0-9-]+\/\d+/i.test(customerLedgerView), 'customer ledger runtime must not use translucent dark background utilities');
expect(customerDetailRender.includes('data-ui-customer-detail-layout="isolated-ledger-root"'), 'customer detail must expose the fully isolated ledger layout marker');
expect(customerDetailRender.includes('className="customer-detail-page-root space-y-8"'), 'customer detail must use a neutral outer page root');
expect(!/className="customer-detail-page-root[^"]*"[\s\S]{0,180}data-ui-people-page=/.test(customerDetailRender), 'neutral customer page root must not carry legacy people-page scope');
expect(/data-ui-customer-detail-legacy-shell="profile-messaging"[\s\S]*?<CustomerTelegramConversationSection ctx=\{ctx\} \/>[\s\S]*?<\/div>[\s\S]*?<CustomerLedgerRenderSection ctx=\{ctx\} \/>/.test(customerDetailRender), 'customer ledger must render after the legacy profile/messaging shell has closed');
expect(customerLedgerCss.includes('.customer-ledger-section-shell[data-ui-customer-ledger-root="standalone"]'), 'customer ledger must own a standalone scoped root');
for (const token of [
  'background: rgb(2, 6, 23)',
  'background-color: rgb(2, 6, 23)',
  'border-color: rgb(30, 41, 59)',
]) expect(customerLedgerCss.includes(token), `customer ledger solid dark contract is missing token: ${token}`);
expect(!/display:\s*contents;/.test(customerLedgerCss), 'customer ledger scoped contract must not use display: contents');
expect(/data-ui-customer-ledger-surface=\"solid\"[\s\S]*?background:\s*rgb\(2, 6, 23\)/.test(customerLedgerCss), 'customer ledger solid surface must own the dark background');
expect(/\.customer-ledger-panel\s*\{[\s\S]*?background:\s*transparent;/.test(customerLedgerCss), 'customer ledger panel must remain locally scoped and transparent');
expect(/\.customer-ledger-stack\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*20px;/.test(customerLedgerCss), 'customer ledger content stack must own local spacing');
expect(customerLedgerPaymentView.includes('people-finance-modal__balance-copy'), 'customer payment modal current balance copy is missing');
expect(customerLedgerPaymentView.includes('مانده بعد از ثبت'), 'customer payment modal next-balance preview is missing');
expect(/\.people-finance-modal\.ledger-payment-modal :where\(\.ledger-payment-modal__balance-card, \.ledger-payment-modal__preview-card\)\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?direction:\s*rtl\s*!important;[\s\S]*?text-align:\s*right\s*!important;/.test(modalCss), 'customer payment balance cards must use stable RTL flex geometry');
expect(/\.ledger-payment-modal__balance-card \.people-finance-modal__balance-copy,[\s\S]*?\.ledger-payment-modal__preview-card > div\s*\{[\s\S]*?flex:\s*1 1 auto\s*!important;[\s\S]*?text-align:\s*right\s*!important;/.test(modalCss), 'customer payment current/next balance copy must stay right-aligned');
for (const [file, source] of [['detail.css', detailCss], ['people-commercial-redesign-foundation.css', peopleCommercialCss], ['people-detail-redesign-pass-2.css', peopleDetailPass2Css]]) {
  expect(source.includes('div:not(.customer-ledger-surface)'), `${file} must exclude the dedicated customer ledger from its generic surface selector`);
}
expect(generatedTailwindCss.includes('#customer-ledger-section + div:not(.customer-ledger-surface),'), 'generated Tailwind entry must preserve the customer-ledger exclusion');
expect(!generatedTailwindCss.includes('#customer-ledger-section + div,'), 'generated Tailwind entry must not contain the stale generic customer-ledger selector');
expect(customerLedgerView.includes('customer-ledger-stack'), 'customer ledger must expose its scoped content stack');
expect(customerLedgerView.includes('customer-ledger-header-card'), 'customer ledger header must own its own raised surface');
expect(!customerLedgerView.includes('data-ui-customer-ledger-panel="layout-only"'), 'customer ledger must not restore the broken layout-only panel contract');

const runtimeScopes = [
  ['pages/customerDetail/CustomerProfileEditModal.tsx', 'customer-edit-v2-overlay'],
  ['pages/customerDetail/CustomerLedgerPaymentModal.tsx', 'ledger-payment-modal--customer'],
  ['pages/partnerDetail/PartnerEditProfileModal.tsx', 'partner-edit-v98-overlay'],
  ['pages/partnerDetail/PartnerLedgerPaymentModal.tsx', 'ledger-payment-modal--partner'],
  ['pages/partnerDetail/PartnerPhoneSettlementModal.tsx', 'phone-settlement-finance-modal'],
  ['pages/partnerDetail/PartnerLedgerEntryEditModal.tsx', 'partner-ledger-edit-canonical'],
  ['pages/RepairDetail.tsx', 'data-ui-repair-modal="add-part"'],
];
for (const [file, token] of runtimeScopes) {
  expect(read(file).includes(token), `${file}: required dark-theme scope token missing (${token})`);
}

if (failures.length) {
  console.error('People / Partner / Repair modal dark audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('People / Partner / Repair modal dark audit passed.');
