import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'components/Header.tsx',
  'components/header/HeaderShell.tsx',
  'components/header/HeaderLayout.tsx',
  'components/header/HeaderIconButton.tsx',
  'components/header/HeaderTitleArea.tsx',
  'components/header/HeaderSearch.tsx',
  'components/header/HeaderQuickActions.tsx',
  'components/header/HeaderQuickPopover.tsx',
  'components/header/HeaderRiskBadge.tsx',
  'components/header/HeaderProfileMenu.tsx',
  'components/header/useHeaderQuickData.ts',
  'styles/system/ui-contracts/navigation-shell-contract-phase5.css',
  'config/ui/header-surface-manifest.json',
  'docs/ui/HEADER_ARCHITECTURE.md'
];

for (const file of requiredFiles) assert(exists(file), `Missing header contract file: ${file}`);

if (!failures.length) {
  const header = read('components/Header.tsx');
  const shell = read('components/header/HeaderShell.tsx');
  const layout = read('components/header/HeaderLayout.tsx');
  const search = read('components/header/HeaderSearch.tsx');
  const titleArea = read('components/header/HeaderTitleArea.tsx');
  const actions = read('components/header/HeaderQuickActions.tsx');
  const quickPopover = read('components/header/HeaderQuickPopover.tsx');
  const iconButton = read('components/header/HeaderIconButton.tsx');
  const dataHook = read('components/header/useHeaderQuickData.ts');
  const css = read('styles/system/ui-contracts/navigation-shell-contract-phase5.css');
  const activeSources = [
    'components/Header.tsx',
    ...fs.readdirSync(path.join(root, 'components', 'header'))
      .filter((name) => /\.(tsx|ts)$/.test(name))
      .map((name) => `components/header/${name}`),
  ].map((file) => [file, read(file)]);

  assert(header.includes('<HeaderLayout'), 'Header.tsx must delegate layout ownership to HeaderLayout.');
  assert(shell.includes("'app-header-shell'"), 'HeaderShell must use the canonical app-header-shell namespace.');
  assert(shell.includes('data-header-contract="v3"'), 'HeaderShell must expose data-header-contract=v3.');
  for (const region of ['title', 'search', 'live-actions', 'utilities']) {
    assert(layout.includes(`data-ui-header-region="${region}"`), `HeaderLayout missing ${region} slot.`);
  }
  assert(!layout.includes('app-header-layout__actions'), 'HeaderLayout must expose four direct slots without a mixed actions wrapper.');

  const forbidden = [
    'header-premium-shell',
    'header-search-v436',
    'header-action-icon',
    'header-flat-icon-btn',
    'header-smart-popover',
    'header-quick-role-pill',
  ];
  for (const [file, source] of activeSources) {
    for (const marker of forbidden) {
      assert(!source.includes(marker), `${file} reintroduced legacy Header namespace: ${marker}`);
    }
  }

  assert(search.includes('className="app-header-search"'), 'HeaderSearch must use one canonical search frame.');
  assert(!search.includes('hidden md:block'), 'HeaderSearch must not mix Tailwind responsive visibility with the canonical contract.');
  assert(!search.includes('md:hidden'), 'Mobile search visibility must be owned by the header container contract.');
  assert(search.includes('app-header-search__command'), 'Command palette trigger must live inside the search frame.');
  assert(!titleArea.includes('app-header-title__breadcrumb'), 'HeaderTitleArea must not render a duplicate breadcrumb row.');
  assert(!search.includes('top-[calc(100%+26px)]'), 'Search panel must not use the legacy detached 26px offset.');

  assert(actions.includes('className="app-header-live-action"'), 'Quick actions must use canonical compact controls.');
  assert(actions.includes('data-header-live-action-key='), 'Quick actions must use isolated instrumentation.');
  assert(!actions.includes('data-ui-header-quick-action='), 'Legacy quick-action instrumentation must not match the active Header.');
  assert(actions.includes('{isOpen ? ('), 'Closed quick panels must not remain mounted.');
  assert(!actions.includes('onMouseEnter='), 'Header quick menus must not open on hover.');
  assert(!actions.includes('onMouseLeave='), 'Header quick menus must not close on hover.');
  assert(!actions.includes('min-w-[124px]'), 'Legacy 124px quick-action width is forbidden.');
  assert(!actions.includes('hover:-translate-y'), 'Header hover translation is forbidden.');
  assert(!actions.includes('data-ui-notification-beacon'), 'Header count controls must not add a second animated notification beacon.');

  assert(actions.includes('<HeaderQuickPopover'), 'Quick actions must delegate popover framing to HeaderQuickPopover.');
  assert(!actions.includes('getQuickActionAccent'), 'Legacy accent-map popover styling is forbidden.');
  assert(!actions.includes('bg-[linear-gradient'), 'Header popovers must not embed gradient surface classes.');
  assert(quickPopover.includes('app-header-popover__body'), 'HeaderQuickPopover must expose an independent body viewport.');
  assert(iconButton.includes('<button'), 'HeaderIconButton must be a native canonical icon control.');
  assert(!iconButton.includes("from '../ui'"), 'HeaderIconButton must not inherit the generic Button surface.');

  assert(!actions.includes('app-header-live-action__chevron'), 'Header live actions must not render decorative chevrons.');
  assert(!actions.includes('app-header-live-action__label'), 'Header live actions must remain compact icon-count controls.');
  assert(css.includes('[data-header-contract="v3"] :where(button, a, input, [role="button"]):focus-visible'), 'Header v3 must suppress the visual focus box in its own canonical contract.');

  assert(!dataHook.includes('locationPathname'), 'Route changes must not refetch all header datasets.');

  for (const marker of [
    '.app-header-layout',
    '.app-header-search',
    '.app-header-live-action',
    '.app-header-risk',
    '.app-header-popover',
    'grid-template-rows: auto minmax(0, 1fr) auto',
    '.app-header-popover__body',
    'inset-inline-end: 0',
    'container-name: app-header',
    '@container app-header (max-width: 1080px)',
    '@container app-header (max-width: 860px)',
  ]) {
    assert(css.includes(marker), `Canonical header CSS missing marker: ${marker}`);
  }
}

if (failures.length) {
  console.error('Header contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Header contract audit passed: calm v3 layout, single search surface, icon-count actions and no focus ring are enforced.');
