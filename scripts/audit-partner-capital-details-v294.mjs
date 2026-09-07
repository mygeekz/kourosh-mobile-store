import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const section = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const pkg = JSON.parse(read('package.json'));

assert.ok(Number.isInteger(versionNumber) && versionNumber >= 294, `KOUROSH_SOURCE_VERSION must be v294 or successor; found ${version}`);
assert.match(controller, /data-ui-phone-settlement-details="true"/, 'phone settlement detail must publish dedicated RTL owner');
assert.match(controller, /data-ui-phone-price-history="true"/, 'phone price history must publish dedicated owner');
assert.match(controller, /dir="rtl" className="text-right" data-ui-phone-settlement-details/, 'phone settlement detail must be explicitly RTL/right aligned');
assert.match(controller, /تغییرات قیمت همین گوشی/, 'price-history redesigned heading missing');
assert.match(controller, /bodyClassName="!p-3 sm:!p-3\.5"/, 'phone settlement timeline must use compact body density');
assert.match(section, /renderPhoneSettlementTimeline\(row, true\)/, 'responsive capital card must request compact settlement details');
assert.match(section, /renderPhoneSettlementTimeline\(item, true\)/, 'desktop capital row must request compact settlement details');
assert.doesNotMatch(controller, /PRICE TRAIL/, 'legacy English PRICE TRAIL label must be removed');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:partner-capital-details-v294/, 'audit:release must enforce v294 partner capital details audit');
console.log('v294 partner capital settlement-details audit passed.');
