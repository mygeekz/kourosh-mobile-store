import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("miniapp/pages/PartnerHome.tsx");
const primitives = read("miniapp/components/premium/MiniAppPremiumPrimitives.tsx");
const ref = read("miniapp/reference/miniAppPremiumDesignSystem.ts");
const shell = read("miniapp/components/MiniAppShell.tsx");

assert.doesNotMatch(home, /PremiumStoreAvatar/, "partner avatar must be removed from Home");
assert.doesNotMatch(home, /PremiumMetricCard/, "redundant Home metric cards must be removed");
assert.match(home, /compact \/>/, "all Home quick actions must use compact mode");
assert.match(home, /partner\/phones\?page=1&pageSize=3/, "recent Home activity must use phone models");
assert.match(home, /item\.name/, "recent Home activity must present the phone model/name");
assert.match(primitives, /wallet-hero\.webp/, "balance hero must include wallet artwork");
assert.doesNotMatch(primitives, /mix-blend-screen|mask-image/, "wallet artwork must not depend on fragile mask/blend effects");
assert.match(primitives, /bg-premium-green\/90/, "creditor status must have strong green treatment");
assert.match(primitives, /bg-premium-red\/90/, "debtor status must have strong red treatment");
assert.match(ref, /bottom-0/, "partner bottom dock must be anchored to the viewport bottom");
assert.match(ref, /h-14/, "partner header must use compact height");
assert.match(shell, /partnerMode \? 20 : 20/, "partner dock icons must use compact sizing");
for (const source of [home, primitives, ref, shell]) {
  assert.doesNotMatch(source, /style\s*=\s*\{/, "inline styles are not allowed");
}

console.log(JSON.stringify({
  status: "PASS",
  version: "v180",
  dockAnchoredBottom: true,
  quickActionsCompact: true,
  redundantMetricsRemoved: true,
  recentActivitiesPhoneFirst: true,
  partnerAvatarRemovedFromHome: true,
  headerCompact: true,
  walletHeroPolished: true,
  semanticBalanceColors: true,
  customCss: 0,
}, null, 2));
