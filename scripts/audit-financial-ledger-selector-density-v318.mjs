import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 318, `KOUROSH_SOURCE_VERSION must be v318 or successor; found ${version}`);

const selector = read('components/people/LedgerTransactionTypeSelector.tsx');
const partner = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const customer = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const css = read('styles/components/modal-system.css');
const pkg = JSON.parse(read('package.json'));

assert.ok(selector.includes('data-ui-ledger-density="compact-v318"'), 'Shared ledger selector must expose the compact v318 density contract');
assert.ok(selector.includes('data-ui-ledger-type-selector="v317"'), 'Shared selector must retain the v317 structural contract');
assert.ok(partner.includes('<LedgerTransactionTypeSelector'), 'Partner ledger must keep using the shared selector');
assert.ok(customer.includes('<LedgerTransactionTypeSelector'), 'Customer ledger must keep using the shared selector');
assert.ok(css.includes('v318 — compact shared ledger transaction selector.'), 'Canonical modal CSS must include the v318 compact density block');
assert.ok(css.includes("[data-ui-ledger-density='compact-v318'] .ledger-transaction-type-head"), 'Transaction heading surface must be compacted by the shared v318 contract');
assert.ok(css.includes("min-height: 56px !important;"), 'Compact transaction surfaces must target 56px minimum height');
assert.ok(css.includes("[data-ui-ledger-density='compact-v318'] button[data-ui-ledger-type-control='native-v317']"), 'Both transaction cards must share the compact native control geometry');
assert.equal(pkg.scripts.prebuild, 'npm run prepare:production-styles', 'Normal prebuild must remain lightweight');
assert.ok(pkg.scripts['audit:release']?.includes('audit:financial-ledger-density-v318'), 'Release audit chain must include the v318 density verification');

console.log('v318 shared partner/customer ledger selector compact-density audit passed.');
