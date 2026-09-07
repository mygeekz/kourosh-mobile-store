import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const sidebar = read('components/Sidebar.tsx');
const nav = read('components/sidebar/SidebarNavTree.tsx');
const state = read('components/sidebar/useSidebarNavigationState.ts');
const favorites = read('components/sidebar/SidebarFavorites.tsx');
const search = read('components/sidebar/SidebarSearch.tsx');
const css = read('styles/components/sidebar.css');
const layoutShell = read('components/main-layout/MainLayoutShell.tsx');
const layoutState = read('components/main-layout/useMainLayoutSidebar.ts');
const styleContext = read('contexts/StyleContext.tsx');
const manifest = JSON.parse(read('config/ui/sidebar-surface-manifest.json'));
const styleManifest = JSON.parse(read('styles/manifest/style-manifest.json'));

assert(sidebar.includes('data-sidebar-contract="canonical"'), 'Sidebar root must expose the canonical contract marker.');
assert(sidebar.includes('app-sidebar-shell'), 'Sidebar must use the canonical root namespace.');
assert(!sidebar.includes('collapsed'), 'Disabled collapse state must not remain in Sidebar.tsx.');
assert(!sidebar.includes('flyout'), 'Sidebar orchestrator must not retain flyout state.');
assert(!nav.includes('framer-motion'), 'Sidebar navigation must not depend on framer-motion.');
assert(!nav.includes('SidebarFlyoutPanel'), 'Collapsed flyout rendering must remain retired.');
assert(!exists('components/sidebar/SidebarFlyoutPanel.tsx'), 'Retired SidebarFlyoutPanel.tsx must not return.');
assert(state.includes('collectGroupIds'), 'Search results must open matching groups.');
assert(!state.includes('flyoutCloseTimer'), 'Flyout timing state must remain removed.');
assert(favorites.includes('app-sidebar-favorite__remove'), 'Favorites must use the canonical separate remove action.');
assert(!favorites.includes('<motion.'), 'Favorites must not use motion wrappers.');
assert(!search.includes('style={{'), 'Sidebar search must not contain inline visual styles.');
assert(!search.includes('data-sidebar-search-input'), 'Sidebar search must not opt into retired shared hard-reset selectors.');
assert(!exists('components/sidebar/useSidebarSearchReset.ts'), 'Retired sidebar DOM-important reset hook must not return.');
assert(css.includes('grid-template-areas: "icon input clear";'), 'Sidebar search must use the canonical three-column grid.');
assert(css.includes('grid-area: icon;'), 'Sidebar search icon must own the physical-left grid area.');
assert(!css.includes('inset-inline-start: 6px;'), 'Sidebar search icon must not use logical absolute positioning.');
assert(styleContext.includes('sidebarPillWidthPx: 272'), 'Canonical sidebar default width must remain 272px.');
assert(styleContext.includes('196, 280, DEFAULTS.sidebarPillWidthPx'), 'StyleContext must normalize sidebar width to 196..280px.');
assert(layoutState.includes('Math.max(196, Math.min(280'), 'Main layout must reserve the same canonical sidebar width range.');
assert(css.includes('.app-sidebar-shell'), 'Canonical sidebar stylesheet must own the shell.');
assert(css.includes('.app-sidebar-row'), 'Canonical sidebar stylesheet must own row geometry.');

assert(css.includes('right: 0;'), 'Canonical desktop/mobile sidebar must be physically anchored to the right in RTL.');
assert(css.includes('left: auto;'), 'Canonical sidebar must explicitly release the left edge.');
assert(!css.includes('inset-inline-end: 0;'), 'Logical inline-end must not anchor the RTL sidebar because it resolves to the left edge.');
assert(css.includes('border-left: 1px solid var(--app-sidebar-border);'), 'Right-side sidebar must separate content with a physical left border.');
assert(layoutShell.includes('onClose={isDesktop ? undefined : onCloseSidebar}'), 'Desktop sidebar must not render the mobile close control.');
assert(!css.includes('linear-gradient'), 'Canonical sidebar must not use gradients.');
assert(!css.includes('translateY(-1px)'), 'Canonical sidebar must not move on hover.');
assert(manifest.styleOwner === 'styles/components/sidebar.css', 'Sidebar manifest must point to the canonical stylesheet.');

const retired = new Set(manifest.removedRuntimeStyles || []);
for (const file of retired) assert(!exists(file), `Retired sidebar stylesheet still exists: ${file}`);
for (const entry of styleManifest.localStyles) {
  assert(!retired.has(entry.path), `Retired sidebar stylesheet remains in style manifest: ${entry.path}`);
}
const canonicalEntry = styleManifest.localStyles.find((entry) => entry.path === 'styles/components/sidebar.css');
assert(Boolean(canonicalEntry?.runtimeActive), 'Canonical sidebar stylesheet must be runtime-active.');
assert(canonicalEntry?.owner === 'navigation-foundation', 'Canonical sidebar stylesheet must be owned by navigation-foundation.');

const broadLegacy = read('styles/legacy/09c-legacy-global-nav-sidebar-topbar.css');
assert(!broadLegacy.includes('[class*="sidebar"]'), 'Dangerous wildcard sidebar selectors must remain removed.');

if (failures.length) {
  console.error('Sidebar contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Sidebar contract audit passed: one canonical surface, one scroll viewport, compact rows, no flyout and no sidebar patch files.');
