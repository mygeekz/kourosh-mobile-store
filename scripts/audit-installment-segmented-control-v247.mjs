import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const page = read('pages/InstallmentSalesPage.tsx');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const failures = [];
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
assert(version === 'v247', `expected v247, got ${version}`);
assert(page.includes('role="tablist"'), 'segmented navigation must use tablist semantics');
assert((page.match(/role="tab"/g) || []).length >= 2, 'both segmented controls must be tabs');
assert((page.match(/data-skip-global-button="true"/g) || []).length >= 2, 'segmented controls must bypass global button enhancer');
assert(page.includes('<span className="whitespace-nowrap">لیست اقساط</span>'), 'installment list label must remain complete and nowrap');
assert(!page.includes('className="min-w-0 flex-1"\n                onClick={() => setTab(\'main\')}'), 'legacy generic Button tab must be removed');
if (failures.length) {
  console.error(JSON.stringify({ audit: 'installment-segmented-control-v247', ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ audit: 'installment-segmented-control-v247', ok: true }, null, 2));
