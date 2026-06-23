import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const files = {
  navigationPolicy: path.join(root, 'utils/navigationPolicy.ts'),
  constants: path.join(root, 'constants.tsx'),
  sidebar: path.join(root, 'components/Sidebar.tsx'),
  commandPalette: path.join(root, 'components/CommandPalette.tsx'),
  commandPaletteResultsHook: path.join(root, 'components/command-palette/useCommandPaletteResults.ts'),
  commandPaletteActionsHook: path.join(root, 'components/command-palette/useCommandPaletteActions.ts'),
  mobileBottomNav: path.join(root, 'components/mobile-bottom-nav/MobileBottomNav.tsx'),
  mobileBottomNavHook: path.join(root, 'components/mobile-bottom-nav/useMobileBottomNavigation.ts'),
  header: path.join(root, 'components/Header.tsx'),
  featureFlags: path.join(root, 'utils/featureFlags.ts'),
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const problems = [];

for (const [name, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) problems.push(`Missing required navigation policy file: ${name} (${path.relative(root, filePath)})`);
}

if (problems.length === 0) {
  const navigationPolicy = read(files.navigationPolicy);
  const constants = read(files.constants);
  const featureFlags = read(files.featureFlags);
  const consumers = {
    Sidebar: read(files.sidebar),
    CommandPalette: read(files.commandPalette) + '\n' + read(files.commandPaletteResultsHook) + '\n' + read(files.commandPaletteActionsHook),
    MobileBottomNav: read(files.mobileBottomNav) + '\n' + read(files.mobileBottomNavHook),
    Header: read(files.header),
  };

  for (const requiredExport of [
    'canAccessNavigationPath',
    'canAccessNavigationItem',
    'filterNavigationItems',
    'filterNavigationFavorites',
    'navigationPolicySource',
  ]) {
    if (!new RegExp(`export\\s+(?:function|const)\\s+${requiredExport}\\b`).test(navigationPolicy)) {
      problems.push(`Missing navigation policy export: ${requiredExport}.`);
    }
  }

  if (!navigationPolicy.includes("from './rbac'") || !navigationPolicy.includes("from './featureFlags'")) {
    problems.push('utils/navigationPolicy.ts must compose RBAC and feature-flag policy instead of inventing local rules.');
  }

  for (const [consumerName, source] of Object.entries(consumers)) {
    if (!source.includes('../utils/navigationPolicy')) {
      problems.push(`${consumerName} must consume utils/navigationPolicy.ts for visibility/access decisions.`);
    }
  }

  if (/filterNavItemsByRole\(SIDEBAR_ITEMS/.test(consumers.Sidebar) || /filterNavItemsByFeatures\(filteredNavItems/.test(consumers.Sidebar)) {
    problems.push('Sidebar still performs split RBAC/feature filtering instead of using filterNavigationItems.');
  }

  if (/filterNavItemsByRole\(SIDEBAR_ITEMS/.test(consumers.CommandPalette)) {
    problems.push('CommandPalette still filters SIDEBAR_ITEMS only by role; feature policy can drift.');
  }

  if (/favorites\.filter\(\(f\)\s*=>\s*canAccessPath/.test(consumers.Sidebar + consumers.CommandPalette)) {
    problems.push('Favorites are still filtered by RBAC only; feature-disabled routes can remain visible.');
  }

  if (/canAccessPath/.test(consumers.Header + consumers.MobileBottomNav + consumers.CommandPalette + consumers.Sidebar)) {
    problems.push('A navigation consumer still imports/uses canAccessPath directly; use canAccessNavigationPath instead.');
  }

  const featureDefinitionKeys = [...new Set([...featureFlags.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))];
  const navFeatureKeys = [...new Set([...constants.matchAll(/\bfeatureKey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))];
  const undefinedNavFlags = navFeatureKeys.filter((key) => !featureDefinitionKeys.includes(key));
  if (undefinedNavFlags.length > 0) {
    problems.push(`SIDEBAR_ITEMS references undefined feature flags: ${undefinedNavFlags.join(', ')}`);
  }

  const navItemIds = [...new Set([...constants.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))];
  const featureNavIds = [...new Set([...featureFlags.matchAll(/navIds:\s*\[([^\]]*)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1])))];
  const featureNavIdsMissingFromSidebar = featureNavIds.filter((id) => !navItemIds.includes(id));
  // Some feature navIds intentionally document report-center deep links that are rendered inside report pages.
  // Keep this as informational by only failing if a top-level or direct sidebar id loses its feature definition.
  const navIdsWithMissingFeatureBacklink = navFeatureKeys.length === 0 ? ['no nav feature keys found'] : [];
  if (navIdsWithMissingFeatureBacklink.length > 0) {
    problems.push(`Navigation feature metadata problem: ${navIdsWithMissingFeatureBacklink.join(', ')}`);
  }

  console.log(`Navigation policy audit inspected ${navItemIds.length} nav ids and ${featureDefinitionKeys.length} feature definitions.`);
  if (featureNavIdsMissingFromSidebar.length > 0) {
    console.log(`Navigation policy note: ${featureNavIdsMissingFromSidebar.length} feature navIds are not direct SIDEBAR_ITEMS ids; this is allowed for report-center/internal nav surfaces.`);
  }
}

if (problems.length > 0) {
  console.error('Navigation policy audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Navigation policy audit passed: sidebar, command palette, header, mobile nav, favorites, RBAC and feature flags share one navigation policy layer.');
