import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const ledger = read("miniapp/pages/PartnerLedger.tsx");
const purchases = read("miniapp/pages/PartnerPurchases.tsx");
const phones = read("miniapp/pages/PartnerPhones.tsx");
const more = read("miniapp/pages/PartnerMore.tsx");
const header = read("miniapp/components/premium/PartnerCompactHeader.tsx");

for (const [name, source] of [["ledger", ledger], ["purchases", purchases], ["phones", phones], ["more", more]]) {
  assert.match(source, /PartnerCompactHeader/, `${name} must use the shared compact partner header`);
  assert.doesNotMatch(source, /MiniAppDataAvailabilityStatus/, `${name} must not render the legacy large availability block`);
  assert.doesNotMatch(source, /PremiumProfileCard|PremiumStoreStatusCard/, `${name} must not use legacy profile/store-status cards`);
}

assert.match(header, /compact/, "shared header must use compact status pills");
assert.match(header, /dir="rtl"/, "shared header title block must be RTL");
assert.match(header, /dir="ltr"/, "shared header must explicitly place badges opposite the RTL title block");

assert.match(ledger, /home-hero\.webp\?inline/, "ledger must reuse the bundled responsive hero asset");
assert.match(ledger, /PremiumHeroBalance/, "ledger must use the shared premium hero");
assert.doesNotMatch(ledger, /PremiumMetricCard/, "ledger must not duplicate hero summary with metric cards");

assert.match(purchases, /PremiumSectionHeading title="نمای کلی کالاها"/, "purchases must expose the compact inventory overview surface");
assert.match(purchases, /space-y-3/, "purchases list must use full-width compact cards");
assert.doesNotMatch(purchases, /PremiumMetricCard/, "purchases must not duplicate its overview with metric cards");

assert.match(phones, /home-hero\.webp\?inline/, "phones must reuse the bundled responsive hero asset");
assert.match(phones, /title="مانده تسویه"/, "phones hero must surface remaining settlement");
assert.doesNotMatch(phones, /PremiumMetricCard/, "phones must not duplicate hero summary with metric cards");

assert.match(more, /حساب و مالی/, "more must group financial navigation");
assert.match(more, /کالا و تسویه/, "more must group operations navigation");
assert.doesNotMatch(more, /مانده همکاری" subtitle/, "more must not duplicate the account route as a separate balance menu item");
assert.doesNotMatch(more, /پشتیبانی|تنظیمات|اعلان/, "more must not invent unsupported menu destinations");

for (const source of [ledger, purchases, phones, more, header]) {
  assert.doesNotMatch(source, /style=\{\{/, "partner v191 UI must not use inline style objects");
}

console.log(JSON.stringify({
  status: "PASS",
  version: "v191",
  standardizedSections: ["ledger", "purchases", "phones", "more"],
  sharedCompactHeader: true,
  duplicatedSummaryCardsRemoved: true,
  inventedMoreDestinations: false,
  pageSpecificCustomCss: 0,
}, null, 2));
