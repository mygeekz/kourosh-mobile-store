import fs from 'node:fs';

const failures = [];
const config = fs.readFileSync('config/ui/sidebar-sections.ts', 'utf8');
const nav = fs.readFileSync('components/sidebar/SidebarNavTree.tsx', 'utf8');
const sidebar = fs.readFileSync('components/Sidebar.tsx', 'utf8');
const constants = fs.readFileSync('constants.tsx', 'utf8');

const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const label of ['فروشگاه', 'مدیریت و تحلیل', 'پیکربندی']) {
  assert(config.includes(`label: '${label}'`), `Missing sidebar section label: ${label}`);
}
for (const id of ['dashboard', 'sales', 'products-group', 'repairs-services', 'people', 'reports', 'more', 'settings']) {
  assert(config.includes(`'${id}'`), `Top-level sidebar item is not categorized: ${id}`);
}
assert(nav.includes('SIDEBAR_NAV_SECTIONS'), 'SidebarNavTree must consume presentation-only sidebar sections.');
assert(nav.includes('data-sidebar-section='), 'Sidebar sections must expose a stable section marker.');
assert(nav.includes('data-sidebar-section-toggle='), 'Sidebar section headings must be collapsible controls.');
assert(nav.includes('data-sidebar-section-active='), 'Sidebar sections must expose active-section hierarchy state.');
assert(nav.includes("className={sectionIndex === 0 ? undefined : 'mt-4 pt-1'}"), 'Sidebar sections must preserve premium vertical separation between categories.');
assert(!nav.includes('rounded-lg border-0 bg-transparent px-2 text-right transition-colors'), 'Sidebar category headings must not render as rounded box-like controls.');
assert(!nav.includes('hover:bg-slate-100/70 dark:hover:bg-white/5'), 'Sidebar category headings must stay visually plain without hover background boxes.');
assert(nav.includes('hover:text-slate-700 dark:hover:text-slate-200'), 'Sidebar category headings should use text-only hover emphasis.');
assert(nav.includes("'app-sidebar-row group'"), 'Sidebar rows must keep hierarchy-aware hover/focus grouping.');
assert(nav.includes("rowActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'"), 'Inactive sidebar icons must remain visually subordinate to the active path.');
assert(nav.includes('aria-controls={menuId}'), 'Sidebar section toggle must be linked to its menu.');
assert(nav.includes("label: 'سایر'"), 'Unassigned future top-level items must remain visible through a safe fallback section.');
assert(sidebar.includes('expandSections={Boolean(navQuery.trim())}'), 'Sidebar search must expand matching categorized sections.');
assert(constants.includes('export const SIDEBAR_ITEMS: NavItem[]'), 'SIDEBAR_ITEMS must remain the canonical navigation source.');
assert(!constants.includes('SIDEBAR_NAV_SECTIONS'), 'Navigation source must not be rewritten as presentation sections.');

if (failures.length) {
  console.error('Sidebar sections contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Sidebar sections contract audit passed: categorized presentation preserves canonical navigation/RBAC source.');
