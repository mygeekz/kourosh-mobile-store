import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineFor = (source, index) => source.slice(0, index).split('\n').length;

const iconClassPattern = /^(?:fa|fas|far|fab|fa(?:-[a-z0-9]+)+)(?:\s+(?:fa|fas|far|fab|fa(?:-[a-z0-9]+)+))*$/;
const iconLiteralPattern = /\bicon\s*:\s*(['"])([^'"{}]+)\1/g;

const requiredContracts = [
  { file: 'types/iconMetadata.ts', snippets: ['export type FontAwesomeIconClass', 'export type NavigationIconMetadata', 'export type ReportIconMetadata', 'export type FeatureIconMetadata', 'isFontAwesomeIconClass'] },
  { file: 'types.ts', snippets: ['NavigationIconMetadata', 'ReportIconMetadata', 'icon?: NavigationIconMetadata', 'icon: ReportIconMetadata'] },
  { file: 'utils/nav.ts', snippets: ['NavigationIconMetadata', 'icon?: NavigationIconMetadata'] },
  { file: 'components/mobile-bottom-nav/mobileBottomNavTypes.ts', snippets: ['NavigationIconMetadata', 'icon: NavigationIconMetadata'] },
  { file: 'components/SidebarItem.tsx', snippets: ['NavigationIconMetadata', 'icon: NavigationIconMetadata'] },
  { file: 'utils/featureFlags.ts', snippets: ['FeatureIconMetadata', 'icon: FeatureIconMetadata'] },
];

const contractResults = requiredContracts.map(({ file, snippets }) => {
  const result = { file, exists: exists(file), snippets: {} };
  if (!result.exists) {
    failures.push(`${file} is missing.`);
    return result;
  }
  const source = read(file);
  for (const snippet of snippets) {
    const present = source.includes(snippet);
    result.snippets[snippet] = present;
    if (!present) failures.push(`${file} must contain contract snippet: ${snippet}`);
  }
  return result;
});

const sharedPrimitiveContracts = [
  'components/ui/ControlShell.tsx',
  'components/ui/EmptyState.tsx',
  'components/ui/PageKit.tsx',
  'components/ui/PageShell.tsx',
  'components/ui/PanelCard.tsx',
  'components/ui/SurfaceHeader.tsx',
  'components/ui/TextField.tsx',
];

const primitiveResults = sharedPrimitiveContracts.map((file) => {
  const source = read(file);
  const legacyStringUnion = /icon\??:\s*string\s*\|\s*React\.ReactNode/.test(source);
  const legacyStringProp = /type\s+\w*Props\s*=\s*{[\s\S]*?icon\??:\s*string[;\n]/.test(source);
  const canonicalReactNode = source.includes('icon?: React.ReactNode');
  if (legacyStringUnion) failures.push(`${file} still exposes icon?: string | React.ReactNode.`);
  if (legacyStringProp && !file.endsWith('EmptyState.tsx')) failures.push(`${file} still exposes a string icon public prop.`);
  if (!canonicalReactNode) failures.push(`${file} should keep ReactNode as the public icon primitive contract.`);
  return { file, canonicalReactNode, legacyStringUnion, legacyStringProp };
});

const walk = (dir, bucket) => {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) walk(path.join(dir, entry.name), bucket);
    else if (/\.(ts|tsx)$/.test(entry.name)) bucket.push(path.join(dir, entry.name));
  }
};

const metadataFiles = ['constants.tsx', 'components/mobile-bottom-nav/mobileBottomNavItems.ts', 'utils/featureFlags.ts'];
const reportFiles = [];
walk('pages/reports', reportFiles);
walk('components/reports', reportFiles);

const inspectIconLiterals = (files, category) => {
  const records = [];
  for (const file of files) {
    if (!exists(file)) continue;
    const source = read(file);
    let match;
    while ((match = iconLiteralPattern.exec(source))) {
      const value = match[2].trim();
      const valid = iconClassPattern.test(value);
      const record = { category, file, line: lineFor(source, match.index), value, valid };
      records.push(record);
      if (!valid) failures.push(`${file}:${record.line} has invalid icon metadata: ${value}`);
    }
  }
  return records;
};

const navigationIconLiterals = inspectIconLiterals(metadataFiles, 'navigation-feature-metadata');
const reportIconLiterals = inspectIconLiterals(reportFiles, 'report-metadata');

const emptyStateLegacyIconConsumers = [];
const allSourceFiles = [];
for (const dir of ['app', 'components', 'contexts', 'hooks', 'pages', 'shared', 'utils']) walk(dir, allSourceFiles);
for (const file of allSourceFiles) {
  const source = read(file);
  const regex = /<EmptyState\b[^>]*\bicon=(['"])/g;
  let match;
  while ((match = regex.exec(source))) {
    emptyStateLegacyIconConsumers.push({ file, line: lineFor(source, match.index) });
  }
}
if (emptyStateLegacyIconConsumers.length > 0) {
  failures.push('Legacy <EmptyState icon="..." /> consumers must not return. Use ReactNode icons.');
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  contractResults,
  primitiveResults,
  navigationIconLiteralCount: navigationIconLiterals.length,
  reportIconLiteralCount: reportIconLiterals.length,
  invalidNavigationIconLiterals: navigationIconLiterals.filter((item) => !item.valid),
  invalidReportIconLiterals: reportIconLiterals.filter((item) => !item.valid),
  emptyStateLegacyIconConsumers,
  policy: {
    sharedUiPrimitiveIcons: 'ReactNode only at public component boundaries.',
    navigationIcons: 'FontAwesome class strings are allowed only as metadata registries.',
    reportIcons: 'FontAwesome class strings are allowed only as local/report metadata until a dedicated registry migration.',
  },
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase28-navigation-icon-metadata-contracts.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Navigation icon metadata audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Navigation icon metadata audit passed. Navigation/feature literals: ${navigationIconLiterals.length}. Report literals: ${reportIconLiterals.length}.`);
