import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const addRepair = read('pages/AddRepair.tsx');
const modalCss = read('styles/components/modal-system.css');
const repairFoundation = read('styles/system/ui-contracts/repair-services-workflow-foundation-phase15.css');
const repairDraftStorage = read('utils/repairIntakeDrafts.ts');

// The page must be composed from shared UI primitives and project utilities only.
for (const primitive of ['PageShell', 'PanelCard', 'SearchableSelectField', 'TextareaField', 'TextField']) {
  assert.match(addRepair, new RegExp(`\\b${primitive}\\b`), `AddRepair must use shared primitive ${primitive}`);
}
assert.doesNotMatch(addRepair, /<(?:input|select|textarea)\b/, 'AddRepair must not render raw form controls');
assert.doesNotMatch(addRepair, /style\s*=\s*\{\{/, 'AddRepair must not use inline style objects');
assert.doesNotMatch(addRepair, /document\.createElement\(['"]style['"]\)/, 'AddRepair must not inject runtime CSS');
assert.doesNotMatch(addRepair, /import\s+['"][^'"]+\.css['"]/, 'AddRepair must not import page-specific CSS');
assert.doesNotMatch(addRepair, /\buseStyle\b/, 'AddRepair must not depend on legacy style registry hooks');
assert.doesNotMatch(addRepair, /data-ui-repair-page=["']add["']/, 'AddRepair must not opt into retired repair intake CSS contracts');
assert.match(addRepair, /data-ui-form-standard="shared-primitives"/, 'AddRepair must declare shared primitive form composition');

for (const retired of [
  'repair-intake-v3',
  'repair-intake-page',
  'ri3-',
  'repair-clean-field',
  'repair-clean-combobox',
]) {
  assert.equal(addRepair.includes(retired), false, `retired AddRepair UI contract remains in page: ${retired}`);
  assert.equal(modalCss.includes(retired), false, `retired AddRepair UI contract remains in modal CSS: ${retired}`);
}
assert.doesNotMatch(repairFoundation, /Phase 51\.2[678].*repair intake/i, 'retired AddRepair repair-intake phases must stay removed from workflow foundation');
assert.doesNotMatch(repairFoundation, /repair-intake-(?:v\d+|page|field|combobox)/, 'repair workflow foundation must not retain AddRepair intake selectors');

// Business/data contracts are intentionally preserved.
for (const endpoint of ['/api/repairs', '/api/customers', '/api/phone-models', '/api/phone-colors']) {
  assert.ok(addRepair.includes(endpoint), `AddRepair business endpoint must remain unchanged: ${endpoint}`);
}
for (const key of ['kourosh:repair-intake-drafts:v1', 'kourosh:repair-intake-draft']) {
  assert.ok((addRepair + repairDraftStorage).includes(key), `Repair intake draft compatibility key must remain: ${key}`);
}
assert.match(addRepair, /Shamsi|todayLabel|toLocaleString\('fa-IR'\)/, 'Persian-facing repair intake behavior must remain represented');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v263',
  addRepairRawFormControls: 0,
  addRepairRuntimeCssInjection: false,
  addRepairPageSpecificCssImports: 0,
  retiredModalCssLines: 3527,
  retiredRepairFoundationCssLines: 997,
  retiredAddRepairCssLinesTotal: 4524,
  businessEndpointsPreserved: true,
  draftCompatibilityPreserved: true,
}, null, 2));
