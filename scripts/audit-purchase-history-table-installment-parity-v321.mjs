import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 321, `KOUROSH_SOURCE_VERSION must be v321 or successor; found ${version}`);

const partner = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
assert.ok(partner.includes('data-ui-purchase-history-parity="installments-v321"'), 'Partner purchase history must publish installment parity marker');
assert.ok(partner.includes('data-ui-purchase-history-kind="partner"'), 'Partner purchase history must publish its scoped kind marker');
assert.ok(partner.includes('className="w-full overflow-x-auto overscroll-x-contain rounded-xl border'), 'Partner purchase history viewport must own ordinary installment-like horizontal overflow geometry');
assert.ok(partner.includes('layout="auto" density="compact"'), 'Partner purchase history must keep the approved auto/compact table contract');

const customer = read('pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx');
assert.ok(customer.includes('data-ui-purchase-history-parity="installments-v321"'), 'Customer purchase history must publish installment parity marker');
assert.ok(customer.includes('data-ui-purchase-history-kind="customer"'), 'Customer purchase history must publish its scoped kind marker');
assert.ok(customer.includes('className="w-full overflow-x-auto overscroll-x-contain"'), 'Customer purchase history viewport must own ordinary installment-like horizontal overflow geometry');
assert.ok(customer.includes('data-ui-customer-purchase-history="standard-v297"'), 'Customer history must preserve its existing standard contract');

const css = read('styles/components/tables.css');
assert.ok(css.includes('v321 — Customer/Partner purchase-history table parity with Installments.'), 'Table CSS must include v321 purchase-history parity block');
assert.ok(css.includes('[data-ui-purchase-history-parity="installments-v321"][data-ui-table-viewport="true"]'), 'Purchase-history viewport must have a scoped parity owner');
assert.ok(css.includes('scrollbar-gutter: auto !important;'), 'Purchase-history viewports must disable the RTL stable gutter');
assert.ok(css.includes('padding-inline: 0 !important;'), 'Purchase-history viewports must not reserve inline padding');
assert.ok(css.includes('margin-inline: 0 !important;'), 'Purchase-history viewport/table must reach both inline edges');

const globalContract = read('styles/system/ui-contracts/table-card-contract-phase6.css');
if (versionNumber < 322) {
  assert.ok(globalContract.includes('scrollbar-gutter: stable;'), 'Global TableViewport contract remains unchanged before v322; v321 stays scoped');
} else {
  assert.ok(globalContract.includes('scrollbar-gutter: auto;'), 'v322+ promotes no-gutter edge geometry to the canonical TableViewport contract');
}

console.log('v321 customer/partner purchase-history table parity with installments audit passed.');
