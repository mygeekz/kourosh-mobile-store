import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDirs = ['app', 'components', 'contexts', 'hooks', 'pages', 'shared', 'utils'];
const ignoredDirs = new Set(['node_modules', 'dist', '.git']);
const files = [];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx)$/.test(entry.name)) files.push(full);
  }
};

for (const dir of sourceDirs) walk(path.join(root, dir));

const legacyTextConsumers = [];
const canonicalTitleConsumers = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  let match;
  const textRegex = /<EmptyState\b[^>]*\btext=/g;
  while ((match = textRegex.exec(source))) {
    legacyTextConsumers.push({ file: rel, line: source.slice(0, match.index).split('\n').length });
  }

  const titleRegex = /<EmptyState\b[^>]*\btitle=/g;
  while ((match = titleRegex.exec(source))) {
    canonicalTitleConsumers.push({ file: rel, line: source.slice(0, match.index).split('\n').length });
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  status: legacyTextConsumers.length === 0 ? 'passed' : 'failed',
  legacyTextConsumers,
  canonicalTitleConsumerCount: canonicalTitleConsumers.length,
  canonicalTitleConsumers,
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase25-empty-state-consumers.json'), `${JSON.stringify(report, null, 2)}\n`);

if (legacyTextConsumers.length > 0) {
  console.error('Legacy EmptyState text consumers remain:');
  for (const item of legacyTextConsumers) console.error(`- ${item.file}:${item.line}`);
  process.exit(1);
}

console.log(`EmptyState consumer audit passed. Canonical title consumers: ${canonicalTitleConsumers.length}.`);
