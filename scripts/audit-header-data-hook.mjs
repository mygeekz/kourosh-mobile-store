import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`Header data hook audit failed: ${message}`);
  process.exit(1);
};

const headerPath = 'components/Header.tsx';
const hookPath = 'components/header/useHeaderQuickData.ts';
const typesPath = 'components/header/headerTypes.ts';

for (const file of [headerPath, hookPath, typesPath]) {
  if (!exists(file)) fail(`${file} is missing.`);
}

const header = read(headerPath);
const hook = read(hookPath);

if (!header.includes("from './header/index'") || !header.includes('useHeaderQuickData')) {
  fail('Header.tsx does not import useHeaderQuickData from the header barrel.');
}

if (!header.includes('} = useHeaderQuickData({')) {
  fail('Header.tsx does not consume useHeaderQuickData.');
}

for (const forbiddenHeaderMarker of [
  "import moment from 'jalali-moment'",
  "import { apiFetch } from '../utils/apiFetch'",
  '/api/reports/sales-summary',
  '/api/notifications',
  '/api/reports/installments-calendar',
  '/api/reports/financial-overview',
  '/api/customers/trust-profiles',
  'const loadHeaderQuickStats = async',
  'const loadRiskyCustomers = async',
  "window.addEventListener('kourosh:header-quick-refresh'",
]) {
  if (header.includes(forbiddenHeaderMarker)) {
    fail(`Header.tsx still owns data/fetch marker: ${forbiddenHeaderMarker}`);
  }
}

for (const requiredHookMarker of [
  "import moment from 'jalali-moment';",
  "import { apiFetch } from '../../utils/apiFetch';",
  'export const useHeaderQuickData',
  '/api/reports/sales-summary',
  '/api/notifications',
  '/api/reports/installments-calendar',
  '/api/reports/financial-overview',
  '/api/customers/trust-profiles',
  'const loadHeaderQuickStats = async',
  'const loadRiskyCustomers = async',
  "window.addEventListener('kourosh:header-quick-refresh'",
]) {
  if (!hook.includes(requiredHookMarker)) {
    fail(`useHeaderQuickData.ts is missing required data marker: ${requiredHookMarker}`);
  }
}

const headerLines = header.split(/\r?\n/).length;
const hookLines = hook.split(/\r?\n/).length;
if (headerLines > 650) fail(`Header.tsx is still too large after data hook extraction: ${headerLines} lines.`);
if (hookLines > 340) fail(`useHeaderQuickData.ts is too large for the Phase 33 target: ${hookLines} lines.`);

console.log(JSON.stringify({
  status: 'passed',
  headerLines,
  hookLines,
  extractedHook: hookPath,
}, null, 2));
