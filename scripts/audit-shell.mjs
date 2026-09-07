import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const lineCount = (relativePath) => (exists(relativePath) ? read(relativePath).split(/\r?\n/).length : 0);

const auditTargets = [
  { name: 'routes', script: 'scripts/audit-route-access-matrix.mjs' },
  { name: 'rbac', script: 'scripts/audit-rbac-alignment.mjs' },
  { name: 'features', script: 'scripts/audit-feature-access-policy.mjs' },
  { name: 'navigation', script: 'scripts/audit-navigation-policy.mjs' },
  { name: 'shell-boundary', script: 'scripts/audit-shell-boundary.mjs' },
  { name: 'case-safe-imports', script: 'scripts/audit-case-safe-module-imports.mjs' },
  { name: 'main-layout-shell', script: 'scripts/audit-main-layout-shell.mjs' },
  { name: 'header-decomposition', script: 'scripts/audit-header-decomposition.mjs' },
  { name: 'header-quick-actions', script: 'scripts/audit-header-quick-actions.mjs' },
  { name: 'header-data-hook', script: 'scripts/audit-header-data-hook.mjs' },
  { name: 'header-search-hook', script: 'scripts/audit-header-search-hook.mjs' },
  { name: 'header-currency-hook', script: 'scripts/audit-header-currency-hook.mjs' },
  { name: 'header-final-orchestrator', script: 'scripts/audit-header-final-orchestrator.mjs' },
  { name: 'header-barrel', script: 'scripts/audit-header-barrel.mjs' },
  { name: 'sidebar-decomposition', script: 'scripts/audit-sidebar-decomposition.mjs' },
  { name: 'sidebar-row-flyout', script: 'scripts/audit-sidebar-row-flyout.mjs' },
  { name: 'sidebar-state-hook', script: 'scripts/audit-sidebar-state-hook.mjs' },
  { name: 'command-palette', script: 'scripts/audit-command-palette-decomposition.mjs' },
  { name: 'command-palette-data-hook', script: 'scripts/audit-command-palette-data-hook.mjs' },
  { name: 'command-palette-state-hook', script: 'scripts/audit-command-palette-state-hook.mjs' },
  { name: 'command-palette-final', script: 'scripts/audit-command-palette-final-orchestrator.mjs' },
  { name: 'mobile-bottom-nav', script: 'scripts/audit-mobile-bottom-nav-decomposition.mjs' },
  { name: 'navigation-icons', script: 'scripts/audit-navigation-icon-metadata.mjs' },
  { name: 'fontawesome-renderer', script: 'scripts/audit-fontawesome-renderer.mjs' },
  { name: 'static-icons', script: 'scripts/audit-static-icon-surface.mjs' },
  { name: 'unused-imports', script: 'scripts/audit-unused-imports.mjs' },
];

const failures = [];
const results = [];

for (const target of auditTargets) {
  if (!exists(target.script)) {
    failures.push(`${target.name}: missing script ${target.script}`);
    results.push({ name: target.name, status: 'missing', script: target.script });
    continue;
  }

  const result = spawnSync(process.execPath, [target.script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';

  if (result.status !== 0) {
    failures.push(`${target.name}: failed with exit code ${result.status ?? 'unknown'}${stderr ? `\n${stderr}` : ''}${stdout ? `\n${stdout}` : ''}`);
    results.push({ name: target.name, status: 'failed', exitCode: result.status, script: target.script });
    continue;
  }

  results.push({ name: target.name, status: 'passed', script: target.script });
}

const requiredShellFiles = [
  'components/shell/index.ts',
  'components/MainLayout.tsx',
  'components/main-layout/index.ts',
  'components/Header.tsx',
  'components/header/index.ts',
  'components/Sidebar.tsx',
  'components/sidebar/index.ts',
  'components/MobileBottomNav.tsx',
  'components/mobile-bottom-nav/index.ts',
  'components/CommandPalette.tsx',
  'components/command-palette/index.ts',
];

for (const file of requiredShellFiles) {
  if (!exists(file)) failures.push(`required shell file missing: ${file}`);
}

const lineBudgets = {
  'components/MainLayout.tsx': 80,
  'components/Header.tsx': 190,
  'components/Sidebar.tsx': 170,
  'components/MobileBottomNav.tsx': 10,
  'components/mobile-bottom-nav/MobileBottomNav.tsx': 60,
  'components/CommandPalette.tsx': 180,
};

for (const [file, budget] of Object.entries(lineBudgets)) {
  if (!exists(file)) continue;
  const lines = lineCount(file);
  if (lines > budget) failures.push(`${file} exceeds shell line budget ${budget}; current: ${lines}`);
}

if (exists('components/shell/index.ts')) {
  const shellBarrel = read('components/shell/index.ts');
  for (const token of ['MainLayout', 'Header', 'Sidebar', 'MobileBottomNav']) {
    if (!shellBarrel.includes(token)) failures.push(`components/shell/index.ts missing public shell export token: ${token}`);
  }
}

const directPageImportChecks = [
  'components/MainLayout.tsx',
  'components/Header.tsx',
  'components/Sidebar.tsx',
  'components/MobileBottomNav.tsx',
  'components/CommandPalette.tsx',
];

for (const file of directPageImportChecks) {
  if (!exists(file)) continue;
  const content = read(file);
  if (/from ['"].*pages\//.test(content)) failures.push(`${file} imports from pages/, which violates shell boundary.`);
}

const summary = {
  status: failures.length > 0 ? 'failed' : 'passed',
  audits: results,
  auditedCount: results.length,
  lineCounts: Object.fromEntries(Object.keys(lineBudgets).map((file) => [file, lineCount(file)])),
  requiredShellFiles,
};

if (failures.length > 0) {
  console.error('Consolidated shell audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
