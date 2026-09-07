import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const palette = read('components/CommandPalette.tsx');
const rows = read('components/command-palette/CommandPaletteRows.tsx');
const header = read('components/command-palette/CommandPaletteSearchHeader.tsx');
const discovery = read('components/command-palette/CommandPaletteDiscoverySections.tsx');
const overlay = read('styles/system/overlay-layer-contract.css');
const reports = read('styles/pages/reports.css');
const modalPartner = read('styles/system/modal-partner-foundation.css');
const manifest = JSON.parse(read('config/ui/command-palette-surface-manifest.json'));

assert(palette.includes('command-palette-shell'), 'Command palette must use the canonical shell.');
assert(palette.includes('command-palette-viewport'), 'Command palette body must own the only scroll viewport.');
assert(!palette.includes('ux-stable-panel'), 'Legacy stable panel classes are forbidden on command palette.');
assert(!rows.includes('framer-motion') && !rows.includes('<motion.'), 'Command palette rows must not use Framer Motion.');
assert(!rows.includes('bg-slate-900') && !rows.includes('dark:bg-white'), 'Inverse selected-row styling is forbidden.');
assert(rows.includes('data-selected'), 'Rows must expose semantic selected state.');
assert(rows.includes('command-palette-row__favorite-action'), 'Favorite action must use the dedicated frameless primitive.');
assert(rows.includes('data-skip-global-button="true"'), 'Command palette row buttons must opt out of global button styling.');
assert(header.includes('data-skip-global-button="true"'), 'Command palette header buttons must opt out of global button styling.');
assert(discovery.includes('data-skip-global-button="true"'), 'Query chips must opt out of global button styling.');
assert(header.includes('command-palette-search-control'), 'Search header must use canonical search control.');
assert(overlay.includes('.command-palette-shell') && overlay.includes('.command-palette-row[data-selected="true"]'), 'Overlay contract must own shell and selected row styling.');
assert(overlay.includes('min-block-size: 23px') && overlay.includes('min-block-size: 42px'), 'Compact chip and row scales must remain enforced.');
assert(overlay.includes('.command-palette-row__favorite-action') && overlay.includes('background: transparent !important'), 'Favorite action must remain frameless.');
assert(!reports.includes('.command-palette-panel') && !reports.includes('.command-palette-input'), 'Reports CSS must not style command palette.');
assert(!modalPartner.includes('.command-palette-panel') && !modalPartner.includes('.command-palette,'), 'Generic modal/partner CSS must not own command palette.');
assert(manifest.styleOwner === 'styles/system/overlay-layer-contract.css', 'Command palette manifest must identify canonical style owner.');

if (failures.length) {
  console.error('Command palette UI contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Command palette UI contract audit passed: canonical shell, compact typography, soft selection and isolated style ownership are enforced.');
