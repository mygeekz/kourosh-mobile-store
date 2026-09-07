import fs from 'node:fs';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(file, 'utf8');

const resolver = read('utils/navigationContext.ts');
const pageTitle = read('components/main-layout/useCurrentPageTitle.ts');
const header = read('components/Header.tsx');
const headerTitle = read('components/header/HeaderTitleArea.tsx');
const pageShell = read('components/ui/PageShell.tsx');
const sidebarSections = read('config/ui/sidebar-sections.ts');
const constants = read('constants.tsx');
const commandPaletteResults = read('components/command-palette/CommandPaletteResultsList.tsx');
const commandPaletteResultsHook = read('components/command-palette/useCommandPaletteResults.ts');

assert(resolver.includes("import { SIDEBAR_ITEMS } from '../constants'"), 'Navigation context must consume canonical SIDEBAR_ITEMS.');
assert(resolver.includes("import { SIDEBAR_NAV_SECTIONS } from '../config/ui/sidebar-sections'"), 'Navigation context must consume sidebar presentation sections.');
assert(resolver.includes('breadcrumbLabels'), 'Navigation context must expose breadcrumb labels.');
assert(resolver.includes('getNavigationContextSummary'), 'Navigation context must expose one compact context-summary helper for secondary navigation surfaces.');
assert(resolver.includes("join(' · ')"), 'Navigation context summary must use the compact shared hierarchy separator.');
assert(resolver.includes("anchorId: 'installment-sales'"), 'Dynamic installment routes must resolve through the installment-sales navigation branch.');
assert(resolver.includes("anchorId: 'customers'"), 'Dynamic customer detail routes must resolve through Customers.');
assert(resolver.includes("anchorId: 'invoices'"), 'Dynamic invoice detail routes must resolve through Invoices.');
assert(resolver.includes("anchorId: 'reports'"), 'Deep report routes must resolve through Reports.');

assert(pageTitle.includes('resolveNavigationContext(pathname).pageTitle'), 'Current page title must use the central navigation context resolver.');
assert(header.includes('resolveNavigationContext(currentPath)'), 'Header must resolve the same centralized navigation context.');
assert(header.includes('navigationContext={navigationContext}'), 'Header must pass navigation context into HeaderTitleArea.');
assert(headerTitle.includes('data-ui-header-context="true"'), 'Header title area must expose compact route context.');
assert(headerTitle.includes('aria-label="مسیر صفحه"'), 'Header route context must be accessible as a breadcrumb/navigation label.');
assert(headerTitle.includes('hidden min-w-0') && headerTitle.includes('sm:flex'), 'Header breadcrumb must stay compact on mobile.');

assert(pageShell.includes('resolveNavigationContext(location.pathname)'), 'PageShell must resolve route context from the same source.');
assert(pageShell.includes('data-ui-page-context="true"'), 'PageShell kicker must expose navigation context.');
assert(pageShell.includes('contextLabels.length > 0'), 'PageShell must fall back safely when a route has no navigation section.');

for (const label of ['فروشگاه', 'مدیریت و تحلیل', 'پیکربندی']) {
  assert(sidebarSections.includes(`label: '${label}'`), `Sidebar section ${label} must remain the shared category source.`);
}
assert(constants.includes('export const SIDEBAR_ITEMS: NavItem[]'), 'Canonical navigation source must remain SIDEBAR_ITEMS.');
assert(!constants.includes('breadcrumbLabels'), 'Navigation breadcrumb presentation must not be embedded into SIDEBAR_ITEMS.');

assert(commandPaletteResults.includes("from '../../utils/navigationContext'"), 'Command palette results must consume the central navigation context resolver.');
assert((commandPaletteResults.match(/getNavigationContextSummary\(item\.path\)/g) || []).length >= 2 && commandPaletteResults.includes('getNavigationContextSummary(item.nav.path)'), 'Command palette favorites, recents, and navigation results must share the same compact context summary.');
assert(!commandPaletteResults.includes('subtitle={item.parentTitle}'), 'Command palette must not fall back to stale parentTitle-only subtitles.');
assert(commandPaletteResultsHook.includes('getNavigationContextSummary(item.path, 3)'), 'Command palette search must include canonical navigation context in its search haystack.');
assert(!commandPaletteResults.includes('فروشگاه ·') && !commandPaletteResults.includes('مدیریت و تحلیل ·'), 'Command palette must not hard-code sidebar category context.');

if (failures.length) {
  console.error('Navigation context contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation context contract audit passed: header and page context share canonical sidebar hierarchy without rewriting navigation/RBAC.');
