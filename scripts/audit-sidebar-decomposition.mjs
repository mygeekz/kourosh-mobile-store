import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const required = [
  'components/Sidebar.tsx',
  'components/sidebar/SidebarBrandBar.tsx',
  'components/sidebar/SidebarFavorites.tsx',
  'components/sidebar/SidebarNavTree.tsx',
  'components/sidebar/SidebarSearch.tsx',
  'components/sidebar/SidebarSupport.tsx',
  'components/sidebar/useSidebarBadges.ts',
  'components/sidebar/useSidebarBranding.ts',
  'components/sidebar/useSidebarNavigationState.ts',
  'components/sidebar/index.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
const sidebar = fs.readFileSync(path.join(root, 'components/Sidebar.tsx'), 'utf8');
for (const token of ['<SidebarBrandBar', '<SidebarSearch', '<SidebarFavorites', '<SidebarNavTree', '<SidebarSupport', 'useSidebarNavigationState']) {
  if (!sidebar.includes(token)) failures.push(`Sidebar orchestrator missing ${token}`);
}
if (sidebar.split(/\r?\n/).length > 180) failures.push('Sidebar.tsx is no longer a compact orchestrator.');
if (failures.length) { console.error('Sidebar decomposition audit failed:'); failures.forEach((x)=>console.error(`- ${x}`)); process.exit(1); }
console.log('Sidebar decomposition audit passed: canonical modules remain behind the sidebar boundary.');
