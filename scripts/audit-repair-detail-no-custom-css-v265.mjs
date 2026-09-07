import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/RepairDetail.tsx');
const cssSources = [
  'styles/pages/repairs.css',
  'styles/system/products-services-repairs/repairs-ui-foundation.css',
  'styles/system/products-services-redesign/products-services-repairs-redesign-pass-1.css',
  'styles/system/products-services-redesign/products-services-repairs-redesign-pass-3.css',
  'styles/system/ui-contracts/repair-services-workflow-foundation-phase15.css',
  'styles/system/ui-contracts/global-visual-qa-cleanup-phase16.css',
].map(read).join('\n');

for (const primitive of ['PageShell','PanelCard','ModalField','DialogActions','SearchableSelectField','TextareaField','TextField']) {
  assert.match(page, new RegExp(`\\b${primitive}\\b`), `RepairDetail must use shared primitive ${primitive}`);
}
assert.doesNotMatch(page, /<(?:input|select|textarea)\b/, 'RepairDetail must not render raw form controls');
assert.doesNotMatch(page, /style\s*=\s*\{\{/, 'RepairDetail must not use inline style objects');
assert.doesNotMatch(page, /document\.createElement\(['"]style['"]\)/, 'RepairDetail must not inject runtime CSS');
assert.doesNotMatch(page, /import\s+['"][^'"]+\.css['"]/, 'RepairDetail must not import page-specific CSS');
for (const retired of [
  'repair-detail-editor-shell','repair-detail-softbox','repair-detail-redesign-v1','repair-detail-shell','repair-detail-hero',
  'repair-detail-card','repair-detail-panel','repair-workflow-foundation','detail-page-shell','detail-card--soft','detail-inline-stats',
  'data-ui-repair-surface="detail-card"','data-ui-repair-surface="financial-summary"','data-ui-repair-modal="add-part"','data-ui-repair-control="barcode"',
]) assert.equal(page.includes(retired), false, `retired RepairDetail UI contract remains in page: ${retired}`);
for (const retired of [
  'repair-detail-editor-shell','repair-detail-softbox','repair-detail-redesign-v1','repair-detail-shell','repair-detail-hero',
  'repair-detail-card','repair-detail-panel','data-ui-repair-surface="detail-card"','data-ui-repair-surface="financial-summary"',
  'data-ui-repair-modal="add-part"','data-ui-repair-control="barcode"',
]) assert.equal(cssSources.includes(retired), false, `retired RepairDetail CSS selector remains in active repair CSS: ${retired}`);
for (const endpoint of ['/api/repairs/${id}', '/api/repairs/${id}/finalize', '/api/repairs/${id}/parts', '/api/sms/trigger-event', '/api/telegram/trigger-event']) {
  assert.ok(page.includes(endpoint), `RepairDetail business endpoint must remain unchanged: ${endpoint}`);
}
console.log(JSON.stringify({status:'PASS',release:'v265',repairDetailRawFormControls:0,repairDetailInlineStyles:0,repairDetailPageSpecificCssImports:0,sharedPrimitives:true,businessEndpointsPreserved:true},null,2));
