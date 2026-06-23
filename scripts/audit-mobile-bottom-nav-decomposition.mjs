import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineCount = (file) => read(file).split(/\r?\n/).length;

const files = {
  legacyExport: 'components/MobileBottomNav.tsx',
  moduleBarrel: 'components/mobile-bottom-nav/index.ts',
  orchestrator: 'components/mobile-bottom-nav/MobileBottomNav.tsx',
  shell: 'components/mobile-bottom-nav/MobileBottomNavShell.tsx',
  itemLink: 'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx',
  activePill: 'components/mobile-bottom-nav/MobileBottomNavActivePill.tsx',
  primaryAction: 'components/mobile-bottom-nav/MobileBottomNavPrimaryAction.tsx',
  menuButton: 'components/mobile-bottom-nav/MobileBottomNavMenuButton.tsx',
  hook: 'components/mobile-bottom-nav/useMobileBottomNavigation.ts',
  items: 'components/mobile-bottom-nav/mobileBottomNavItems.ts',
  labels: 'components/mobile-bottom-nav/mobileBottomNavLabels.ts',
  types: 'components/mobile-bottom-nav/mobileBottomNavTypes.ts',
  shellBarrel: 'components/shell/index.ts',
};

for (const file of Object.values(files)) {
  if (!exists(file)) failures.push(`Missing mobile bottom nav decomposition file: ${file}`);
}

const expectedSnippets = {
  [files.legacyExport]: ["export { default } from './mobile-bottom-nav/index'", 'MobileBottomNavProps'],
  [files.moduleBarrel]: ["export { default } from './MobileBottomNav'", 'BOTTOM_NAV_ITEMS', 'MobileBottomNavProps'],
  [files.orchestrator]: ['useMobileBottomNavigation()', '<MobileBottomNavShell>', '<MobileBottomNavItemLink', '<MobileBottomNavPrimaryAction', '<MobileBottomNavMenuButton'],
  [files.shell]: ['data-ui-navigation="mobile-bottom"', 'grid h-full grid-cols-5'],
  [files.itemLink]: ['NavLink', '<MobileBottomNavActivePill', '<FontAwesomeIcon icon={item.icon}'],
  [files.activePill]: ['layoutId="bottomNavActivePill"', 'AnimatePresence', 'motion.div'],
  [files.primaryAction]: ['canUseQuickSale', '<FontAwesomeIcon icon="fa-solid fa-plus"', 'ثبت اطلاعات فروش سریع'],
  [files.menuButton]: ['onMenuClick', '<FontAwesomeIcon icon="fa-solid fa-bars"', 'نقشه'],
  [files.hook]: ['canAccessNavigationPath', 'BOTTOM_NAV_ITEMS', 'QUICK_SALE_PATH', "navigate(QUICK_SALE_PATH)"],
  [files.items]: ['BOTTOM_NAV_ITEMS', "path: '/'", "path: '/products'", "path: '/reports'", "QUICK_SALE_PATH = '/sales/cash'"],
  [files.labels]: ['getMobileBottomNavAriaLabel', 'getMobileBottomNavTitle'],
  [files.types]: ['NavigationIconMetadata', 'MobileBottomNavItem', 'MobileBottomNavProps'],
  [files.shellBarrel]: ["export { default as MobileBottomNav } from '../MobileBottomNav';"],
};

const snippetResults = [];
for (const [file, snippets] of Object.entries(expectedSnippets)) {
  if (!exists(file)) continue;
  const source = read(file);
  const result = { file, snippets: {} };
  for (const snippet of snippets) {
    const present = source.includes(snippet);
    result.snippets[snippet] = present;
    if (!present) failures.push(`${file} missing expected mobile bottom nav token: ${snippet}`);
  }
  snippetResults.push(result);
}

const budgets = {
  [files.legacyExport]: 12,
  [files.orchestrator]: 90,
  [files.hook]: 80,
  [files.itemLink]: 90,
  [files.shell]: 60,
};
for (const [file, budget] of Object.entries(budgets)) {
  if (!exists(file)) continue;
  const lines = lineCount(file);
  if (lines > budget) failures.push(`${file} exceeds decomposition line budget ${budget}; current: ${lines}`);
}

const forbiddenOrchestratorTokens = ['useAuth(', 'useFeatureFlags(', 'useNavigate(', 'useLocation(', 'canAccessNavigationPath', 'AnimatePresence', 'motion.div'];
if (exists(files.orchestrator)) {
  const source = read(files.orchestrator);
  for (const token of forbiddenOrchestratorTokens) {
    if (source.includes(token)) failures.push(`MobileBottomNav orchestrator still owns extracted behavior/render token: ${token}`);
  }
}

const forbiddenHookTokens = ['<NavLink', '<button', '<FontAwesomeIcon', 'motion.div'];
if (exists(files.hook)) {
  const source = read(files.hook);
  for (const token of forbiddenHookTokens) {
    if (source.includes(token)) failures.push(`useMobileBottomNavigation.ts should not render UI token: ${token}`);
  }
}

const docs = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  files,
  lineCounts: Object.fromEntries(Object.entries(files).filter(([, file]) => exists(file)).map(([key, file]) => [key, lineCount(file)])),
  snippetResults,
  policy: {
    goal: 'MobileBottomNav is now a shell module with separate metadata, access hook, shell surface, item renderer, primary action, and menu button.',
    behaviorPreserved: ['navigation policy', 'quick sale route', 'active pill animation', 'safe-area shell', 'menu callback'],
  },
};

fs.mkdirSync(path.join(root, 'docs/architecture'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/architecture/phase47-mobile-bottom-nav-decomposition.json'), `${JSON.stringify(docs, null, 2)}\n`);

if (failures.length > 0) {
  console.error('MobileBottomNav decomposition audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  mobileBottomNav: files.orchestrator,
  lineCounts: docs.lineCounts,
}, null, 2));
