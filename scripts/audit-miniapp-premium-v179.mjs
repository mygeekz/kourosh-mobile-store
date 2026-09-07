import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname } from "node:path";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const premiumRef = read("miniapp/reference/miniAppPremiumDesignSystem.ts");
const premiumPrimitives = read("miniapp/components/premium/MiniAppPremiumPrimitives.tsx");
const shell = read("miniapp/components/MiniAppShell.tsx");
const availability = read("miniapp/components/MiniAppDataAvailabilityStatus.tsx");
const telegram = read("miniapp/telegram.ts");
const telegramTypes = read("miniapp/telegram-webapp.d.ts");
const vite = read("vite.miniapp.config.ts");
const tailwind = read("tailwind.miniapp.config.cjs");
const partnerPages = [
  "miniapp/pages/PartnerHome.tsx",
  "miniapp/pages/PartnerLedger.tsx",
  "miniapp/pages/PartnerPurchases.tsx",
  "miniapp/pages/PartnerPhones.tsx",
  "miniapp/pages/PartnerAccount.tsx",
  "miniapp/pages/PartnerMore.tsx",
].map((path) => [path, read(path)]);

assert.match(premiumRef, /MINIAPP_PREMIUM/);
assert.match(premiumRef, /shadow-premium-hero/);
assert.match(premiumPrimitives, /PremiumHeroBalance/);
assert.match(premiumPrimitives, /PremiumQuickAction/);
assert.match(premiumPrimitives, /PremiumMetricCard/);
assert.match(premiumPrimitives, /PremiumStoreAvatar/);
assert.match(premiumPrimitives, /wallet-hero\.webp/);
assert.match(premiumPrimitives, /store-avatar\.webp/);
assert.match(shell, /partnerMode \? MINIAPP_PREMIUM\.shell/);
assert.match(shell, /MINIAPP_PREMIUM\.dock/);
assert.match(availability, /identity\?\.kind === "partner"/);
assert.match(availability, /اطلاعات زنده/);
assert.match(telegram, /requestFullscreen/);
assert.match(telegramTypes, /requestFullscreen\?: \(\) => void/);
assert.match(vite, /miniapp\/premium\/store-avatar\.webp/);
assert.match(vite, /miniapp\/premium\/wallet-hero\.webp/);
assert.match(tailwind, /premium-page-pattern/);
assert.match(tailwind, /premium-hero/);
assert.match(tailwind, /premium-card/);

for (const asset of [
  "public/miniapp/premium/store-avatar.webp",
  "public/miniapp/premium/wallet-hero.webp",
]) {
  assert.equal(existsSync(new URL(`../${asset}`, import.meta.url)), true, `${asset} missing`);
}

for (const [path, source] of partnerPages) {
  assert.match(source, /MINIAPP_PREMIUM|Premium(?:HeroBalance|MetricCard|InfoRow|QuickAction|FilterChip|SearchField|ProfileCard)/, `${path} not on premium system`);
  assert.doesNotMatch(source, /MINIAPP_VISUAL_REFERENCE/, `${path} still uses legacy visual reference`);
  assert.doesNotMatch(source, /style\s*=\s*\{/, `${path} contains inline style`);
  assert.doesNotMatch(source, /import\s+["'][^"']+\.(?:css|scss|less)["']/, `${path} imports custom stylesheet`);
}

for (const source of [premiumRef, premiumPrimitives, shell, availability]) {
  assert.doesNotMatch(source, /style\s*=\s*\{/);
}

const miniappStyleFiles = readdirSync(new URL("../miniapp/", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isFile() && [".css", ".scss", ".less"].includes(extname(entry.name)))
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(miniappStyleFiles, ["tailwind.css"]);

console.log(JSON.stringify({
  status: "PASS",
  version: "v179",
  partnerScreens: partnerPages.length,
  referenceDriven: true,
  premiumAssets: 2,
  fullscreenProgressiveEnhancement: true,
  pageSpecificCustomCss: 0,
  inlineStyles: 0,
}, null, 2));
