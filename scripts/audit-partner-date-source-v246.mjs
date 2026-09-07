import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const version = read('KOUROSH_SOURCE_VERSION').trim();
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const section = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');

assert(version === 'v246', `expected source version v246, found ${version}`);
assert(controller.includes('data-skip-global-button="true"'), 'sale source raw button must opt out of GlobalButtonEffects');
assert((controller.match(/flex w-full min-w-0 items-start/g) || []).length >= 2, 'both navigable and non-navigable compact sources must use a bounded full-width layout');
assert(section.includes('data-ui-partner-date-source="true"'), 'date/source cell must have a stable semantic marker');
assert(section.includes('flex min-w-0 flex-col items-stretch gap-1.5'), 'date/source values must be stacked with explicit spacing');
assert(section.includes('dir="ltr">\n                                    {item.soldAt ? formatIsoToShamsi(item.soldAt)'), 'sale date must be bidi-isolated');
assert(section.includes('w-40 px-2.5 py-2.5">تاریخ و منبع</th>'), 'date/source column must reserve adequate width');

if (failures.length) {
  console.error(JSON.stringify({ audit: 'partner-date-source-v246', ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ audit: 'partner-date-source-v246', ok: true }, null, 2));
