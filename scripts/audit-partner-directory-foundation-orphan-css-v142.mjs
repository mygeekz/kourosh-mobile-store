import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const retired = [
  'partners-action-btn',
  'partners-action-btn--spacious',
  'partners-actions',
  'partners-filter-chip',
  'partners-filter-chips',
  'partners-hero',
  'partners-hero-mini',
  'partners-hero-mini__label',
  'partners-hero-mini__value',
  'partners-hero__subtitle',
  'partners-hero__title',
  'partners-hero__title-row',
  'partners-mobile-actions',
  'partners-mobile-card',
  'partners-row-avatar',
  'partners-page-shell',
  'partners-shell',
  'partners-stat-card',
  'partners-table',
  'partners-table--people',
  'partners-table-row',
  'partners-table-shell',
  'partners-toolbar-search',
  'partners-toolbar-search-slot',
  'partners-toolbar-search__icon',
  'partners-toolbar-search__input',
  'partners-toolbar-shell',
  'partners-toolbar-summary',
  'partners-toolbar-summary__item',
  'partner-balance-chip',
  'partner-balance-chip__copy',
  'partner-col-name',
  'partner-col-type',
  'partner-col-phone',
  'partner-col-balance',
  'partner-col-actions',
  'partner-table-actions',
];

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });
const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
};
const classMatcher = (token) => new RegExp(`\\.${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);

const runtimeRoots = ['app', 'components', 'pages', 'server', 'shared'].map((rel) => path.join(root, rel));
const runtimeFiles = runtimeRoots.flatMap(walk).filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
const runtimeHits = [];
for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of retired) {
    if (text.includes(token)) runtimeHits.push(`${path.relative(root, file)}:${token}`);
  }
}
check('Retired Partner Directory contracts have no runtime references', runtimeHits.length === 0, runtimeHits.join(', '));

const cssFiles = walk(path.join(root, 'styles')).filter((file) => file.endsWith('.css'));
const activeFoundationCss = cssFiles.filter((file) => {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return !rel.startsWith('styles/generated/') && !rel.startsWith('styles/system/legacy-quarantine/');
});
const activeCssHits = [];
for (const file of activeFoundationCss) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of retired) {
    if (classMatcher(token).test(text)) activeCssHits.push(`${path.relative(root, file)}:${token}`);
  }
}
check('No retired Partner Directory selectors remain in active non-quarantine CSS foundations', activeCssHits.length === 0, activeCssHits.join(', '));

const listPath = path.join(root, 'components/people/PartnerDirectoryList.tsx');
const list = fs.readFileSync(listPath, 'utf8');
check(
  'PartnerDirectoryList remains primitive/utility-only',
  !/import\s+['"][^'"]+\.css['"]/.test(list)
    && list.includes('<DataTableShell')
    && list.includes('<Surface')
    && list.includes('<TableActionGroup')
    && list.includes('@container min-w-0'),
);
check('PartnerDirectoryList does not reintroduce retired CSS contracts', retired.every((token) => !list.includes(token)));

const toolbar = fs.readFileSync(path.join(root, 'components/people/PeopleDirectoryToolbar.tsx'), 'utf8');
const overview = fs.readFileSync(path.join(root, 'components/people/PeopleDirectoryOverview.tsx'), 'utf8');
check('Shared people toolbar stays free of retired Partner CSS contracts', retired.every((token) => !toolbar.includes(token)) && !/import\s+['"][^'"]+\.css['"]/.test(toolbar));
check('Shared people overview stays free of retired Partner CSS contracts', retired.every((token) => !overview.includes(token)) && !/import\s+['"][^'"]+\.css['"]/.test(overview));

const unifiedButtons = fs.readFileSync(path.join(root, 'styles/components/unified-buttons.css'), 'utf8');
check('Shared button selectors were preserved while Partner aliases were removed', unifiedButtons.includes('.people-action-btn') && unifiedButtons.includes('.ux-btn') && !classMatcher('partners-action-btn').test(unifiedButtons));

const tableActions = fs.readFileSync(path.join(root, 'styles/system/table-actions-foundation.css'), 'utf8');
check('Shared customer/product/report table-action selectors remain intact', tableActions.includes('.people-table-shell') && tableActions.includes('.product-row-action-btn') && tableActions.includes('.report-page table') && !classMatcher('partners-table-shell').test(tableActions));

const peopleRuntime = fs.readFileSync(path.join(root, 'styles/system/people-runtime/people-commercial-redesign-foundation.css'), 'utf8');
check('Customer/people commercial foundation remains present after Partner orphan cleanup', peopleRuntime.includes('.customers-hero') || peopleRuntime.includes('.people-'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nPartner directory foundation orphan CSS v142 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
