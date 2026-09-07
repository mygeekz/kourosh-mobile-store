import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const contracts = [
  {
    file: 'components/Header.tsx',
    forbidden: ["from './header'", 'from "./header"'],
    required: ["from './header/index'"],
    reason: 'components/Header.tsx and components/header/ collide on case-insensitive filesystems unless /index is explicit.',
  },
  {
    file: 'components/MainLayout.tsx',
    forbidden: ["from './main-layout'", 'from "./main-layout"'],
    required: ["from './main-layout/index'"],
    reason: 'components/MainLayout.tsx and components/main-layout/ collide on case-insensitive filesystems unless /index is explicit.',
  },
  {
    file: 'components/Sidebar.tsx',
    forbidden: ["from './sidebar'", 'from "./sidebar"'],
    required: ["from './sidebar/index'"],
    reason: 'components/Sidebar.tsx and components/sidebar/ collide on case-insensitive filesystems unless /index is explicit.',
  },
  {
    file: 'components/CommandPalette.tsx',
    forbidden: ["from './command-palette'", 'from "./command-palette"'],
    required: ["from './command-palette/index'"],
    reason: 'components/CommandPalette.tsx and components/command-palette/ collide on case-insensitive filesystems unless /index is explicit.',
  },
  {
    file: 'components/MobileBottomNav.tsx',
    forbidden: ["from './mobile-bottom-nav'", 'from "./mobile-bottom-nav"'],
    required: ["from './mobile-bottom-nav/index'"],
    reason: 'components/MobileBottomNav.tsx and components/mobile-bottom-nav/ collide on case-insensitive filesystems unless /index is explicit.',
  },
];

for (const contract of contracts) {
  if (!exists(contract.file)) {
    failures.push(`Missing file for case-safe import audit: ${contract.file}`);
    continue;
  }
  const source = read(contract.file);
  for (const forbidden of contract.forbidden) {
    if (source.includes(forbidden)) failures.push(`${contract.file} uses ambiguous barrel import ${forbidden}. ${contract.reason}`);
  }
  for (const required of contract.required) {
    if (!source.includes(required)) failures.push(`${contract.file} must use explicit case-safe import/export ${required}. ${contract.reason}`);
  }
}

const summary = {
  status: failures.length ? 'failed' : 'passed',
  auditedFiles: contracts.map((contract) => contract.file),
};

if (failures.length) {
  console.error('Case-safe module import audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
