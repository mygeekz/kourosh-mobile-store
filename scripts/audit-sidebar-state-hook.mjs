import fs from 'node:fs';
const hook = fs.readFileSync('components/sidebar/useSidebarNavigationState.ts', 'utf8');
const sidebar = fs.readFileSync('components/Sidebar.tsx', 'utf8');
const failures = [];
for (const token of ['filterItemsByQuery', 'collectActiveGroupIds', 'collectGroupIds', 'toggleGroup', 'getBadgeCount']) if (!hook.includes(token)) failures.push(`Missing state token: ${token}`);
for (const token of ['flyoutCloseTimer', 'hoveredGroupId', 'updateFlyoutLayout', 'collapsed']) if (hook.includes(token)) failures.push(`Retired state remains: ${token}`);
if (!sidebar.includes('useSidebarNavigationState')) failures.push('Sidebar does not consume state hook.');
if (failures.length) { console.error('Sidebar state audit failed:'); failures.forEach((x)=>console.error(`- ${x}`)); process.exit(1); }
console.log('Sidebar state audit passed: search, accordion and badges are canonical; flyout state is removed.');
