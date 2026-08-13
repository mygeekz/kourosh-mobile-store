import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const shared = read('components/people/PeopleDirectoryOverview.tsx');
const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const partnerCss = read('styles/pages/partners.css');
const customerDirectoryCss = read('styles/system/customers-directory-v73.css');

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const has = (text, needle) => text.includes(needle);

const retiredClasses = [
  'people-unified-hero',
  'people-top-nav',
  'customers-overview-hero',
  'customers-hero-copy',
  'customers-hero-quickstats',
  'customers-hero-mini',
  'partners-overview-hero',
  'partners-hero-quickstats',
  'partners-hero-mini',
  'partners-stats-grid',
  'partners-stat-card',
];

check('Shared directory overview component exists', has(shared, 'const PeopleDirectoryOverview'));
check('Customer directory uses shared overview component', has(customers, '<PeopleDirectoryOverview') && has(customers, 'activeTab="customers"'));
check('Partner directory uses shared overview component', has(partners, '<PeopleDirectoryOverview') && has(partners, 'activeTab="partners"'));
check('Shared overview owns both tabs', has(shared, 'to="/customers"') && has(shared, 'to="/partners"'));
check('Shared overview owns hero quick stats and KPI grid', has(shared, 'quickStats.map') && has(shared, 'metrics.map'));
check('Customer overview supplies 2 quick stats and 5 KPI metrics', has(customers, "key: 'debt'") && has(customers, "key: 'risk'") && has(customers, 'metricsLabel="خلاصه مشتریان"'));
check('Partner overview supplies partner quick stats and KPI metrics', has(partners, "key: 'receivable'") && has(partners, 'metrics={partnerKpis}') && has(partners, 'metricsLabel="خلاصه همکاران"'));
check('Partner overview now appears before notification and filters', partners.indexOf('<PeopleDirectoryOverview') < partners.indexOf('<Notification message=') && partners.indexOf('<Notification message=') < partners.indexOf('<PeopleDirectoryToolbar'));
check('Shared component imports no CSS', !/import\s+['"][^'"]+\.css['"]/.test(shared));
check('Shared component uses only primitives and utility classes for layout', has(shared, "import { IconGlyph, Surface } from '@/components/ui'") && has(shared, 'rounded-[24px]') && has(shared, 'lg:grid-cols-'));
check('Customer page no longer carries retired header class contracts', retiredClasses.every((name) => !has(customers, name)));
check('Partner page no longer carries retired header class contracts', retiredClasses.every((name) => !has(partners, name)));
check('Deleted dedicated customer hero CSS is absent', !fs.existsSync(path.join(root, 'styles/pages/customers-shell.css')));
check('Partner page stylesheet no longer contains bespoke partner hero or KPI card rules', !has(partnerCss, '.partners-hero {') && !has(partnerCss, '.partners-hero-mini') && !has(partnerCss, '.partners-stat-card'));
check('Shared directory header has no dependency on customer/partner custom overview classes', !has(shared, 'customers-overview-hero') && !has(shared, 'partners-overview-hero') && !has(shared, 'people-unified-hero'));
check('Both directory headers share one implementation rather than copied markup', (customers.match(/<PeopleDirectoryOverview/g) || []).length === 1 && (partners.match(/<PeopleDirectoryOverview/g) || []).length === 1);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nPeople directory header v138 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
