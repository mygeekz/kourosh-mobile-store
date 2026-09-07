import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const customer = read('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx');
const partner = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');

const extractActions = (source, name) => {
  const sharedStart = source.indexOf('actions={<>');
  if (sharedStart >= 0) {
    const sharedEnd = source.indexOf('</>}', sharedStart);
    assert.ok(sharedEnd > sharedStart, `${name}: shared hero actions closing marker missing`);
    return source.slice(sharedStart, sharedEnd);
  }

  // Backward-compatible marker for v279-era direct action containers.
  const legacyMarker = `data-ui-people-header-actions="${name}"`;
  const legacyStart = source.indexOf(legacyMarker);
  assert.ok(legacyStart >= 0, `${name}: action block marker missing`);
  const legacyEnd = source.indexOf('</div>', legacyStart);
  assert.ok(legacyEnd > legacyStart, `${name}: legacy action block closing marker missing`);
  return source.slice(legacyStart, legacyEnd);
};

for (const [name, source] of [['customer', customer], ['partner', partner]]) {
  const block = extractActions(source, name);
  assert.doesNotMatch(block, /variant="(?:success|warning|danger)"/, `${name}: operational header actions must not use semantic status colors`);
  assert.equal((block.match(/variant="primary"/g) || []).length, 1, `${name}: exactly one primary action is required`);
  assert.ok((block.match(/variant="secondary"/g) || []).length >= 3, `${name}: supporting actions must use secondary styling`);
  assert.match(block, /variant="primary"[\s\S]*?ارسال پیام/, `${name}: Send Message must be the single primary action`);
  assert.match(block, /variant="secondary"[\s\S]*?ارسال گزارش/, `${name}: Send Report must be secondary`);
  assert.match(block, /variant="secondary"[\s\S]*?ویرایش پروفایل/, `${name}: Edit Profile must be secondary`);
  assert.match(block, /variant="secondary"[\s\S]*?اتصال تلگرام/, `${name}: Telegram Link must be secondary`);
}

assert.match(customer, /FinancialStatusBadge/);
assert.match(partner, /FinancialStatusBadge/);
console.log('v279 people-detail theme action color audit passed');
