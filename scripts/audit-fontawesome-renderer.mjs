import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineFor = (source, index) => source.slice(0, index).split('\n').length;

const required = [
  { file: 'components/ui/FontAwesomeIcon.tsx', snippets: ['FontAwesomeIconProps', 'FontAwesomeIconClass', 'fixedWidth', 'aria-hidden'] },
  { file: 'components/ui/index.ts', snippets: ["FontAwesomeIcon"] },
  { file: 'components/SidebarItem.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon={icon} fixedWidth'] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon={item.icon}'] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavPrimaryAction.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon="fa-solid fa-plus"'] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavMenuButton.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon="fa-solid fa-bars"'] },
  { file: 'components/command-palette/CommandPaletteRows.tsx', snippets: ["import FontAwesomeIcon", 'FontAwesomeIconClass', '<FontAwesomeIcon icon={icon ??'] },
  { file: 'components/header/HeaderRiskBadge.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon={getHeaderRiskIcon(riskLevel)}'] },
  { file: 'components/header/HeaderQuickActions.tsx', snippets: ["import FontAwesomeIcon", '<FontAwesomeIcon icon={action.icon}'] },
  { file: 'components/header/HeaderSearch.tsx', snippets: ["import FontAwesomeIcon", 'FontAwesomeIconClass', '<FontAwesomeIcon icon={meta.icon}'] },
  { file: 'contexts/FavoritesContext.tsx', snippets: ['NavigationIconMetadata', 'icon?: NavigationIconMetadata'] },
  { file: 'utils/recents.ts', snippets: ['NavigationIconMetadata', 'icon?: NavigationIconMetadata'] },
];

const contractResults = required.map(({ file, snippets }) => {
  const result = { file, exists: exists(file), snippets: {} };
  if (!result.exists) {
    failures.push(`${file} is missing.`);
    return result;
  }
  const source = read(file);
  for (const snippet of snippets) {
    const present = source.includes(snippet);
    result.snippets[snippet] = present;
    if (!present) failures.push(`${file} must contain renderer snippet: ${snippet}`);
  }
  return result;
});

const noRawMetadataRenderChecks = [
  { file: 'components/SidebarItem.tsx', patterns: [/className=\{clsx\(icon,/, /<i\s+className=\{icon\b/] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavItemLink.tsx', patterns: [/className=\{cn\(item\.icon,/, /<i\s+className=\{item\.icon\b/] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavPrimaryAction.tsx', patterns: [] },
  { file: 'components/mobile-bottom-nav/MobileBottomNavMenuButton.tsx', patterns: [] },
  { file: 'components/command-palette/CommandPaletteRows.tsx', patterns: [/className=\{icon \?\?/, /className=\{badge\.icon\}/] },
  { file: 'components/header/HeaderRiskBadge.tsx', patterns: [] },
  { file: 'components/header/HeaderQuickActions.tsx', patterns: [/className=\{action\.icon\}/] },
  { file: 'components/header/HeaderSearch.tsx', patterns: [/className=\{meta\.icon\}/] },
];

const rawMetadataRenderFindings = [];
for (const check of noRawMetadataRenderChecks) {
  const source = read(check.file);
  for (const pattern of check.patterns) {
    const match = pattern.exec(source);
    if (match) {
      const finding = { file: check.file, line: lineFor(source, match.index), pattern: String(pattern) };
      rawMetadataRenderFindings.push(finding);
      failures.push(`${check.file}:${finding.line} still renders metadata icon strings through raw <i className={...}> composition.`);
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'passed' : 'failed',
  contractResults,
  rawMetadataRenderFindings,
  policy: {
    metadataStorage: 'FontAwesome class strings may remain in navigation/report/feature metadata registries.',
    rendering: 'Navigation/search/header surfaces should render metadata through components/ui/FontAwesomeIcon.tsx.',
    publicPrimitives: 'Shared UI primitives should continue to accept ReactNode icons at public boundaries unless explicitly documented as metadata renderers.',
  },
};

fs.mkdirSync(path.join(root, 'docs/typescript'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/typescript/phase29-fontawesome-renderer.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error('FontAwesome renderer audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FontAwesome renderer audit passed. Navigation/search metadata now renders through the canonical renderer.');
