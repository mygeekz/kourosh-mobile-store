import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'components/header/HeaderSearch.tsx',
  'components/header/HeaderTitleArea.tsx',
  'components/header/HeaderThemeToggle.tsx',
  'components/header/HeaderProfileMenu.tsx',
  'components/header/HeaderQuickActions.tsx',
  'components/header/headerTypes.ts',
  'components/header/useHeaderQuickData.ts',
  'components/header/useHeaderSearch.ts',
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing extracted header module: ${file}`);
}

const header = read('components/Header.tsx');
const headerLines = header.split(/\r?\n/).length;
if (headerLines > 1100) {
  failures.push(`Header.tsx is still too large for Phase 31 target: ${headerLines} lines`);
}

const requiredHeaderSymbols = [
  'HeaderSearch',
  'HeaderTitleArea',
  'HeaderThemeToggle',
  'HeaderProfileMenu',
  'HeaderQuickActions',
  'useHeaderQuickData',
  'useHeaderSearch',
];
if (!header.includes("from './header/index'")) {
  failures.push('Header.tsx must import extracted header modules from the ./header/index barrel.');
}
for (const symbol of requiredHeaderSymbols) {
  if (!header.includes(symbol)) failures.push(`Header.tsx missing extracted header symbol: ${symbol}`);
}

const forbiddenHeaderFragments = [
  'type HeaderSearchDomain =',
  'const headerDomainMeta =',
  'const ThemeIcon =',
  'onToggleSidebar, onOpenCommandPalette',
];
for (const fragment of forbiddenHeaderFragments) {
  if (header.includes(fragment)) failures.push(`Header.tsx still contains legacy fragment: ${fragment}`);
}

const search = read('components/header/HeaderSearch.tsx');
if (!search.includes('const headerDomainMeta')) {
  failures.push('HeaderSearch.tsx should own search-domain metadata after extraction.');
}
if (!search.includes('Mobile Search Trigger')) {
  failures.push('HeaderSearch.tsx should own both desktop search and mobile search trigger.');
}

const profile = read('components/header/HeaderProfileMenu.tsx');
if (!profile.includes('role="menu"') || !profile.includes('role="menuitem"')) {
  failures.push('HeaderProfileMenu.tsx lost menu accessibility roles.');
}

if (failures.length) {
  console.error('Header decomposition audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  headerLines,
  extractedFiles: requiredFiles,
}, null, 2));
