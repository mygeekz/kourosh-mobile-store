import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineFor = (source, index) => source.slice(0, index).split('\n').length;

const targetSurfaces = [
  'components/header/HeaderRiskBadge.tsx',
  'components/header/HeaderQuickActions.tsx',
  'components/header/HeaderSearch.tsx',
  'components/header/HeaderProfileMenu.tsx',
  'components/command-palette/CommandPaletteSearchHeader.tsx',
  'components/command-palette/CommandPaletteDiscoverySections.tsx',
  'components/command-palette/CommandPaletteRows.tsx',
  'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx',
  'components/mobile-bottom-nav/MobileBottomNavPrimaryAction.tsx',
  'components/mobile-bottom-nav/MobileBottomNavMenuButton.tsx',
];

const failures = [];
const findings = [];

const rawIconPattern = /<i(?=[\s>])/g;

for (const file of targetSurfaces) {
  if (!exists(file)) {
    failures.push(`${file} is missing.`);
    continue;
  }

  const source = read(file);
  const hasCanonicalImport = source.includes("import FontAwesomeIcon") || source.includes("FontAwesomeIcon from './ui/FontAwesomeIcon'");
  const canonicalRenderCount = (source.match(/<FontAwesomeIcon\b/g) ?? []).length;
  const rawMatches = [...source.matchAll(rawIconPattern)].map((match) => ({
    file,
    line: lineFor(source, match.index),
  }));

  findings.push({
    file,
    canonicalRenderCount,
    rawIconCount: rawMatches.length,
    rawIconLines: rawMatches.map((match) => match.line),
  });

  if (!hasCanonicalImport) failures.push(`${file} must import the canonical FontAwesomeIcon renderer.`);
  if (canonicalRenderCount === 0) failures.push(`${file} should render icons through FontAwesomeIcon.`);
  for (const match of rawMatches) {
    failures.push(`${file}:${match.line} still contains a raw <i> icon element in the static navigation/search surface.`);
  }
}

const requiredSnippets = [
  {
    file: 'components/header/HeaderRiskBadge.tsx',
    snippets: [
      '<FontAwesomeIcon icon={getHeaderRiskIcon(riskLevel)}',
    ],
  },
  {
    file: 'components/header/HeaderQuickActions.tsx',
    snippets: [
      'icon="fa-solid fa-angle-down"',
      '<FontAwesomeIcon icon={action.icon}',
    ],
  },
  {
    file: 'components/header/HeaderSearch.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fa-solid fa-bolt"',
      '<FontAwesomeIcon icon="fa-solid fa-search"',
    ],
  },
  {
    file: 'components/header/HeaderProfileMenu.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fas fa-sign-out-alt"',
    ],
  },
  {
    file: 'components/command-palette/CommandPaletteSearchHeader.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fa-solid fa-magnifying-glass"',
      '<FontAwesomeIcon icon="fa-solid fa-xmark"',
      '<FontAwesomeIcon icon="fa-solid fa-wand-magic-sparkles"',
    ],
  },
  {
    file: 'components/command-palette/CommandPaletteDiscoverySections.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fa-solid fa-star"',
    ],
  },
  {
    file: 'components/command-palette/CommandPaletteRows.tsx',
    snippets: [
      '<FontAwesomeIcon icon={icon ??',
      '<FontAwesomeIcon icon={badge.icon}',
    ],
  },
  {
    file: 'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx',
    snippets: [
      '<FontAwesomeIcon icon={item.icon}',
    ],
  },
  {
    file: 'components/mobile-bottom-nav/MobileBottomNavPrimaryAction.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fa-solid fa-plus"',
    ],
  },
  {
    file: 'components/mobile-bottom-nav/MobileBottomNavMenuButton.tsx',
    snippets: [
      '<FontAwesomeIcon icon="fa-solid fa-bars"',
    ],
  },
];

const snippetResults = [];
for (const check of requiredSnippets) {
  const source = exists(check.file) ? read(check.file) : '';
  const snippets = {};
  for (const snippet of check.snippets) {
    const present = source.includes(snippet);
    snippets[snippet] = present;
    if (!present) failures.push(`${check.file} is missing expected canonical icon renderer snippet: ${snippet}`);
  }
  snippetResults.push({ file: check.file, snippets });
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  targetSurfaces,
  findings,
  snippetResults,
  policy: {
    goal: 'Static FontAwesome icons in navigation/search shell surfaces should render through components/ui/FontAwesomeIcon.tsx.',
    scope: 'Header, CommandPalette, and MobileBottomNav only. Report-heavy and chart-heavy surfaces remain out of scope for Phase 30.',
    allowedMetadata: 'FontAwesome class strings may remain in metadata registries; UI surfaces should use the canonical renderer when rendering them.',
  },
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase30-static-icon-surface.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Static icon surface audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Static icon surface audit passed. Header, CommandPalette, and MobileBottomNav render icons through the canonical renderer.');
