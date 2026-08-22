import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const account = read("miniapp/pages/PartnerAccount.tsx");
const home = read("miniapp/pages/PartnerHome.tsx");
const premium = read("miniapp/components/premium/MiniAppPremiumPrimitives.tsx");
const miniappCss = read("miniapp/tailwind.css");

// Account must consume the same final reference system used by Home.
assert.match(account, /import homeHero from "\.\.\/assets\/home-hero\.webp\?inline"/);
assert.match(account, /backgroundImageSrc=\{homeHero\}/);
assert.match(account, /PremiumHeroBalance/);
assert.match(account, /useMiniAppDataAvailability/);
assert.match(account, /resolveMiniAppAvailabilityPresentation/);
assert.match(account, /PremiumPill/);
assert.match(account, /compact/);
assert.match(account, /dir="ltr"/);
assert.match(account, /dir="rtl"/);
assert.match(account, /text-right/);
assert.match(account, /حساب همکار/);
assert.match(account, /خلاصه همکاری/);

// Legacy bulky account UI must be gone.
assert.doesNotMatch(account, /MiniAppDataAvailabilityStatus/);
assert.doesNotMatch(account, /PremiumProfileCard/);
assert.doesNotMatch(account, /PremiumMetricCard/);
assert.doesNotMatch(account, /style\s*=\s*\{/);
assert.doesNotMatch(account, /import\s+["'][^"']+\.(?:css|scss|less)["']/);

// The shared Hero contract must remain responsive and wallet-preserving.
assert.match(premium, /h-\[clamp\(10\.5rem,43vw,12rem\)\]/);
assert.match(premium, /object-cover object-left/);
assert.match(home, /backgroundImageSrc=\{homeHero\}/);

// Vazir must be genuinely loaded by the Mini App reference stylesheet.
assert.match(miniappCss, /@font-face/);
assert.match(miniappCss, /font-family:\s*"Vazir"/);
assert.match(miniappCss, /Vazir-FD-WOL\.woff2/);

console.log(JSON.stringify({
  status: "PASS",
  version: "v190",
  accountUsesHomeHero: true,
  compactAvailabilityHeader: true,
  partnerAvatarRemoved: true,
  consolidatedAccountSummary: true,
  responsiveHero: true,
  vazirLoaded: true,
  customPageCss: 0,
  inlineStyles: 0,
}, null, 2));
