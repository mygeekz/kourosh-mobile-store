import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDirs = ['app', 'components', 'contexts', 'hooks', 'pages', 'shared', 'utils'];
const ignoredDirs = new Set(['node_modules', 'dist', '.git']);
const files = [];
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineFor = (source, index) => source.slice(0, index).split('\n').length;

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
};

for (const dir of sourceDirs) walk(path.join(root, dir));

const canonicalIconContracts = [
  { file: 'components/ui/ControlShell.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/EmptyState.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/PageKit.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/PageShell.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/PanelCard.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/SurfaceHeader.tsx', contract: 'icon?: React.ReactNode' },
  { file: 'components/ui/TextField.tsx', contract: 'icon?: React.ReactNode' },
];

const contractResults = canonicalIconContracts.map(({ file, contract }) => {
  const source = read(file);
  const exposesLegacyStringUnion = /icon\??:\s*string\s*\|\s*React\.ReactNode/.test(source);
  const hasCanonicalContract = source.includes(contract);
  if (exposesLegacyStringUnion) failures.push(`${file} still exposes string | ReactNode for icon.`);
  if (!hasCanonicalContract) failures.push(`${file} must expose ${contract}.`);
  return { file, hasCanonicalContract, exposesLegacyStringUnion };
});

const legacyEmptyStateIconConsumers = [];
const canonicalEmptyStateIconConsumers = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');

  let match;
  const legacyIconRegex = /<EmptyState\b[^>]*\bicon=(["'])/g;
  while ((match = legacyIconRegex.exec(source))) {
    legacyEmptyStateIconConsumers.push({ file: rel, line: lineFor(source, match.index) });
  }

  const canonicalIconRegex = /<EmptyState\b[^>]*\bicon=\{/g;
  while ((match = canonicalIconRegex.exec(source))) {
    canonicalEmptyStateIconConsumers.push({ file: rel, line: lineFor(source, match.index) });
  }
}

if (legacyEmptyStateIconConsumers.length > 0) {
  failures.push('Legacy <EmptyState icon="..." /> consumers still exist. Pass a ReactNode instead.');
}

const toleratedStringIconSurfaces = [
  'Navigation metadata and FontAwesome class registries intentionally remain string-based until a dedicated navigation-icon migration.',
  'Report-local KPI cards and smart-insight contracts intentionally remain string-based because they render FontAwesome classes internally.',
  'This audit only hardens canonical shared UI primitives and EmptyState call sites.'
];

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  canonicalIconContracts: contractResults,
  legacyEmptyStateIconConsumers,
  canonicalEmptyStateIconConsumerCount: canonicalEmptyStateIconConsumers.length,
  canonicalEmptyStateIconConsumers,
  toleratedStringIconSurfaces,
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase27-icon-compatibility-contracts.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Icon compatibility contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  for (const item of legacyEmptyStateIconConsumers) console.error(`  legacy EmptyState icon consumer: ${item.file}:${item.line}`);
  process.exit(1);
}

console.log(`Icon compatibility contract audit passed. Canonical EmptyState icon consumers: ${canonicalEmptyStateIconConsumers.length}.`);
