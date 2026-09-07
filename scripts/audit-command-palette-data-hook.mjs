import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineCount = (file) => read(file).split(/\r?\n/).length;
const fail = (message) => {
  console.error(`CommandPalette data hook audit failed: ${message}`);
  process.exit(1);
};

const hookFile = 'components/command-palette/useCommandPaletteDataSearch.ts';
if (!exists(hookFile)) fail(`missing ${hookFile}`);

const commandPalette = read('components/CommandPalette.tsx');
const resultsHook = exists('components/command-palette/useCommandPaletteResults.ts')
  ? read('components/command-palette/useCommandPaletteResults.ts')
  : '';
const hook = read(hookFile);
const barrel = read('components/command-palette/index.ts');

if (!commandPalette.includes('useCommandPaletteDataSearch') && !resultsHook.includes('useCommandPaletteDataSearch')) {
  fail('CommandPalette module must consume useCommandPaletteDataSearch directly or through useCommandPaletteResults');
}
if (commandPalette.includes('/api/search')) fail('CommandPalette.tsx must not own /api/search fetch logic');
if (commandPalette.includes('AbortController')) fail('CommandPalette.tsx must not own abort-controller data search logic');
if (commandPalette.includes('setDataResults') || commandPalette.includes('setDataLoading') || commandPalette.includes('setDataErr')) {
  fail('CommandPalette.tsx must not own data-search state setters');
}
if (!hook.includes('/api/search')) fail('data search hook must own /api/search fetch logic');
if (!hook.includes('AbortController')) fail('data search hook must own abort-controller lifecycle');
if (!hook.includes('setTimeout')) fail('data search hook must keep debounce behavior explicit');
if (!hook.includes('dataResults') || !hook.includes('dataLoading') || !hook.includes('dataErr')) {
  fail('data search hook must return the canonical data search state');
}
if (!barrel.includes("export * from './useCommandPaletteDataSearch'")) fail('command-palette barrel must export useCommandPaletteDataSearch');
if (lineCount('components/CommandPalette.tsx') > 285) fail(`CommandPalette.tsx is still too large (${lineCount('components/CommandPalette.tsx')} lines)`);

console.log('CommandPalette data hook audit passed.');
