import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineCount = (file) => read(file).split(/\r?\n/).length;
const fail = (message) => {
  console.error(`CommandPalette state hook audit failed: ${message}`);
  process.exit(1);
};

const commandPaletteFile = 'components/CommandPalette.tsx';
const hookFile = 'components/command-palette/useCommandPaletteState.ts';
const barrelFile = 'components/command-palette/index.ts';

if (!exists(hookFile)) fail(`missing ${hookFile}`);

const commandPalette = read(commandPaletteFile);
const hook = read(hookFile);
const barrel = read(barrelFile);

if (!commandPalette.includes('useCommandPaletteState')) fail('CommandPalette.tsx must consume useCommandPaletteState');
if (!commandPalette.includes('useCommandPaletteKeyboardNavigation')) fail('CommandPalette.tsx must consume useCommandPaletteKeyboardNavigation');
if (commandPalette.includes('useState')) fail('CommandPalette.tsx must not own local state directly');
if (commandPalette.includes('useRef')) fail('CommandPalette.tsx must not own refs directly');
if (commandPalette.includes('useEffect')) fail('CommandPalette.tsx must not own lifecycle effects directly');
if (commandPalette.includes('setActiveIndex(')) fail('CommandPalette.tsx must not mutate active index directly');
if (commandPalette.includes('setQuery(')) fail('CommandPalette.tsx must not mutate query directly');
if (commandPalette.includes('scrollIntoView')) fail('CommandPalette.tsx must not own scroll-into-view behavior');
if (commandPalette.includes('commandPaletteInitialQuery')) fail('CommandPalette.tsx must not own initial-query storage plumbing');
if (!hook.includes('commandPaletteInitialQuery')) fail('state hook must own initial-query storage plumbing');
if (!hook.includes('previouslyFocusedRef')) fail('state hook must own focus restore lifecycle');
if (!hook.includes('scrollIntoView')) fail('keyboard hook must own active-item scroll behavior');
if (!hook.includes('ArrowDown') || !hook.includes('ArrowUp') || !hook.includes('Enter') || !hook.includes('Escape')) {
  fail('keyboard hook must own command palette keyboard navigation');
}
if (!barrel.includes("export * from './useCommandPaletteState'")) fail('command-palette barrel must export useCommandPaletteState');
if (lineCount(commandPaletteFile) > 225) fail(`CommandPalette.tsx is still too large (${lineCount(commandPaletteFile)} lines)`);

console.log('CommandPalette state hook audit passed.');
