import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const failures = [];

const sidebarFile = 'components/Sidebar.tsx';
const hookFile = 'components/sidebar/useSidebarNavigationState.ts';
const barrelFile = 'components/sidebar/index.ts';

for (const file of [sidebarFile, hookFile, barrelFile]) {
  if (!exists(file)) failures.push(`Missing required Phase 40 file: ${file}`);
}

if (exists(sidebarFile)) {
  const sidebar = read(sidebarFile);
  const lineCount = sidebar.split(/\r?\n/).length;

  if (lineCount > 300) failures.push(`Sidebar.tsx should stay a compact orchestrator after Phase 40; current line count: ${lineCount}`);
  if (!sidebar.includes('useSidebarNavigationState')) failures.push('Sidebar.tsx must consume useSidebarNavigationState.');

  const forbiddenTokens = [
    'useState',
    'useEffect',
    'useRef',
    'useCallback',
    'setOpenGroups',
    'setHoveredGroupId',
    'setFlyoutLayout',
    'flyoutCloseTimer',
    'updateFlyoutLayout',
    'collectActiveGroups',
    'useSidebarSearchReset(sidebarSearchInputRef)',
  ];

  for (const token of forbiddenTokens) {
    if (sidebar.includes(token)) failures.push(`Sidebar.tsx still owns state-hook responsibility token: ${token}`);
  }

  const requiredTokens = [
    '<SidebarSearch inputRef={sidebarSearchInputRef}',
    '<SidebarNavTree',
    'openGroups={openGroups}',
    'onToggleGroup={toggleGroup}',
    'getBadgeCount={getBadgeCount}',
  ];

  for (const token of requiredTokens) {
    if (!sidebar.includes(token)) failures.push(`Sidebar.tsx missing expected state orchestration token: ${token}`);
  }
}

if (exists(hookFile)) {
  const hook = read(hookFile);
  const requiredHookTokens = [
    'useSidebarSearchReset(sidebarSearchInputRef)',
    'filterItemsByQuery',
    'collectActiveGroupIds',
    'updateFlyoutLayout',
    'flyoutCloseTimer',
    'toggleGroup',
    'getBadgeCount',
    'window.addEventListener',
  ];

  for (const token of requiredHookTokens) {
    if (!hook.includes(token)) failures.push(`useSidebarNavigationState.ts missing expected extracted state token: ${token}`);
  }
}

if (exists(barrelFile)) {
  const barrel = read(barrelFile);
  if (!barrel.includes('useSidebarNavigationState')) failures.push('Sidebar barrel missing useSidebarNavigationState export.');
}

if (failures.length > 0) {
  console.error('Sidebar state hook extraction audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sidebar state hook extraction audit passed: Sidebar.tsx is a compact orchestrator and navigation state lives in useSidebarNavigationState.');
