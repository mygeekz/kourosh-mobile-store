import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');

const collectCss = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectCss(target);
  return entry.isFile() && entry.name.endsWith('.css') ? [target] : [];
});

const cssSource = collectCss('styles').map(read).join('\n');

for (const token of [
  "border-s-4 border-s-rose-500",
  "border-s-4 border-s-amber-400",
  "border-s-4 border-s-sky-500",
  "border-s-4 border-s-emerald-500",
  "border-s-4 border-s-slate-400",
  'className={`px-3 py-2.5 align-top ${rowRail}`}',
  'className="unstyled-table w-full min-w-[62rem] table-fixed border-collapse text-xs"',
]) {
  assert.ok(page.includes(token), `v222 page must include ${token}`);
}

assert.ok(!page.includes('table-row-state--'), 'Installment rows must not depend on the legacy CSS row-state rail.');

for (const selector of [
  '.installment-sales-page',
  '.installment-sales-responsive',
  '[data-ui-installment',
  '#installments-print-area',
  '@container installment-sales-list',
]) {
  assert.ok(!cssSource.includes(selector), `v222 styles must not contain page-specific selector ${selector}`);
}

console.log('Installment directory v222 successor audit passed: every semantic RTL row owns a logical-start status rail using standard utilities and no installment-specific CSS.');
