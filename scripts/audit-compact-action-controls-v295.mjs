import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const button = read('components/Button.tsx');
const unified = read('styles/components/unified-buttons.css');
const group = read('components/ui/FilterChipGroup.tsx');
const partnerLedger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const uiIndex = read('components/ui/index.ts');
const pkg = JSON.parse(read('package.json'));

const versionNumber = Number(version.replace(/^v/i, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 295, `KOUROSH_SOURCE_VERSION must be v295 or successor; found ${version}`);
assert.match(button, /size = 'sm'/, 'canonical Button default must be compact sm');
assert.match(unified, /--ux-btn-h:\s*40px/, 'canonical base button height must be 40px');
assert.match(unified, /--ux-btn-h-sm:\s*36px/, 'canonical sm button height must be 36px');
assert.match(unified, /--ux-btn-h-xs:\s*32px/, 'canonical xs button height must be 32px');
assert.match(group, /size = 'xs'/, 'FilterChipGroup must default to xs');
assert.match(group, /<Button/, 'FilterChipGroup must compose canonical Button');
assert.doesNotMatch(group, /<button\b/, 'FilterChipGroup must not use raw native buttons');
assert.match(uiIndex, /FilterChipGroup/, 'FilterChipGroup must be exported by canonical UI index');
assert.match(partnerLedger, /<FilterChipGroup/, 'Partner ledger must use the shared compact filter-group contract');
assert.match(partnerLedger, /<FilterChipGroup/, 'Partner ledger filter groups must use shared compact FilterChipGroup');

const toolbarStart = partnerLedger.indexOf('مدیریت تراکنش‌های مالی');
const toolbarEnd = partnerLedger.indexOf('{activeLedgerBatchId && activeBatchLedgerMetrics', toolbarStart);
const toolbarSource = toolbarStart >= 0 && toolbarEnd > toolbarStart ? partnerLedger.slice(toolbarStart, toolbarEnd) : '';
assert.ok(toolbarSource, 'Partner ledger compact toolbar source must be discoverable');
assert.doesNotMatch(toolbarSource, /size="md"/, 'Partner ledger toolbar must not use md-sized controls');
assert.doesNotMatch(toolbarSource, /style=\{\{/, 'Partner ledger toolbar must not add inline layout styling');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:compact-actions-v295/, 'audit:release must enforce v295 compact action audit');

console.log('v295 compact action controls audit passed.');
