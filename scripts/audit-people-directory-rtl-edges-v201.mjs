import assert from 'node:assert/strict';
import fs from 'node:fs';

const version = fs.readFileSync('KOUROSH_SOURCE_VERSION', 'utf8').trim();
const css = fs.readFileSync('styles/system/customers-directory-v73.css', 'utf8');
const customer = fs.readFileSync('pages/Customers.tsx', 'utf8');
const partner = fs.readFileSync('components/people/PartnerDirectoryList.tsx', 'utf8');

assert.match(version, /^v\d+$/);
assert.match(css, /> \.ux-table-shell__body[\s\S]*?scrollbar-gutter: auto !important/);
assert.match(css, /tr\.table-row-state--overdue[\s\S]*?linear-gradient\(270deg/);
assert.match(css, /tr\.table-row-state--overdue[\s\S]*?box-shadow: inset -4px 0 0/);
assert.match(css, /tr\.table-row-state--due-today[\s\S]*?box-shadow: inset -4px 0 0/);
assert.match(css, /tr\.table-row-state--due-soon[\s\S]*?box-shadow: inset -4px 0 0/);
assert.match(customer, /customers-directory-v73__table/);
assert.match(partner, /customers-directory-v73__table/);

console.log('PASS Kourosh v201 People directory RTL edge audit');
