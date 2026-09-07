import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`Header currency hook audit failed: ${message}`);
  process.exit(1);
};

const headerPath = 'components/Header.tsx';
const hookPath = 'components/header/useHeaderCurrency.ts';
const quickActionsPath = 'components/header/HeaderQuickActions.tsx';

for (const file of [headerPath, hookPath, quickActionsPath]) {
  if (!exists(file)) fail(`${file} is missing.`);
}

const header = read(headerPath);
const hook = read(hookPath);
const quickActions = read(quickActionsPath);

if (!header.includes("from './header/index'") || !header.includes('useHeaderCurrency')) {
  fail('Header.tsx must import useHeaderCurrency from the header barrel.');
}

if (!header.includes('} = useHeaderCurrency();')) {
  fail('Header.tsx must consume useHeaderCurrency.');
}

for (const forbiddenHeaderMarker of [
  "from '../utils/currency'",
  'readStoredCurrencyUnit',
  'writeStoredCurrencyUnit',
  'getCurrencyUnitLabel',
  'formatCurrencyText',
  "window.addEventListener('kourosh:currency-unit-updated'",
  'const formatMoney =',
  'const formatMoneyPreview =',
]) {
  if (header.includes(forbiddenHeaderMarker)) {
    fail(`Header.tsx still owns currency marker: ${forbiddenHeaderMarker}`);
  }
}

for (const requiredHookMarker of [
  "import {\n  formatCurrencyText,",
  'readStoredCurrencyUnit',
  'writeStoredCurrencyUnit',
  "window.addEventListener('kourosh:currency-unit-updated'",
  'export const useHeaderCurrency',
  'formatMoneyPreview',
  'escapeRegExp',
]) {
  if (!hook.includes(requiredHookMarker)) {
    fail(`useHeaderCurrency.ts is missing required marker: ${requiredHookMarker}`);
  }
}

for (const requiredQuickActionCurrencyProp of [
  'headerCurrencyUnit',
  'setHeaderCurrencyUnit',
  'headerCurrencyLabel',
  'formatMoney',
  'formatMoneyPreview',
]) {
  if (!quickActions.includes(requiredQuickActionCurrencyProp)) {
    fail(`HeaderQuickActions.tsx no longer consumes ${requiredQuickActionCurrencyProp}.`);
  }
}

const headerLines = header.split(/\r?\n/).length;
const hookLines = hook.split(/\r?\n/).length;
if (headerLines > 260) fail(`Header.tsx should stay under 260 lines after currency extraction; got ${headerLines}.`);
if (hookLines > 90) fail(`useHeaderCurrency.ts should stay focused; got ${hookLines} lines.`);

console.log(JSON.stringify({
  status: 'passed',
  headerLines,
  hookLines,
  extractedHook: hookPath,
  checkedFiles: [headerPath, hookPath, quickActionsPath],
}, null, 2));
