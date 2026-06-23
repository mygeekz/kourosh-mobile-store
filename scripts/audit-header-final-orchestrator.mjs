import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`Header final orchestrator audit failed: ${message}`);
  process.exit(1);
};

const headerPath = 'components/Header.tsx';
const shellPath = 'components/header/HeaderShell.tsx';
const riskBadgePath = 'components/header/HeaderRiskBadge.tsx';
const profileHookPath = 'components/header/useHeaderProfileMenu.ts';

for (const file of [headerPath, shellPath, riskBadgePath, profileHookPath]) {
  if (!exists(file)) fail(`${file} is missing.`);
}

const header = read(headerPath);
const shell = read(shellPath);
const riskBadge = read(riskBadgePath);
const profileHook = read(profileHookPath);

const headerLines = header.split(/\r?\n/).length;
if (headerLines > 180) fail(`Header.tsx should stay below 180 lines after final orchestrator cleanup; got ${headerLines}.`);

const requiredHeaderSymbols = [
  'HeaderRiskBadge',
  'HeaderShell',
  'useHeaderProfileMenu',
];
if (!header.includes("from './header/index'")) {
  fail('Header.tsx must import final orchestrator members from the header barrel.');
}
for (const symbol of requiredHeaderSymbols) {
  if (!header.includes(symbol)) fail(`Header.tsx missing final orchestrator symbol: ${symbol}`);
}

for (const forbiddenMarker of [
  "import { useState",
  "useRef<",
  "document.addEventListener('mousedown'",
  "const headerRiskLevel",
  "const headerRiskLevelLabel",
  "const headerRiskLevelClass",
  "const headerRiskBadgeClass",
  "to=\"/customers?risk=risky\"",
  "className=\"header-premium-shell",
]) {
  if (header.includes(forbiddenMarker)) fail(`Header.tsx still owns extracted marker: ${forbiddenMarker}`);
}

if (!shell.includes('HEADER_SHELL_CLASS') || !shell.includes('data-ui-navigation="header"') || !shell.includes('data-ui-shell="topbar"')) {
  fail('HeaderShell.tsx must own the shared topbar shell contract.');
}

for (const requiredRiskMarker of [
  'type HeaderRiskLevel',
  'getHeaderRiskLevel',
  'getHeaderRiskLevelLabel',
  'getHeaderRiskLevelClass',
  'getHeaderRiskBadgeClass',
  'to="/customers?risk=risky"',
]) {
  if (!riskBadge.includes(requiredRiskMarker)) fail(`HeaderRiskBadge.tsx missing risk marker: ${requiredRiskMarker}`);
}

for (const requiredHookMarker of [
  'useState(false)',
  'useRef<HTMLDivElement>(null)',
  "document.addEventListener('mousedown'",
  'toggleProfileMenu',
]) {
  if (!profileHook.includes(requiredHookMarker)) fail(`useHeaderProfileMenu.ts missing profile-menu marker: ${requiredHookMarker}`);
}

console.log(JSON.stringify({
  status: 'passed',
  headerLines,
  extractedFiles: [shellPath, riskBadgePath, profileHookPath],
}, null, 2));
