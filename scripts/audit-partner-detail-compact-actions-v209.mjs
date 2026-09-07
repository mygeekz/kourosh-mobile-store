import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const absent = (source, pattern, message) => assert.doesNotMatch(source, pattern, message);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const capital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const ledger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');

assert.equal(version, 'v209');

assert.match(capital, /<th scope="col" className="w-36 px-2\.5 py-2\.5 text-end">اقدام<\/th>/);
assert.match(capital, /togglePhoneSettlementTimeline\(item\)[\s\S]{0,180}size="xs" className="whitespace-nowrap"/);
assert.match(capital, /'جزئیات تسویه'/);

assert.match(capital, /flex flex-col gap-2 border-t/);
assert.match(capital, /<span className="w-20 shrink-0">[\s\S]{0,160}<SelectField controlOnly size="sm"/);
assert.equal((capital.match(/variant="secondary" size="xs"/g) || []).length >= 3, true);
absent(capital, /phoneSettlementPage[\s\S]{0,500}size="md"/, 'phone-capital pagination buttons must remain compact');

assert.match(ledger, /flex flex-wrap items-center justify-start gap-2/);
absent(ledger, /flex flex-wrap items-center gap-2 justify-end[\s\S]{0,2200}همه تسویه‌های گروهی/, 'ledger filter controls must start from the RTL inline-start edge');

for (const source of [capital, ledger]) {
  absent(source, /style=\{\{/, 'the v209 correction must not add inline layout CSS');
  absent(source, /className="[^"]*(?:fix-mobile|temp-responsive)/, 'the v209 correction must not add patch CSS hooks');
}

console.log('PASS Kourosh v209 compact actions and RTL toolbar audit');
