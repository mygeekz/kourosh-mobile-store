import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 317, `KOUROSH_SOURCE_VERSION must be v317 or successor; found ${version}`);

const selector = read('components/people/LedgerTransactionTypeSelector.tsx');
const partner = read('pages/partnerDetail/PartnerLedgerPaymentModal.tsx');
const customer = read('pages/customerDetail/CustomerLedgerPaymentModal.tsx');
const expenses = read('pages/Expenses.tsx');
const css = read('styles/components/modal-system.css');
const pkg = JSON.parse(read('package.json'));

assert.ok(selector.includes('data-ui-ledger-type-selector="v317"'), 'Shared ledger type selector must expose the v317 contract');
assert.ok(selector.includes('data-ui-ledger-type-control="native-v317"'), 'Shared ledger type cards must use native v317 controls');
assert.ok(selector.includes('<button'), 'Shared ledger type cards must be semantic native buttons');
assert.ok(!selector.includes('<Button'), 'Shared compound cards must not use the wrapped Button primitive');

for (const [label, source] of [['partner', partner], ['customer', customer]]) {
  assert.ok(source.includes("import LedgerTransactionTypeSelector from '../../components/people/LedgerTransactionTypeSelector';"), `${label} ledger must use the shared selector component`);
  assert.ok(source.includes('<LedgerTransactionTypeSelector'), `${label} ledger must render the shared selector component`);
  assert.ok(source.includes('financial-entry-modal'), `${label} ledger modal must use the shared financial shell class`);
  assert.ok(source.includes('data-ui-financial-modal="v317"'), `${label} ledger form must expose the shared financial v317 marker`);
  assert.ok(source.includes('ledger-payment-modal__impact-row'), `${label} ledger must show live transaction impact`);
  assert.ok(source.includes('hideHelper={false}'), `${label} ledger footer must show the finance safety helper`);
}

assert.ok(partner.includes('data-ui-partner-ledger-layout="shared-v317"'), 'Partner ledger must publish shared-v317 layout');
assert.ok(customer.includes('data-ui-customer-ledger-layout="shared-v317"'), 'Customer ledger must publish shared-v317 layout');
assert.ok(expenses.includes('data-ui-financial-modal="v317"'), 'Expense entry modal must join the unified financial visual contract');
assert.ok(expenses.includes('panelClassName="expense-entry-modal"'), 'Expense entry modal must preserve its approved reference shell modifier');

assert.ok(css.includes('v317 — unified financial entry modals'), 'Canonical modal CSS must contain the v317 unified finance block');
assert.ok(css.includes("[data-ui-ledger-type-selector='v317']"), 'Canonical CSS must own the shared selector geometry');
assert.ok(css.includes('max-height: min(94dvh, 900px) !important;'), 'Financial modal shell must use the optimized viewport height');
assert.ok(css.includes('.financial-entry-modal .ledger-payment-modal__impact-row'), 'Live impact rows must share one canonical style');
assert.ok(css.includes(".expense-entry-modal [data-ui-financial-modal='v317'].financial-entry-modal__content"), 'Expense content must share the v317 density contract');

assert.equal(pkg.scripts.prebuild, 'npm run prepare:production-styles', 'Normal build prebuild must remain lightweight');
assert.ok(pkg.scripts['audit:release']?.includes('audit:financial-modals-v317'), 'Full release audits must include v317 finance verification');
assert.equal(pkg.scripts['verify:release'], 'npm run audit:release && npm run build', 'Release verification must run audits before the build');

console.log('v317 unified financial modals + lightweight build lifecycle audit passed.');
