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
const headerTypesPath = 'components/header/headerTypes.ts';

if (!exists(headerPath)) fail(`${headerPath} is missing.`);
if (!exists(quickActionsPath)) fail(`${quickActionsPath} is missing.`);
if (!exists(headerTypesPath)) fail(`${headerTypesPath} is missing.`);

const header = read(headerPath);
const quickActions = read(quickActionsPath);
const headerTypes = read(headerTypesPath);

if (!header.includes("from './header/index'") || !header.includes('HeaderQuickActions')) {
  fail('Header.tsx does not import HeaderQuickActions from the header barrel.');
}

if (!header.includes('<HeaderQuickActions')) {
  fail('Header.tsx does not render HeaderQuickActions.');
}

for (const leakedMarker of [
  'data-ui-header-quick-action=',
  'data-ui-header-quick-panel=',
  'const renderQuickActionMenu',
  'const getQuickActionAccent',
  'quickMenuButtonRefs',
]) {
  if (header.includes(leakedMarker)) {
    fail(`Header.tsx still owns quick action surface marker: ${leakedMarker}`);
  }
}

for (const requiredMarker of [
  'data-ui-header-quick-action=',
  'data-ui-header-quick-panel=',
  'const renderQuickActionMenu',
  'const getQuickActionAccent',
  'quickMenuButtonRefs',
  'refreshHeaderQuickPanels',
]) {
  if (!quickActions.includes(requiredMarker)) {
    fail(`HeaderQuickActions.tsx is missing required marker: ${requiredMarker}`);
  }
}

for (const requiredType of [
  'HeaderQuickStats',
  'HeaderQuickPanels',
  'HeaderSalesPreview',
  'HeaderFinancePulse',
]) {
  if (!headerTypes.includes(`export type ${requiredType}`)) {
    fail(`headerTypes.ts is missing ${requiredType}.`);
  }
}

console.log('Header quick-actions audit passed: quick action surface is extracted from Header.tsx.');
