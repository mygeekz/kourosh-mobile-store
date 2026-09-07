import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const overview = read('components/people/PeopleDirectoryOverview.tsx');
const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const partnerList = read('components/people/PartnerDirectoryList.tsx');
const css = read('styles/system/customers-directory-v73.css');

check(
  'Shared toolbar exposes stable layout hooks for search, filters, and reset',
  ['people-directory-toolbar__layout', 'people-directory-toolbar__search', 'people-directory-toolbar__filters', 'people-directory-toolbar__filter', 'people-directory-toolbar__reset']
    .every((token) => toolbar.includes(token)),
);
check(
  'Filter controls receive readable responsive columns instead of narrow fixed bases',
  css.includes('repeat(auto-fit, minmax(min(190px, 100%), 1fr))') && !toolbar.includes('basis-[148px]'),
);
check(
  'Customer and Partner pages use the same width-safe directory shell contract',
  customers.includes('mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4')
    && partners.includes('mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4'),
);
check(
  'Shared People tabs have a fixed width-safe hook',
  overview.includes('people-directory-overview__tabs')
    && overview.includes('data-ui-people-directory-tabs="true"')
    && css.includes('width: min(100%, 208px)'),
);
check(
  'Customer and Partner tables retain the canonical DataTableShell primitive',
  customers.includes('<DataTableShell className="customers-directory-v73__table-wrap"')
    && partnerList.includes('<DataTableShell className="customers-directory-v73__table-wrap"'),
);
check(
  'Nested list table shells are flattened to full width with a zero-inset scroll body',
  css.includes('.customers-directory-v73__list > .customers-directory-v73__table-wrap')
    && css.includes('border-radius: 0 !important')
    && css.includes('> .ux-table-shell__body')
    && css.includes('padding: 0 !important'),
);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nKourosh v199 People directory polish audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
