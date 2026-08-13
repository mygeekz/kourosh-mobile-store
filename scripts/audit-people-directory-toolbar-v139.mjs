import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const shared = read('components/people/PeopleDirectoryToolbar.tsx');
const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const has = (text, needle) => text.includes(needle);

const retiredToolbarClasses = [
  'customers-directory-v73__filters',
  'customers-directory-v73__filter-search',
  'customers-directory-v73__select',
  'customers-directory-v73__reset',
  'partners-toolbar-shell',
  'partners-filter-chips',
  'partners-toolbar-summary',
  'partners-toolbar-summary__item',
  'partners-toolbar-search-slot',
  'people-sort-select',
  'people-toolbar-reset',
];

check('Shared people directory toolbar component exists', has(shared, 'const PeopleDirectoryToolbar'));
check('Customer directory uses shared toolbar exactly once', (customers.match(/<PeopleDirectoryToolbar/g) || []).length === 1);
check('Partner directory uses shared toolbar exactly once', (partners.match(/<PeopleDirectoryToolbar/g) || []).length === 1);
check('Shared toolbar owns search field', has(shared, '<AppSearchField'));
check('Shared toolbar owns all filter select rendering', has(shared, 'filters.map') && has(shared, '<SelectField'));
check('Shared toolbar owns canonical reset action', has(shared, 'fa-filter-circle-xmark') && has(shared, '>\n          پاکسازی\n'));
check('Shared toolbar search is clearable', has(shared, 'clearable'));
check('Shared toolbar is responsive using utility classes', has(shared, 'lg:flex-row') && has(shared, 'sm:flex-row') && has(shared, 'sm:flex-wrap'));
check('Shared toolbar uses UI Surface primitive', has(shared, '<Surface') && has(shared, 'surface="glass"'));
check('Shared toolbar imports no CSS', !/import\s+['"][^'"]+\.css['"]/.test(shared));
check('Shared toolbar has no customer-specific class contract', !has(shared, 'customers-directory-v73'));
check('Shared toolbar has no partner-specific class contract', !has(shared, 'partners-toolbar'));
check('Customer page retired custom toolbar classes are gone', retiredToolbarClasses.every((name) => !has(customers, name)));
check('Customer shared toolbar is outside legacy customer directory CSS scope', customers.indexOf('<PeopleDirectoryToolbar') < customers.indexOf('<div className="customers-directory-v73"'));
check('Partner page retired custom toolbar classes are gone', retiredToolbarClasses.every((name) => !has(partners, name)));
check('Customer toolbar preserves search field behavior', has(customers, 'searchValue={searchTerm}') && has(customers, 'onSearchChange={setSearchTerm}'));
check('Customer toolbar preserves balance filter', has(customers, "key: 'balance'") && has(customers, "setBalanceFilter(value as typeof balanceFilter)"));
check('Customer toolbar preserves tag filter', has(customers, "key: 'tag'") && has(customers, '...availableTags.map'));
check('Customer toolbar preserves risk filter and warning', has(customers, "key: 'risk'") && has(customers, "riskFilter === 'risky'"));
check('Customer toolbar preserves sort modes', has(customers, "key: 'sort'") && has(customers, "{ value: 'recent', label: 'آخرین فعالیت' }"));
check('Partner toolbar uses same shared search behavior', has(partners, 'searchValue={searchTerm}') && has(partners, 'onSearchChange={setSearchTerm}'));
check('Partner toolbar replaces bespoke chips with canonical balance select', has(partners, "key: 'balance'") && has(partners, "{ value: 'debt', label: 'بدهی به همکار' }"));
check('Partner toolbar preserves server sort modes', has(partners, "key: 'sort'") && has(partners, "{ value: 'recent', label: 'جدیدترین پرونده' }"));
check('Both pages keep reset semantics', has(customers, "setRiskFilter('all')") && has(partners, "setBalanceFilter('all'); setSortMode('name')"));
check('No AppSearchField page-level import remains after shared extraction', !has(customers, "import AppSearchField") && !has(partners, "import AppSearchField"));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nPeople directory toolbar v139 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
