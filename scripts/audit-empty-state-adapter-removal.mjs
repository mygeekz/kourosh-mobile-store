import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const emptyStatePath = path.join(root, 'components/ui/EmptyState.tsx');
const emptyStateSource = fs.readFileSync(emptyStatePath, 'utf8');
const sourceDirs = ['app', 'components', 'contexts', 'hooks', 'pages', 'shared', 'utils'];
const ignoredDirs = new Set(['node_modules', 'dist', '.git']);
const files = [];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
};

for (const dir of sourceDirs) walk(path.join(root, dir));

const legacyTextConsumers = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  let match;
  const textPropRegex = /<EmptyState\b[^>]*\btext=/g;
  while ((match = textPropRegex.exec(source))) {
    legacyTextConsumers.push({ file: rel, line: source.slice(0, match.index).split('\n').length });
  }
}

const failures = [];
if (emptyStateSource.includes('text?: string')) {
  failures.push('components/ui/EmptyState.tsx still exposes the legacy text prop.');
}
if (emptyStateSource.includes('title || text')) {
  failures.push('components/ui/EmptyState.tsx still promotes text to title.');
}
if (legacyTextConsumers.length > 0) {
  failures.push('Legacy <EmptyState text=... /> consumers still exist.');
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  adapterRemoved: !emptyStateSource.includes('text?: string') && !emptyStateSource.includes('title || text'),
  legacyTextConsumers,
  notes: [
    'Phase 26 removes the shared EmptyState text alias after Phase 25 migrated consumers to title.',
    'Local components may still use a prop named text if they are not importing components/ui/EmptyState.'
  ]
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase26-empty-state-adapter-removal.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('EmptyState adapter removal audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  for (const item of legacyTextConsumers) console.error(`  legacy consumer: ${item.file}:${item.line}`);
  process.exit(1);
}

console.log('EmptyState adapter removal audit passed: shared text alias removed and no text consumers remain.');
