import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const lineCount = (file) => read(file).split(/\r?\n/).length;
const fail = (message) => {
  console.error(`CommandPalette decomposition audit failed: ${message}`);
  process.exit(1);
};

const requiredFiles = [
  'components/command-palette/index.ts',
  'components/command-palette/commandPaletteTypes.ts',
  'components/command-palette/commandPaletteData.ts',
  'components/command-palette/CommandPaletteSearchHeader.tsx',
  'components/command-palette/CommandPaletteDiscoverySections.tsx',
  'components/command-palette/CommandPaletteResultsList.tsx',
  'components/command-palette/CommandPaletteRows.tsx',
  'components/command-palette/CommandPaletteFooter.tsx',
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing ${file}`);
}

const commandPalette = read('components/CommandPalette.tsx');
if (!commandPalette.includes("from './command-palette/index'")) fail('CommandPalette.tsx must consume the command-palette barrel');
if (commandPalette.includes('const Row:')) fail('legacy Row renderer must not live in CommandPalette.tsx');
if (commandPalette.includes('const DataRow:')) fail('legacy DataRow renderer must not live in CommandPalette.tsx');
if (commandPalette.includes('const Section:')) fail('legacy Section renderer must not live in CommandPalette.tsx');
if (commandPalette.includes('favorites.slice')) fail('favorites must be rendered through the filtered visibleFavorites collection');
if (lineCount('components/CommandPalette.tsx') > 340) fail(`CommandPalette.tsx is still too large (${lineCount('components/CommandPalette.tsx')} lines)`);

const rows = read('components/command-palette/CommandPaletteRows.tsx');
if (!rows.includes('CommandPaletteNavRow')) fail('missing canonical nav row');
if (!rows.includes('CommandPaletteDataRow')) fail('missing canonical data row');

const results = read('components/command-palette/CommandPaletteResultsList.tsx');
if (!results.includes('visibleFavorites.slice')) fail('results list must render filtered favorites');
if (!results.includes('CommandPaletteDataRow')) fail('results list must own data row composition');

console.log('CommandPalette decomposition audit passed.');
