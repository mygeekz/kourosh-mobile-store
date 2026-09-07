import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 314, `KOUROSH_SOURCE_VERSION must be v314 or successor; found ${version}`);

const modal = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const sharedSelector = versionNumber >= 317 ? read('components/people/LedgerTransactionTypeSelector.tsx') : '';
assert.ok(modal.includes('data-ui-partner-ledger-payment="v314"') || versionNumber > 314, 'Partner ledger payment modal must retain the v314 redesign semantics');
assert.ok(modal.includes('ledger-payment-modal ledger-payment-modal--partner'), 'Partner ledger modal must use the canonical ledger-payment workspace');
assert.ok(modal.includes('ledger-payment-modal__type-strip') || sharedSelector.includes('ledger-payment-modal__type-strip'), 'Transaction direction must remain a primary decision strip');
assert.ok(modal.includes('ledger-payment-modal__workspace'), 'Partner ledger modal must use the canonical workspace split');
assert.ok(modal.includes('ledger-payment-modal__account-panel'), 'Partner ledger modal must contain a compact account summary panel');
assert.ok(modal.includes('ledger-payment-modal__entry-panel'), 'Partner ledger modal must contain the transaction entry panel');
assert.ok(modal.includes('people-amount-chip'), 'Quick amount actions must use the canonical lightweight amount-chip control');
assert.ok(modal.includes('people-note-template'), 'Description suggestions must use the canonical lightweight note-template control');
assert.ok(modal.includes('ledger-payment-modal__impact-row'), 'Partner ledger modal must preview the transaction impact');
assert.ok(modal.includes('hideHelper={false}'), 'Partner ledger actions must show the registration safety helper');
assert.ok(!modal.includes('className="space-y-4"'), 'Legacy generic modal stack must not return');

const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
assert.ok(controller.includes("const actionLabel = ledgerDirection === 'receipt' ? 'دریافت' : 'پرداخت';"), 'Ledger validation labels must follow the selected transaction direction');

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('v314 — partner ledger payment modal polish'), 'Canonical modal CSS must retain the v314 partner ledger foundation');
assert.ok(css.includes('.ledger-payment-modal--partner .ledger-payment-modal__impact-row') || css.includes('.financial-entry-modal .ledger-payment-modal__impact-row'), 'Transaction impact row must be styled by the canonical modal system');

console.log('v314 partner ledger payment modal redesign audit passed.');
