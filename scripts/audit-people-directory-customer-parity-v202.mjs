import assert from 'node:assert/strict';
import fs from 'node:fs';

const version = fs.readFileSync('KOUROSH_SOURCE_VERSION', 'utf8').trim();
const legacy = fs.readFileSync('styles/system/legacy-quarantine/select-customer-compat-foundation.css', 'utf8');
const css = fs.readFileSync('styles/system/customers-directory-v73.css', 'utf8');
const overview = fs.readFileSync('components/people/PeopleDirectoryOverview.tsx', 'utf8');
const customers = fs.readFileSync('pages/Customers.tsx', 'utf8');
const partners = fs.readFileSync('pages/Partners.tsx', 'utf8');

assert.match(version, /^v\d+$/);
assert.doesNotMatch(legacy, /people-customers-shell \[class\*="grid"\] \+ \[class\*="grid"\]/);
assert.doesNotMatch(legacy, /people-customers-shell \[class\*="rounded"\] \+ \[class\*="rounded"\]/);
assert.match(css, /data-ui-people-directory-overview="shared"\] \[class\*="rounded"\] \+ \[class\*="rounded"\][\s\S]*?margin-top: 0 !important/);
assert.match(css, /data-ui-people-toolbar="shared"\] \[class\*="rounded"\] \+ \[class\*="rounded"\]/);
assert.match(overview, /data-ui-people-directory-overview="shared"/);
assert.match(customers, /<PeopleDirectoryOverview/);
assert.match(partners, /<PeopleDirectoryOverview/);

console.log('PASS Kourosh v202 Customer/Partner compact overview parity audit');
