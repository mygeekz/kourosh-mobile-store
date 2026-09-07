import fs from 'node:fs';

const source = fs.readFileSync(new URL('../pages/Services.tsx', import.meta.url), 'utf8');
const required = [
  'ManagementDirectoryOverview',
  'ManagementDirectoryToolbar',
  'ManagementDirectoryPagination',
  'TableActionGroup',
  'data-ui-table="true"',
  'data-ui-bidi-scope="rtl-table"',
  'hideCloseButton',
  'size="full"',
  'pageSizeOptions={[10, 20, 30, 50]}',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Services v234 missing: ${token}`);
}
const forbidden = [
  'services-data-table',
  'services-table-scroll',
  'service-editor-v57__',
  'services-filter-chip',
  'service-icon-action',
  'service-table-action',
];
for (const token of forbidden) {
  if (source.includes(token)) throw new Error(`Services v234 still uses legacy page CSS hook: ${token}`);
}
console.log('audit-services-unified-v234: PASS');
