import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];

const files = {
  layout: 'components/MainLayout.tsx',
  barrel: 'components/main-layout/index.ts',
  shell: 'components/main-layout/MainLayoutShell.tsx',
  content: 'components/main-layout/MainContentFrame.tsx',
  sidebarHook: 'components/main-layout/useMainLayoutSidebar.ts',
  titleHook: 'components/main-layout/useCurrentPageTitle.ts',
  recentHook: 'components/main-layout/useRecentPageTracker.ts',
  paletteHook: 'components/main-layout/useCommandPaletteShortcut.ts',
};

for (const file of Object.values(files)) {
  if (!exists(file)) failures.push(`Missing required Phase 41 file: ${file}`);
}

if (exists(files.layout)) {
  const layout = read(files.layout);
  const lineCount = layout.split(/\r?\n/).length;
  if (lineCount > 180) failures.push(`MainLayout.tsx should stay a compact orchestrator after Phase 41; current line count: ${lineCount}`);

  const requiredTokens = [
    "from './main-layout/index'",
    'useMainLayoutSidebar(style)',
    'useCurrentPageTitle(location.pathname, currentUser)',
    'useRecentPageTracker({ currentUser, fallbackTitle: pageTitle, pathname: location.pathname })',
    '<MainLayoutShell',
    '<MainContentFrame onOpenMobileMenu={sidebar.openSidebar}',
    '<CommandPalette open={paletteOpen} onClose={closeCommandPalette}',
  ];

  for (const token of requiredTokens) {
    if (!layout.includes(token)) failures.push(`MainLayout.tsx missing orchestrator token: ${token}`);
  }

  const forbiddenTokens = [
    'window.addEventListener',
    'findBestMatch',
    'findNavByPath',
    'pushRecent',
    'setIsSidebarOpen',
    'isNowDesktop',
    'customerDetailMatch',
    'partnerDetailMatch',
    'sidebarWidthPx =',
    'data-ui-navigation-overlay="sidebar"',
    '<Outlet />',
    '<MobileBottomNav',
  ];

  for (const token of forbiddenTokens) {
    if (layout.includes(token)) failures.push(`MainLayout.tsx still owns extracted responsibility token: ${token}`);
  }
}

if (exists(files.shell)) {
  const shell = read(files.shell);
  const requiredShellTokens = [
    '<Sidebar isOpen={isDesktop || isSidebarOpen} onClose={onCloseSidebar} />',
    'data-ui-shell="app-layout"',
    'data-ui-navigation-overlay="sidebar"',
    'style={{ marginRight: contentMarginRight }}',
  ];
  for (const token of requiredShellTokens) {
    if (!shell.includes(token)) failures.push(`MainLayoutShell.tsx missing shell token: ${token}`);
  }
}

if (exists(files.sidebarHook)) {
  const sidebarHook = read(files.sidebarHook);
  const requiredSidebarHookTokens = [
    'window.innerWidth >= 768',
    "window.addEventListener('resize'",
    'style.sidebarVariant === \'pill\'',
    'sidebarPillWidthPx',
    'contentMarginRight: isDesktop ? sidebarWidthPx : 0',
  ];
  for (const token of requiredSidebarHookTokens) {
    if (!sidebarHook.includes(token)) failures.push(`useMainLayoutSidebar.ts missing behavior token: ${token}`);
  }
}

if (exists(files.titleHook)) {
  const titleHook = read(files.titleHook);
  const requiredTitleTokens = [
    'فاکتور فروش شماره',
    'مرکز پیگیری وصول',
    'پیشنهادهای هوشمند خرید',
    'findBestMatch(pathname, SIDEBAR_ITEMS)',
    'پیشخوان مدیریتی کوروش',
  ];
  for (const token of requiredTitleTokens) {
    if (!titleHook.includes(token)) failures.push(`useCurrentPageTitle.ts missing title behavior token: ${token}`);
  }
}

if (exists(files.recentHook)) {
  const recentHook = read(files.recentHook);
  for (const token of ['normalizePath(pathname)', 'findNavByPath(SIDEBAR_ITEMS, path)', 'pushRecent({']) {
    if (!recentHook.includes(token)) failures.push(`useRecentPageTracker.ts missing recent tracking token: ${token}`);
  }
}

if (exists(files.paletteHook)) {
  const paletteHook = read(files.paletteHook);
  for (const token of ['event.ctrlKey || event.metaKey', "window.addEventListener('keydown'", 'event.preventDefault()']) {
    if (!paletteHook.includes(token)) failures.push(`useCommandPaletteShortcut.ts missing shortcut token: ${token}`);
  }
}

if (exists(files.content)) {
  const content = read(files.content);
  for (const token of ['<Outlet />', '<MobileBottomNav onMenuClick={onOpenMobileMenu}', "padding: 'var(--app-page-gap)'", 'data-ui-shell="main-scroll"']) {
    if (!content.includes(token)) failures.push(`MainContentFrame.tsx missing content frame token: ${token}`);
  }
}

if (exists(files.barrel)) {
  const barrel = read(files.barrel);
  for (const token of ['MainLayoutShell', 'MainContentFrame', 'useMainLayoutSidebar', 'useCurrentPageTitle', 'useRecentPageTracker', 'useCommandPaletteShortcut']) {
    if (!barrel.includes(token)) failures.push(`main-layout barrel missing export: ${token}`);
  }
}

if (failures.length > 0) {
  console.error('MainLayout shell cleanup audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  mainLayoutLines: read(files.layout).split(/\r?\n/).length,
  extractedFiles: Object.values(files).filter((file) => file !== files.layout),
}, null, 2));
