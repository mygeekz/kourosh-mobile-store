import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const partners = read('pages/Partners.tsx');
const installments = read('pages/InstallmentSalesPage.tsx');
const actionGroup = read('components/ui/TableActionGroup.tsx');
const barrel = read('components/ui/index.ts');

assert.equal(version, 'v228', 'v228 source version marker must be current.');

// Regression: v227 rendered an identifier removed during the server-side directory refactor.
assert.ok(partners.includes('partners={partners}'), 'Partners directory must render the fetched partners state directly.');
assert.ok(!partners.includes('filteredPartners'), 'Partners directory must not reference the removed filteredPartners identifier.');

// Installments have four desktop row actions. Compact density keeps them away from the sticky edge
// without changing Customers/Partners default density or introducing page CSS.
for (const token of [
  "export type TableActionDensity = 'default' | 'compact'",
  "density?: TableActionDensity",
  "compact: 'h-7 w-7 min-h-7 min-w-7'",
  "compact: 'gap-0.5 px-1'",
  "density = 'default'",
  'inlineControlDensityClassMap[density]',
  'inlineGroupDensityClassMap[density]',
]) assert.ok(actionGroup.includes(token), `v228 TableActionGroup compact-density contract missing: ${token}`);

assert.ok(installments.includes('density="compact"'), 'Installment row actions must use compact TableActionGroup density.');
assert.ok(installments.includes('className="w-full justify-center"'), 'Installment row actions must remain centered inside the sticky operations column.');
assert.ok(barrel.includes('TableActionDensity'), 'UI barrel must export TableActionDensity.');

// No page-specific CSS patch is allowed for these fixes.
const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});
const cssSource = collectCss('styles').map(read).join('\n');
for (const selector of [
  '[data-ui-installments-directory]',
  '[data-ui-partners-directory]',
]) assert.ok(!cssSource.includes(selector), `v228 must not add directory page-specific CSS override ${selector}`);

console.log('Directory runtime v228 audit passed: Partners no longer references filteredPartners, and Installment Sales uses compact canonical row actions without page-specific CSS.');
