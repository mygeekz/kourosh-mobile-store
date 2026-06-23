import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const controlShell = read('components/ui/ControlShell.tsx');
const emptyState = read('components/ui/EmptyState.tsx');

if (!controlShell.includes('[key: `data-${string}`]')) {
  failures.push('ControlShell must explicitly accept data-* attributes for legacy field-shell consumers.');
}
if (!controlShell.includes('...shellProps')) {
  failures.push('ControlShell must spread safe shell props onto the label wrapper.');
}
if (emptyState.includes('text?: string')) {
  failures.push('EmptyState must not keep the legacy text alias after Phase 26. Use the canonical title prop.');
}
if (emptyState.includes('title || text')) {
  failures.push('EmptyState must not promote legacy text after Phase 26. Consumers should pass title explicitly.');
}
if (emptyState.includes('icon?: string | React.ReactNode')) {
  failures.push('EmptyState must not expose the legacy string icon prop after Phase 27. Use ReactNode icons at call sites.');
}
if (!emptyState.includes('icon?: React.ReactNode')) {
  failures.push('EmptyState must expose a ReactNode-only icon prop after Phase 27.');
}

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
};
walk(root);

const legacyEmptyStateUsages = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  const regex = /<EmptyState\b[^>]*\btext=/g;
  let match;
  while ((match = regex.exec(source))) {
    const line = source.slice(0, match.index).split('\n').length;
    legacyEmptyStateUsages.push({ file: rel, line });
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  contracts: {
    controlShellDataAttributes: controlShell.includes('[key: `data-${string}`]'),
    controlShellShellPropsSpread: controlShell.includes('...shellProps'),
    emptyStateTextAliasRemoved: !emptyState.includes('text?: string'),
    emptyStateTextPromotionRemoved: !emptyState.includes('title || text'),
    emptyStateReactNodeOnlyIconProp: emptyState.includes('icon?: React.ReactNode') && !emptyState.includes('icon?: string | React.ReactNode'),
  },
  legacyEmptyStateUsages,
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase24-ui-prop-contracts.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('UI prop contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`UI prop contract audit passed. Legacy EmptyState text usages remaining: ${legacyEmptyStateUsages.length}.`);
