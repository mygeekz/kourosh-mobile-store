import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 315, `KOUROSH_SOURCE_VERSION must be v315 or successor; found ${version}`);

const modal = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const customerModal = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const sharedSelector = versionNumber >= 317 ? read('components/people/LedgerTransactionTypeSelector.tsx') : '';

if (versionNumber >= 317) {
  assert.ok(modal.includes('data-ui-partner-ledger-layout="shared-v317"'), 'Partner ledger modal must use the shared v317 selector layout');
  assert.ok(customerModal.includes('data-ui-customer-ledger-layout="shared-v317"'), 'Customer ledger modal must use the shared v317 selector layout');
  assert.ok(sharedSelector.includes('<button'), 'Shared transaction direction cards must use native semantic buttons');
  assert.ok(sharedSelector.includes('data-ui-ledger-type-control="native-v317"'), 'Shared transaction direction cards must publish the native v317 contract');
  assert.ok(!sharedSelector.includes('<Button'), 'Compound transaction direction cards must not use the wrapped shared Button primitive');
  assert.ok(sharedSelector.includes('writing-mode') === false, 'Writing mode belongs to canonical CSS, not inline component styling');
} else {
  assert.ok(modal.includes('data-ui-partner-ledger-layout="native-v315"'), 'Partner ledger modal must expose the v315 runtime layout contract');
  assert.ok(modal.includes('data-ui-ledger-type-control="native-v315"'), 'Direction controls must expose the native v315 control contract');
}

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('v315 — partner ledger direction-card runtime hardening'), 'Canonical modal CSS must retain the v315 runtime hardening block');
assert.ok(css.includes('writing-mode: horizontal-tb !important;'), 'Direction-card text must explicitly remain horizontal');
if (versionNumber >= 317) {
  assert.ok(css.includes("[data-ui-ledger-type-selector='v317'] button[data-ui-ledger-type-control='native-v317']"), 'Shared native direction-card geometry must be owned by canonical modal CSS');
} else {
  assert.ok(css.includes("[data-ui-partner-ledger-layout='native-v315'] button.ledger-payment-modal__type-card"), 'Native direction-card geometry must be owned by canonical modal CSS');
}

console.log('v315 partner ledger payment runtime layout audit passed.');
