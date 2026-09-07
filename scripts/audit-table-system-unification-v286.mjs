import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir, exts) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((ext) => ent.name.endsWith(ext))) out.push(rel.replaceAll('\\', '/'));
  }
  return out;
};

const tableSystem = read('components/ui/TableSystem.tsx');
const dataTableShell = read('components/ui/DataTableShell.tsx');
const directoryTable = read('components/ui/ManagementDirectoryTable.tsx');
const tablePagination = read('components/ui/TablePagination.tsx');
const directoryPagination = read('components/ui/ManagementDirectoryPagination.tsx');
const uiIndex = read('components/ui/index.ts');
const tableCss = read('styles/components/tables.css');
const toolbarCss = read('styles/components/toolbars.css');
const tableContractCss = read('styles/system/ui-contracts/table-card-contract-phase6.css');
const styleManifest = JSON.parse(read('styles/manifest/style-manifest.json'));
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'export const TableViewport',
  'data-ui-table-viewport="true"',
  'data-ui-table-responsive="scroll"',
  'export const Table',
  "data-ui-table={mode === 'print' ? 'print' : 'true'}",
  'data-ui-table-density={density}',
  'data-ui-table-layout={layout}',
]) {
  if (!tableSystem.includes(token)) failures.push(`Canonical TableSystem contract missing: ${token}`);
}

for (const [label, source] of [['DataTableShell', dataTableShell], ['ManagementDirectoryTable', directoryTable]]) {
  if (!source.includes('<TableViewport')) failures.push(`${label} must delegate overflow ownership to TableViewport.`);
  if (!source.includes('<Table')) failures.push(`${label} must delegate semantic table ownership to Table.`);
}
if (!dataTableShell.includes('layout="managed"')) failures.push('DataTableShell must mark its canonical table as managed.');
if (!directoryTable.includes('layout="managed"') || !directoryTable.includes('density="compact"')) failures.push('ManagementDirectoryTable must remain managed + compact.');
if (!dataTableShell.includes('pagination?: TablePaginationProps')) failures.push('DataTableShell must expose canonical TablePagination composition.');

for (const token of [
  'data-ui-table-pagination="true"',
  'data-ui-management-directory-pagination="shared"',
  'aria-pressed={item === page}',
]) {
  if (!tablePagination.includes(token)) failures.push(`TablePagination contract missing: ${token}`);
}
if (!directoryPagination.includes("from './TablePagination'")) failures.push('ManagementDirectoryPagination must be a compatibility alias over TablePagination.');
for (const token of ['export { Table, TableViewport }', 'export { default as TablePagination }']) {
  if (!uiIndex.includes(token)) failures.push(`UI barrel missing canonical table export: ${token}`);
}

for (const [rel, source] of [['styles/components/tables.css', tableCss], ['styles/components/toolbars.css', toolbarCss]]) {
  if (/table:not\(\.unstyled-table\)/.test(source)) failures.push(`${rel} still owns arbitrary raw tables.`);
}
if (!tableCss.includes('[data-ui-table="true"]')) failures.push('styles/components/tables.css must scope visual rules to canonical runtime tables.');
for (const token of [
  "[data-ui-table-viewport='true']",
  "[data-ui-table='true']",
  "[data-ui-table='true']:not([data-ui-table-layout='managed'])",
  "[data-ui-table='true'][data-ui-table-layout='managed']",
]) {
  if (!tableContractCss.includes(token)) failures.push(`Canonical table responsive CSS missing: ${token}`);
}

const retiredLegacy = styleManifest.localStyles.find((entry) => entry.path === 'styles/legacy/08c-legacy-global-table-row-actions.css');
if (!retiredLegacy || retiredLegacy.runtimeActive !== false || retiredLegacy.delivery !== 'dormant' || retiredLegacy.status !== 'dormant') {
  failures.push('Legacy global table-row CSS 08c must remain dormant and outside runtime delivery.');
}

// Fail closed on native tables without parsing JSX or template strings: every
// print-only native table must explicitly declare data-ui-table="print". The
// only non-print native renderer allowed is the canonical Table primitive.
const liveFiles = [
  ...walk('components', ['.tsx']),
  ...walk('pages', ['.tsx']),
  ...walk('app', ['.tsx']),
];
let canonicalTableUsages = 0;
let nativeTableTags = 0;
let nativeRuntimeTables = 0;
let printTables = 0;
let managedTableUsages = 0;
const rawTableTagRe = /<table\b[\s\S]*?>/g;

for (const rel of liveFiles) {
  const source = read(rel);
  canonicalTableUsages += (source.match(/<Table\b/g) || []).length;
  managedTableUsages += (source.match(/<Table\b[\s\S]{0,900}?\blayout=["']managed["']/g) || []).length;

  for (const match of source.matchAll(rawTableTagRe)) {
    nativeTableTags += 1;
    const tag = match[0];
    const line = source.slice(0, match.index).split('\n').length;
    if (tag.includes('data-ui-table="print"')) {
      printTables += 1;
      continue;
    }
    if (rel === 'components/ui/TableSystem.tsx' && tag.includes("data-ui-table={mode === 'print' ? 'print' : 'true'}")) {
      nativeRuntimeTables += 1;
      continue;
    }
    failures.push(`${rel}:${line} contains an unowned native <table>; migrate runtime UI to <Table> or explicitly mark print-only HTML with data-ui-table="print".`);
  }
}

if (nativeRuntimeTables !== 1) failures.push(`Exactly one native runtime table renderer must exist in TableSystem; found ${nativeRuntimeTables}.`);
if (canonicalTableUsages < 95) failures.push(`Expected broad canonical <Table> migration; only ${canonicalTableUsages} usages found.`);
if (printTables < 10) failures.push(`Expected every remaining print table to be explicitly isolated; found ${printTables}.`);
if (nativeTableTags !== printTables + nativeRuntimeTables) failures.push('Native table accounting is inconsistent; an unowned raw table may exist.');

if (!String(packageJson.scripts?.['audit:table-system-v286'] || '').includes('audit-table-system-unification-v286.mjs')) {
  failures.push('package.json is missing audit:table-system-v286.');
}
if (!String(packageJson.scripts?.['audit:release'] || '').includes('audit:table-system-v286')) {
  failures.push('audit:release must run audit:table-system-v286.');
}

notes.push(`canonicalTableUsages=${canonicalTableUsages}`);
notes.push(`nativeRuntimeTables=${nativeRuntimeTables}`);
notes.push(`printTables=${printTables}`);
notes.push(`managedTableUsages=${managedTableUsages}`);
notes.push(`legacy08c=${retiredLegacy?.status || 'missing'}`);

if (failures.length) {
  console.error('Table System unification v286 audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Table System unification v286 audit passed (${notes.join(', ')}).`);
