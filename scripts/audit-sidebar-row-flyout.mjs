import fs from 'node:fs';
const nav = fs.readFileSync('components/sidebar/SidebarNavTree.tsx', 'utf8');
const failures = [];
if (fs.existsSync('components/sidebar/SidebarFlyoutPanel.tsx')) failures.push('Retired flyout component still exists.');
if (nav.includes('framer-motion') || nav.includes('motion.') || nav.includes('AnimatePresence')) failures.push('Sidebar rows still use motion/flyout infrastructure.');
for (const token of ['app-sidebar-row', 'app-sidebar-submenu', 'aria-expanded', 'aria-current']) if (!nav.includes(token)) failures.push(`Missing canonical row token: ${token}`);
if (failures.length) { console.error('Sidebar row audit failed:'); failures.forEach((x)=>console.error(`- ${x}`)); process.exit(1); }
console.log('Sidebar row audit passed: compact accordion rows replace the retired collapsed flyout.');
