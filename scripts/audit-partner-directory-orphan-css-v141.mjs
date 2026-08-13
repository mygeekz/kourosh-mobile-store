import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const legacyRoot = path.join(root, 'styles/system/legacy-quarantine');

const retired = [
  'partners-table-shell',
  'partners-table--people',
  'partners-table-head',
  'partners-table-row',
  'partners-row-avatar',
  'partners-mobile-card',
  'partners-mobile-actions',
  'partners-actions',
  'partners-action-btn',
  'partners-action-btn--primary',
  'partners-action-btn--secondary',
  'partners-action-btn--danger',
  'partners-action-btn--spacious',
  'partner-balance-chip',
  'partner-balance-chip__copy',
  'partner-col-name',
  'partner-col-type',
  'partner-col-phone',
  'partner-col-balance',
  'partner-col-actions',
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

const legacyCssFiles = walk(legacyRoot).filter((file) => file.endsWith('.css'));
const legacyCss = legacyCssFiles.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
const legacyHits = [];
for (const { file, text } of legacyCss) {
  for (const token of retired) {
    const matcher = new RegExp(`\\.${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?![\\w-])`);
    if (matcher.test(text)) legacyHits.push(`${path.relative(root, file)}:${token}`);
  }
}

const runtimeRoots = ['app', 'components', 'pages', 'server', 'shared'].map((rel) => path.join(root, rel));
const runtimeFiles = runtimeRoots.flatMap(walk).filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
const runtimeHits = [];
for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of retired) {
    if (text.includes(token)) runtimeHits.push(`${path.relative(root, file)}:${token}`);
  }
}

const list = fs.readFileSync(path.join(root, 'components/people/PartnerDirectoryList.tsx'), 'utf8');
const partnerPage = fs.readFileSync(path.join(root, 'pages/Partners.tsx'), 'utf8');

check('Legacy quarantine contains no retired partner directory selectors', legacyHits.length === 0, legacyHits.join(', '));
check('Runtime source contains no retired partner directory contracts', runtimeHits.length === 0, runtimeHits.join(', '));
check('PartnerDirectoryList remains utility/primitive-only', !/import\s+['"][^'"]+\.css['"]/.test(list) && list.includes('<DataTableShell') && list.includes('<Surface') && list.includes('<TableActionGroup'));
check('Partner directory still uses container-driven responsive layout', list.includes('@container min-w-0') && list.includes('@[900px]:block') && list.includes('@[900px]:hidden'));
check('Server-side directory pagination remains wired', partnerPage.includes("view: 'directory'") && partnerPage.includes('onPageChange={setPage}') && partnerPage.includes('onPageSizeChange={setPageSize}'));
check('No partner directory custom stylesheet was introduced', !fs.existsSync(path.join(root, 'styles/pages/partner-directory.css')) && !fs.existsSync(path.join(root, 'styles/system/partner-directory-v140.css')) && !fs.existsSync(path.join(root, 'styles/system/partner-directory-v141.css')));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nPartner directory orphan CSS v141 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
