import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const lineCount = (relativePath) => read(relativePath).split(/\r?\n/).length;

const files = {
  shellBarrel: 'components/shell/index.ts',
  appRoutes: 'app/routes/AppRoutes.tsx',
  mainLayout: 'components/MainLayout.tsx',
  header: 'components/Header.tsx',
  sidebar: 'components/Sidebar.tsx',
  mobileBottomNav: 'components/mobile-bottom-nav/MobileBottomNav.tsx',
  mobileBottomNavHook: 'components/mobile-bottom-nav/useMobileBottomNavigation.ts',
  mobileBottomNavItems: 'components/mobile-bottom-nav/mobileBottomNavItems.ts',
  mobileBottomNavItemLink: 'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx',
  mainLayoutBarrel: 'components/main-layout/index.ts',
  headerBarrel: 'components/header/index.ts',
  sidebarBarrel: 'components/sidebar/index.ts',
  docsMd: 'docs/architecture/phase42-shell-boundary.md',
  docsJson: 'docs/architecture/phase42-shell-boundary.json',
};

for (const file of Object.values(files)) {
  if (!exists(file)) failures.push(`Missing shell-boundary file: ${file}`);
}

if (exists(files.shellBarrel)) {
  const shellBarrel = read(files.shellBarrel);
  const requiredExports = [
    "export { default as MainLayout } from '../MainLayout';",
    "export { default as Header } from '../Header';",
    "export { default as Sidebar } from '../Sidebar';",
    "export { default as MobileBottomNav } from '../MobileBottomNav';",
  ];
  for (const token of requiredExports) {
    if (!shellBarrel.includes(token)) failures.push(`components/shell/index.ts missing export: ${token}`);
  }
}

if (exists(files.appRoutes)) {
  const appRoutes = read(files.appRoutes);
  if (!appRoutes.includes("import { MainLayout } from '../../components/shell';")) {
    failures.push('AppRoutes.tsx should import MainLayout from ../../components/shell.');
  }
  if (appRoutes.includes("from '../../components/MainLayout'")) {
    failures.push('AppRoutes.tsx still imports MainLayout directly instead of the shell barrel.');
  }
}

const lineBudgets = {
  [files.mainLayout]: 180,
  [files.header]: 260,
  [files.sidebar]: 180,
  [files.mobileBottomNav]: 90,
};

for (const [file, budget] of Object.entries(lineBudgets)) {
  if (!exists(file)) continue;
  const lines = lineCount(file);
  if (lines > budget) failures.push(`${file} exceeds shell orchestrator line budget ${budget}; current: ${lines}`);
}

if (exists(files.mainLayout)) {
  const mainLayout = read(files.mainLayout);
  const requiredTokens = [
    "from './main-layout/index'",
    '<MainLayoutShell',
    '<Header',
    '<MainContentFrame',
    '<CommandPalette',
  ];
  for (const token of requiredTokens) {
    if (!mainLayout.includes(token)) failures.push(`MainLayout.tsx missing composition token: ${token}`);
  }
  const forbiddenTokens = [
    '../pages/',
    '<Sidebar',
    '<MobileBottomNav',
    '<Outlet />',
    'window.addEventListener',
    'localStorage.',
    'fetch(',
  ];
  for (const token of forbiddenTokens) {
    if (mainLayout.includes(token)) failures.push(`MainLayout.tsx leaks shell-external responsibility token: ${token}`);
  }
}

if (exists(files.header)) {
  const header = read(files.header);
  const requiredTokens = [
    "from './header/index'",
    'useHeaderSearch({ token })',
    'useHeaderQuickData({',
    'useHeaderCurrency()',
    '<HeaderShell',
  ];
  for (const token of requiredTokens) {
    if (!header.includes(token)) failures.push(`Header.tsx missing shell composition token: ${token}`);
  }
  const forbiddenTokens = ['../pages/', 'fetch(', 'window.addEventListener', 'setInterval('];
  for (const token of forbiddenTokens) {
    if (header.includes(token)) failures.push(`Header.tsx should not own extracted behavior token: ${token}`);
  }
}

if (exists(files.sidebar)) {
  const sidebar = read(files.sidebar);
  const requiredTokens = [
    "from './sidebar/index'",
    'useSidebarNavigationState({',
    '<SidebarBrandBar',
    '<SidebarNavTree',
    'flyoutLayout={flyoutLayout}',
    '<SidebarSupport',
  ];
  for (const token of requiredTokens) {
    if (!sidebar.includes(token)) failures.push(`Sidebar.tsx missing shell composition token: ${token}`);
  }
  const forbiddenTokens = ['../pages/', 'window.addEventListener', 'setTimeout(', 'getBoundingClientRect()'];
  for (const token of forbiddenTokens) {
    if (sidebar.includes(token)) failures.push(`Sidebar.tsx should not own extracted behavior token: ${token}`);
  }
}

if (exists(files.mobileBottomNav)) {
  const mobile = read(files.mobileBottomNav);
  for (const token of ['useMobileBottomNavigation()', '<MobileBottomNavShell>', '<MobileBottomNavPrimaryAction', '<MobileBottomNavMenuButton']) {
    if (!mobile.includes(token)) failures.push(`MobileBottomNav.tsx missing mobile shell composition token: ${token}`);
  }
  if (mobile.includes('../pages/')) failures.push('MobileBottomNav.tsx must not import page modules.');
}

if (exists(files.mobileBottomNavHook)) {
  const mobileHook = read(files.mobileBottomNavHook);
  for (const token of ['canAccessNavigationPath', 'BOTTOM_NAV_ITEMS', 'QUICK_SALE_PATH']) {
    if (!mobileHook.includes(token)) failures.push(`useMobileBottomNavigation.ts missing shell navigation token: ${token}`);
  }
}

if (exists(files.mobileBottomNavItems)) {
  const mobileItems = read(files.mobileBottomNavItems);
  for (const token of ['MobileBottomNavItem', 'BOTTOM_NAV_ITEMS', 'QUICK_SALE_PATH']) {
    if (!mobileItems.includes(token)) failures.push(`mobileBottomNavItems.ts missing metadata token: ${token}`);
  }
}

if (exists(files.mobileBottomNavItemLink)) {
  const mobileItemLink = read(files.mobileBottomNavItemLink);
  if (!mobileItemLink.includes('FontAwesomeIcon')) failures.push('MobileBottomNavItemLink.tsx should render icons through FontAwesomeIcon.');
}

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const relative = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(relative);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(relative);
  }
};
walk('.');

const forbiddenDirectShellImports = [
  { pattern: /from ['"]\.\.\/components\/MainLayout['"]|from ['"]\.\/components\/MainLayout['"]|from ['"].*components\/MainLayout['"]/, name: 'MainLayout' },
  { pattern: /from ['"]\.\.\/components\/Header['"]|from ['"]\.\/components\/Header['"]|from ['"].*components\/Header['"]/, name: 'Header' },
  { pattern: /from ['"]\.\.\/components\/Sidebar['"]|from ['"]\.\/components\/Sidebar['"]|from ['"].*components\/Sidebar['"]/, name: 'Sidebar' },
  { pattern: /from ['"]\.\.\/components\/MobileBottomNav['"]|from ['"]\.\/components\/MobileBottomNav['"]|from ['"].*components\/MobileBottomNav['"]/, name: 'MobileBottomNav' },
];

const allowedDirectImportFiles = new Set([
  './components/MainLayout.tsx',
  './components/main-layout/MainContentFrame.tsx',
  './components/main-layout/MainLayoutShell.tsx',
  './components/shell/index.ts',
]);

for (const file of sourceFiles) {
  const normalized = file.startsWith('./') ? file : `./${file}`;
  const content = read(file);
  for (const { pattern, name } of forbiddenDirectShellImports) {
    if (pattern.test(content) && !allowedDirectImportFiles.has(normalized)) {
      failures.push(`${file} imports shell component ${name} directly; use components/shell or an internal shell module boundary.`);
    }
  }
}

if (exists(files.docsJson)) {
  try {
    const docs = JSON.parse(read(files.docsJson));
    for (const expected of ['MainLayout', 'Header', 'Sidebar', 'MobileBottomNav']) {
      if (!docs.publicShellExports?.includes(expected)) failures.push(`phase42 shell docs missing public export: ${expected}`);
    }
  } catch (error) {
    failures.push(`Invalid docs/architecture/phase42-shell-boundary.json: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('Shell boundary audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  shellBarrel: files.shellBarrel,
  routeEntrypoint: files.appRoutes,
  lineCounts: {
    mainLayout: lineCount(files.mainLayout),
    header: lineCount(files.header),
    sidebar: lineCount(files.sidebar),
    mobileBottomNav: lineCount(files.mobileBottomNav),
  },
  publicShellExports: ['MainLayout', 'Header', 'Sidebar', 'MobileBottomNav'],
}, null, 2));
