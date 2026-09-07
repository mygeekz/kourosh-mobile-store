import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('pages/Repairs.tsx', 'utf8');
for (const retiredCss of ['styles/pages/repairs.css','styles/system/products-services-repairs/repairs-ui-foundation.css','styles/system/products-services-redesign/products-services-repairs-redesign-pass-1.css','styles/system/products-services-redesign/products-services-repairs-redesign-pass-2.css','styles/system/products-services-redesign/products-services-repairs-redesign-pass-3.css']) assert.equal(fs.existsSync(retiredCss), false, `retired custom CSS must stay removed: ${retiredCss}`);
for (const token of ['repairs-apple-', 'repairs-hero-services-btn', 'repairs-link-btn', 'repairs-premium-table', 'repair-status-pill']) {
  assert.equal(source.includes(token), false, `Repairs.tsx must not depend on legacy/custom token: ${token}`);
}
for (const hook of ['data-ui-repair-page=', 'data-ui-repair-surface=', 'data-ui-repair-metrics=', 'data-ui-repair-card=', 'data-ui-repair-table-shell=']) {
  assert.equal(source.includes(hook), false, `Repairs.tsx must not opt into legacy repair CSS hook: ${hook}`);
}
assert.match(source, /<PageShell[\s\S]*title="مرکز تعمیرات"/, 'Repairs must use shared PageShell');
assert.match(source, /<PanelCard[\s\S]*onDragOver=/, 'Kanban columns must use shared PanelCard');
assert.match(source, /<ManagementDirectoryTable/, 'list view must keep management directory table standard');
assert.match(source, /<ManagementDirectoryToolbar/, 'toolbar must keep management directory standard');
assert.equal(/<SelectField[^>]*unstyled/.test(source), false, 'Kanban status select must use canonical SelectField styling');
console.log('v266 Repairs workspace no-custom-CSS audit passed.');
