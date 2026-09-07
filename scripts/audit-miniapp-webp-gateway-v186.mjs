import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const policy = read("server/miniapp/miniAppGatewayPolicy.mjs");
const gateway = read("scripts/serve-miniapp-gateway.mjs");
const isolation = read("scripts/test-miniapp-build-isolation.mjs");
const home = read("miniapp/pages/PartnerHome.tsx");

assert.match(policy, /\(\?:js\|css\|webp\)/, "Gateway allowlist must permit reviewed WebP assets");
assert.match(gateway, /\["\.webp", "image\/webp"\]/, "Gateway must emit image\/webp MIME");
assert.match(gateway, /\(\?:js\|css\|webp\)/, "hashed WebP assets must receive immutable cache policy");
assert.match(isolation, /\.webp/, "isolated Mini App build must allow the bundled WebP");
assert.match(home, /(?:new URL\("\.\.\/assets\/home-hero\.webp", import\.meta\.url\)\.href|import\s+homeHero\s+from\s+["']\.\.\/assets\/home-hero\.webp\?inline["'])/, "Hero asset must be bundled by Vite from miniapp/assets");
assert.match(home, /<PremiumHeroBalance/, "dynamic account overlay must be rendered over the Hero image");
assert.match(home, /status=\{data\.account\.label\}/, "dynamic debtor\/creditor status must be restored");
assert.match(home, /amountOnly\(data\.account\.amount\)/, "dynamic amount must be restored");
console.log("Mini App v186 WebP Gateway source audit passed.");
