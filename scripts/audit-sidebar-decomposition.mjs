import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sidebarPath = path.join(root, 'components', 'Sidebar.tsx');
const sidebarDir = path.join(root, 'components', 'sidebar');
const barrelPath = path.join(sidebarDir, 'index.ts');

const requiredFiles = [
  'SidebarBrandBar.tsx',
  'SidebarFavorites.tsx',
  'SidebarSearch.tsx',
  'SidebarSupport.tsx',
  'useSidebarBadges.ts',
  'useSidebarBranding.ts',
  'useSidebarSearchReset.ts',
  'useSidebarNavigationState.ts',
  'index.ts',
];

const requiredBarrelExports = [
  'SidebarBrandBar',
  'SidebarFavorites',
  'SidebarSearch',
  'SidebarSupport',
  'useSidebarBadges',
  'useSidebarBranding',
  'useSidebarSearchReset',
  'useSidebarNavigationState',
];

const failures = [];

if (!fs.existsSync(sidebarPath)) {
  failures.push('Missing components/Sidebar.tsx.');
} else {
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');
  const sidebarLineCount = sidebar.split(/\r?\n/).length;

  if (sidebarLineCount > 700) {
    failures.push(`Sidebar.tsx is still too large for Phase 38 target: ${sidebarLineCount} lines.`);
  }

  if (!sidebar.includes("from './sidebar/index'")) {
    failures.push('Sidebar.tsx must consume extracted sidebar module members through ./sidebar/index barrel.');
  }

  const forbiddenImports = [
    '../utils/apiFetch',
    '../utils/branding',
    '../utils/loadAuthedAssetUrl',
  ];

  for (const importPath of forbiddenImports) {
    if (sidebar.includes(importPath)) {
      failures.push(`Sidebar.tsx still owns extracted runtime dependency: ${importPath}`);
    }
  }

  const requiredConsumers = [
    '<SidebarBrandBar',
    '<SidebarSearch',
    '<SidebarFavorites',
    '<SidebarSupport',
    'useSidebarBadges()',
    'useSidebarBranding()',
    'useSidebarNavigationState',
  ];

  for (const token of requiredConsumers) {
    if (!sidebar.includes(token)) {
      failures.push(`Sidebar.tsx missing extracted sidebar consumer token: ${token}`);
    }
  }
}

for (const filename of requiredFiles) {
  const filePath = path.join(sidebarDir, filename);
  if (!fs.existsSync(filePath)) failures.push(`Missing sidebar module file: components/sidebar/${filename}`);
}

if (fs.existsSync(barrelPath)) {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  for (const exportedName of requiredBarrelExports) {
    if (!barrel.includes(exportedName)) failures.push(`Sidebar barrel missing export: ${exportedName}`);
  }
} else {
  failures.push('Missing components/sidebar/index.ts barrel export.');
}

if (failures.length > 0) {
  console.error('Sidebar decomposition audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sidebar decomposition audit passed: branding/search/favorites/badges/support and state hooks are extracted behind a sidebar module boundary.');
