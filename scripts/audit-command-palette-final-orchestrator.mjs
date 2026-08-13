import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineCount = (file) => read(file).split(/\r?\n/).length;
const fail = (message) => {
  console.error(`CommandPalette final orchestrator audit failed: ${message}`);
  process.exit(1);
};

const commandPaletteFile = 'components/CommandPalette.tsx';
const resultsHookFile = 'components/command-palette/useCommandPaletteResults.ts';
const actionsHookFile = 'components/command-palette/useCommandPaletteActions.ts';
const barrelFile = 'components/command-palette/index.ts';

for (const file of [commandPaletteFile, resultsHookFile, actionsHookFile, barrelFile]) {
  if (!exists(file)) fail(`missing ${file}`);
}

const commandPalette = read(commandPaletteFile);
const resultsHook = read(resultsHookFile);
const actionsHook = read(actionsHookFile);
const barrel = read(barrelFile);

if (lineCount(commandPaletteFile) > 155) fail(`CommandPalette.tsx is still too large (${lineCount(commandPaletteFile)} lines)`);
if (!commandPalette.includes('useCommandPaletteResults')) fail('CommandPalette.tsx must consume useCommandPaletteResults');
if (!commandPalette.includes('useCommandPaletteActions')) fail('CommandPalette.tsx must consume useCommandPaletteActions');
if (commandPalette.includes('SIDEBAR_ITEMS')) fail('CommandPalette.tsx must not own sidebar source data');
if (commandPalette.includes('processQuery')) fail('CommandPalette.tsx must not own query processing');
if (commandPalette.includes('buildRelatedSuggestions')) fail('CommandPalette.tsx must not own suggestion derivation');
if (commandPalette.includes('recordSearch(')) fail('CommandPalette.tsx must not own search recording dispatch');
if (commandPalette.includes('canAccessNavigationPath')) fail('CommandPalette.tsx must not own navigation access checks');
if (commandPalette.includes('getDataActionPath')) fail('CommandPalette.tsx must not own data action path resolution');
if (commandPalette.includes('useMemo')) fail('CommandPalette.tsx must not own derived memoization directly');

for (const token of ['filterNavigationItems', 'flattenNav', 'processQuery', 'buildRelatedSuggestions', 'useCommandPaletteDataSearch']) {
  if (!resultsHook.includes(token)) fail(`results hook must own ${token}`);
}
for (const token of ['canAccessNavigationPath', 'recordSearch', 'getDataActionPath', 'toggleFavorite']) {
  if (!actionsHook.includes(token)) fail(`actions hook must own ${token}`);
}
if (!barrel.includes("export * from './useCommandPaletteResults'")) fail('barrel must export useCommandPaletteResults');
if (!barrel.includes("export * from './useCommandPaletteActions'")) fail('barrel must export useCommandPaletteActions');

console.log('CommandPalette final orchestrator audit passed.');
