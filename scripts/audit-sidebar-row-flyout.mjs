import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const failures = [];

const requiredFiles = [
  'components/sidebar/SidebarNavTree.tsx',
  'components/sidebar/SidebarFlyoutPanel.tsx',
  'components/sidebar/sidebarNavUtils.ts',
];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing extracted sidebar row/flyout file: ${file}`);
}

if (exists('components/Sidebar.tsx')) {
  const sidebar = read('components/Sidebar.tsx');
  const lineCount = sidebar.split(/\r?\n/).length;

  if (lineCount > 350) {
    failures.push(`Sidebar.tsx should stay an orchestrator after Phase 39; current line count: ${lineCount}`);
  }

  const forbiddenTokens = [
    'const Row:',
    '<AnimatePresence',
    'from "framer-motion"',
    "from 'framer-motion'",
    '<NavLink',
    'FLYOUT_SUBTITLE_MAP',
    'getFlyoutSubtitle',
    'getNavSurfaceRole',
  ];

  for (const token of forbiddenTokens) {
    if (sidebar.includes(token)) failures.push(`Sidebar.tsx still owns row/flyout rendering token: ${token}`);
  }

  const requiredTokens = [
    '<SidebarNavTree',
    'onCollapsedGroupEnter={handleCollapsedGroupEnter}',
    'onCollapsedGroupLeave={scheduleFlyoutClose}',
    'onFlyoutPointerEnter={handleFlyoutPointerEnter}',
    'onFlyoutPointerLeave={handleFlyoutPointerLeave}',
    'getBadgeCount={getBadgeCount}',
  ];

  for (const token of requiredTokens) {
    if (!sidebar.includes(token)) failures.push(`Sidebar.tsx missing row/flyout orchestration token: ${token}`);
  }
} else {
  failures.push('Missing components/Sidebar.tsx');
}

if (exists('components/sidebar/SidebarNavTree.tsx')) {
  const navTree = read('components/sidebar/SidebarNavTree.tsx');
  const requiredNavTreeTokens = [
    'const Row:',
    '<SidebarFlyoutPanel',
    'useNavigate',
    '<AnimatePresence',
    '<motion.ul',
    '<FontAwesomeIcon',
  ];

  for (const token of requiredNavTreeTokens) {
    if (!navTree.includes(token)) failures.push(`SidebarNavTree.tsx missing expected row renderer token: ${token}`);
  }
}

if (exists('components/sidebar/SidebarFlyoutPanel.tsx')) {
  const flyout = read('components/sidebar/SidebarFlyoutPanel.tsx');
  const requiredFlyoutTokens = [
    '<motion.div',
    'getFlyoutSubtitle',
    'getNavSurfaceRole',
    '<FontAwesomeIcon',
    'data-flyout-child',
  ];

  for (const token of requiredFlyoutTokens) {
    if (!flyout.includes(token)) failures.push(`SidebarFlyoutPanel.tsx missing expected flyout token: ${token}`);
  }
}

if (exists('components/sidebar/sidebarNavUtils.ts')) {
  const utils = read('components/sidebar/sidebarNavUtils.ts');
  const requiredUtils = [
    'isActivePath',
    'isItemActive',
    'isExactRouteActive',
    'getFlyoutSubtitle',
    'getNavSurfaceRole',
  ];

  for (const token of requiredUtils) {
    if (!utils.includes(token)) failures.push(`sidebarNavUtils.ts missing expected helper: ${token}`);
  }
}

if (exists('components/sidebar/index.ts')) {
  const barrel = read('components/sidebar/index.ts');
  const requiredExports = [
    'SidebarNavTree',
    'SidebarFlyoutPanel',
    'isItemActive',
    'SidebarFlyoutLayout',
  ];

  for (const token of requiredExports) {
    if (!barrel.includes(token)) failures.push(`Sidebar barrel missing export for Phase 39: ${token}`);
  }
} else {
  failures.push('Missing components/sidebar/index.ts');
}

if (failures.length > 0) {
  console.error('Sidebar row/flyout extraction audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sidebar row/flyout extraction audit passed: Sidebar.tsx orchestrates state while row and flyout rendering live behind sidebar module boundaries.');
