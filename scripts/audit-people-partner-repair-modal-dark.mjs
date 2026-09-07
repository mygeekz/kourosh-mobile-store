import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const modalCss = read('styles/components/modal-system.css');
const modalHeader = read('components/modals/ModalHeader.tsx');

// Phase 0 / v268 note:
// This audit intentionally guards the shared modal + field foundation. Older revisions
// enforced page-owned dark-mode scope classes and literal RGB surfaces. Those contracts
// were retired by the v264-v267 UI cleanup and must not be resurrected just to satisfy
// an audit. Dark/light surfaces now come from the shared semantic token chain.
for (const token of [
  '--kourosh-modal-panel: var(--ds-surface-elevated)',
  '--kourosh-modal-control-bg: var(--ds-control-bg)',
  '--kourosh-modal-control-bg-soft: var(--ds-surface-card-muted)',
  '--kourosh-modal-control-border: var(--ds-control-border)',
  '--kourosh-modal-control-text: var(--ds-control-fg)',
  '--kourosh-modal-control-muted: var(--ds-control-muted)',
]) {
  expect(modalCss.includes(token), `modal-system.css missing semantic palette token: ${token}`);
}
expect(
  !/--kourosh-modal-control-bg:\s*(?:#fff(?:fff)?|rgba\(15,\s*23,\s*42)/i.test(modalCss),
  'modal-system.css must not restore hard-coded light/dark control surfaces',
);

expect(
  /\.kourosh-modal__header\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*row\s*!important;/.test(modalCss),
  'canonical modal header must remain a true horizontal flex row',
);
expect(
  /\.kourosh-modal__title\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?text-overflow:\s*ellipsis;/.test(modalCss),
  'canonical modal title must stay on one line',
);
expect(
  modalHeader.indexOf('kourosh-modal__title modal-premium-title') < modalHeader.indexOf('kourosh-modal__description'),
  'modal description must render below the title',
);
expect(!modalHeader.includes('className="sr-only">{ariaDescription}'), 'modal description must not be hidden when provided');
expect(
  /\.kourosh-modal__icon\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?background:\s*transparent\s*!important;/.test(modalCss),
  'canonical modal header icon must be chrome-free',
);

const guardedModals = [
  {
    file: 'pages/customerDetail/CustomerProfileEditModal.tsx',
    required: ['<Modal', '<TextField', '<TextareaField', '<ModalActions'],
  },
  {
    file: 'pages/customerDetail/CustomerLedgerPaymentModal.tsx',
    required: ['<Modal', '<ModalField', '<TextareaField', '<ModalActions'],
  },
  {
    file: 'pages/partnerDetail/PartnerEditProfileModal.tsx',
    required: ['<Modal', '<ModalField', '<TextField', '<SelectField', '<TextareaField', '<ModalActions'],
  },
  {
    file: 'pages/partnerDetail/PartnerLedgerPaymentModal.tsx',
    required: ['<Modal', '<ModalField', '<TextareaField', '<ModalActions'],
  },
  {
    file: 'pages/partnerDetail/PartnerPhoneSettlementModal.tsx',
    required: ['<Modal', '<ModalField', '<TextareaField', '<ModalActions'],
  },
  {
    file: 'pages/partnerDetail/PartnerLedgerEntryEditModal.tsx',
    required: ['<Modal', '<ModalField', '<TextField', '<ModalActions'],
  },
  {
    file: 'pages/RepairDetail.tsx',
    required: ['Dialog as Modal', '<Modal', '<ModalField', '<SearchableSelectField', '<TextField', '<DialogActions'],
  },
];

for (const { file, required } of guardedModals) {
  const source = read(file);
  for (const token of required) {
    expect(source.includes(token), `${file}: shared modal/form primitive missing (${token})`);
  }

  // Native text/select/textarea controls in these modal flows would bypass the shared
  // density, RTL, validation and theme contracts. Specialized controls such as PriceInput
  // remain valid because they own their own canonical behavior.
  expect(!/<input\b/i.test(source), `${file}: native <input> bypasses shared form primitives`);
  expect(!/<select\b/i.test(source), `${file}: native <select> bypasses shared form primitives`);
  expect(!/<textarea\b/i.test(source), `${file}: native <textarea> bypasses shared form primitives`);
}

// Guard against reintroducing the obsolete page-owned dark-surface hooks that this audit
// used to require. The shared semantic modal contract is now the source of truth.
const retiredScopeTokens = [
  'customer-edit-v2-overlay',
  'partner-edit-v98-overlay',
  'partner-ledger-edit-canonical',
  'data-ui-repair-modal="add-part"',
];
for (const token of retiredScopeTokens) {
  for (const { file } of guardedModals) {
    expect(!read(file).includes(token), `${file}: retired page-owned modal scope restored (${token})`);
  }
}

if (failures.length) {
  console.error('People / Partner / Repair modal foundation audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('People / Partner / Repair modal foundation audit passed.');
