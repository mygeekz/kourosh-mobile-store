import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const headerDir = path.join(root, 'components', 'header');
const barrelPath = path.join(headerDir, 'index.ts');
const headerPath = path.join(root, 'components', 'Header.tsx');

const requiredExports = [
  "HeaderProfileMenu",
  "HeaderQuickActions",
  "HeaderRiskBadge",
  "HeaderSearch",
  "HeaderShell",
  "HeaderThemeToggle",
  "HeaderTitleArea",
  "useHeaderCurrency",
  "useHeaderProfileMenu",
  "useHeaderQuickData",
  "useHeaderSearch",
];

const failures = [];

if (!fs.existsSync(barrelPath)) {
  failures.push('Missing components/header/index.ts barrel export.');
} else {
  const barrel = fs.readFileSync(barrelPath, 'utf8');
  for (const exportedName of requiredExports) {
    if (!barrel.includes(exportedName)) {
      failures.push(`Header barrel is missing export: ${exportedName}`);
    }
  }

  if (!barrel.includes("export type * from './headerTypes'")) {
    failures.push('Header barrel must re-export headerTypes as type-only exports.');
  }
}

if (!fs.existsSync(headerPath)) {
  failures.push('Missing components/Header.tsx.');
} else {
  const header = fs.readFileSync(headerPath, 'utf8');
  if (!header.includes("from './header/index'")) {
    failures.push('Header.tsx must import header module members from ./header/index barrel.');
  }

  const disallowedDirectImports = [
    './header/HeaderSearch',
    './header/HeaderTitleArea',
    './header/HeaderThemeToggle',
    './header/HeaderProfileMenu',
    './header/HeaderQuickActions',
    './header/HeaderRiskBadge',
    './header/HeaderShell',
    './header/useHeaderQuickData',
    './header/useHeaderSearch',
    './header/useHeaderCurrency',
    './header/useHeaderProfileMenu',
  ];

  for (const importPath of disallowedDirectImports) {
    if (header.includes(importPath)) {
      failures.push(`Header.tsx still imports a header submodule directly: ${importPath}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Header barrel audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Header barrel audit passed: Header module exports and imports are centralized.');
