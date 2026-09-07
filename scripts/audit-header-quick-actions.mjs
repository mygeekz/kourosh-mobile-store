import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`Header quick-actions audit failed: ${message}`);
  process.exit(1);
};

const headerPath = 'components/Header.tsx';
const quickActionsPath = 'components/header/HeaderQuickActions.tsx';
const quickPopoverPath = 'components/header/HeaderQuickPopover.tsx';
const headerTypesPath = 'components/header/headerTypes.ts';

for (const file of [headerPath, quickActionsPath, quickPopoverPath, headerTypesPath]) {
  if (!exists(file)) fail(`${file} is missing.`);
}

const header = read(headerPath);
const quickActions = read(quickActionsPath);
const quickPopover = read(quickPopoverPath);
const headerTypes = read(headerTypesPath);

if (!header.includes("from './header/index'") || !header.includes('HeaderQuickActions')) {
  fail('Header.tsx does not import HeaderQuickActions from the header barrel.');
}
if (!header.includes('<HeaderQuickActions')) fail('Header.tsx does not render HeaderQuickActions.');

for (const leakedMarker of ['data-header-live-action-key=', 'data-ui-header-quick-panel=', 'quickMenuButtonRefs']) {
  if (header.includes(leakedMarker)) fail(`Header.tsx still owns quick action marker: ${leakedMarker}`);
}

for (const requiredMarker of [
  'data-header-live-action-key=',
  'const renderPanelContent',
  'quickMenuButtonRefs',
  'refreshHeaderQuickPanels',
  '<HeaderQuickPopover',
]) {
  if (!quickActions.includes(requiredMarker)) fail(`HeaderQuickActions.tsx is missing required marker: ${requiredMarker}`);
}

for (const forbiddenMarker of [
  'const getQuickActionAccent',
  'bg-[linear-gradient',
  "overflowY: 'auto'",
  'app-header-popover__badge',
  'app-header-popover__close',
]) {
  if (quickActions.includes(forbiddenMarker)) fail(`HeaderQuickActions.tsx reintroduced legacy popover styling: ${forbiddenMarker}`);
}

for (const requiredMarker of [
  'data-ui-header-quick-panel=',
  'className="app-header-popover"',
  'app-header-popover__header',
  'app-header-popover__body',
  'app-header-popover__footer',
]) {
  if (!quickPopover.includes(requiredMarker)) fail(`HeaderQuickPopover.tsx is missing required marker: ${requiredMarker}`);
}

for (const requiredType of ['HeaderQuickStats', 'HeaderQuickPanels', 'HeaderSalesPreview', 'HeaderFinancePulse']) {
  if (!headerTypes.includes(`export type ${requiredType}`)) fail(`headerTypes.ts is missing ${requiredType}.`);
}

console.log('Header quick-actions audit passed: one canonical popover shell owns header quick menus.');
