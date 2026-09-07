import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 320, `KOUROSH_SOURCE_VERSION must be v320 or successor; found ${version}`);

const directory = read('components/ui/ManagementDirectoryTable.tsx');
assert.ok(directory.includes('data-ui-directory-table-parity="installments-v320"'), 'ManagementDirectoryTable must publish installment parity marker');
assert.ok(directory.includes('<TableViewport'), 'ManagementDirectoryTable must keep canonical TableViewport ownership');
assert.ok(directory.includes('layout="managed"'), 'ManagementDirectoryTable must remain a managed table');

const customers = read('pages/Customers.tsx');
const partners = read('components/people/PartnerDirectoryList.tsx');
for (const [label, source] of [['Customers', customers], ['Partners', partners]]) {
  assert.ok(source.includes('sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle'), `${label} action cell must match Installments sticky action geometry`);
  assert.ok(!source.includes('sticky end-0 z-10 border-s border-slate-200 bg-inherit'), `${label} action cell must not add a separate inline-start border/gap`);
}

const css = read('styles/components/tables.css');
assert.ok(css.includes('v320 — Customer/Partner directory parity with the healthy Installments table.'), 'Table CSS must contain the v320 parity block');
assert.ok(css.includes('[data-ui-directory-table-parity="installments-v320"] [data-ui-table-viewport="true"]'), 'Directory viewport must have a scoped parity owner');
assert.ok(css.includes('scrollbar-gutter: auto !important;'), 'Directory viewport must disable the RTL stable scrollbar gutter');
assert.ok(css.includes('padding-inline: 0 !important;'), 'Directory viewport must not add inline padding');
assert.ok(css.includes('margin-inline: 0 !important;'), 'Directory viewport/table must reach both inline edges');

const tableContract = read('styles/system/ui-contracts/table-card-contract-phase6.css');
if (versionNumber < 322) {
  assert.ok(tableContract.includes('scrollbar-gutter: stable;'), 'Global TableViewport contract remains intact before v322; v320 is a scoped directory override');
} else {
  assert.ok(tableContract.includes('scrollbar-gutter: auto;'), 'v322+ promotes no-gutter edge geometry to the canonical TableViewport contract');
}

console.log('v320 customer/partner directory table parity with installments audit passed.');
