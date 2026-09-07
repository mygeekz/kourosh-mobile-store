import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 316, `KOUROSH_SOURCE_VERSION must be v316 or successor; found ${version}`);

const partnerModal = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const customerModal = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const sharedSelector = versionNumber >= 317 ? read('components/people/LedgerTransactionTypeSelector.tsx') : '';

assert.ok(partnerModal.includes('data-ui-partner-ledger-payment="v316"') || versionNumber > 316, 'Partner ledger modal must retain the v316 payment polish semantics');
assert.ok(partnerModal.includes('data-ui-partner-ledger-polish="v316"') || versionNumber > 316, 'Partner ledger modal must retain the v316 polish semantics');
assert.ok((partnerModal + sharedSelector).includes('fa-right-left'), 'Financial ledger type header must use the supported directional icon');
assert.ok((partnerModal + sharedSelector).includes('fa-download'), 'Receipt action must use a supported download/receipt icon');
assert.ok(partnerModal.includes("submitIconClass={ledgerDirection === 'receipt' ? 'fa-solid fa-download' : 'fa-solid fa-arrow-up-from-bracket'}"), 'Receipt submit button must use the supported fa-download icon');
assert.ok(customerModal.includes('data-ui-customer-ledger-polish="v316"') || versionNumber > 316, 'Customer ledger modal must retain the v316 polish semantics');

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('v316 — partner ledger payment polish.'), 'Canonical modal CSS must retain the v316 polish block');
if (versionNumber >= 317) {
  assert.ok(css.includes("ledger-payment-modal__type-card--success.is-active .ledger-payment-modal__type-check"), 'Success direction must retain semantic active-check styling');
  assert.ok(css.includes("ledger-payment-modal__type-card--warning.is-active .ledger-payment-modal__type-check"), 'Warning direction must retain semantic active-check styling');
} else {
  assert.ok(css.includes("[data-ui-partner-ledger-polish='v316'] button.ledger-payment-modal__type-card--success.is-active .ledger-payment-modal__type-check"), 'v316 CSS must define semantic success check styling');
}

console.log('v316 partner ledger payment polish audit passed.');
