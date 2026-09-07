import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homePath = path.join(root, "miniapp/pages/PartnerHome.tsx");
const designPath = path.join(root, "miniapp/reference/miniAppPremiumDesignSystem.ts");
const assetPath = path.join(root, "miniapp/assets/home-hero.webp");

const home = fs.readFileSync(homePath, "utf8");
const design = fs.readFileSync(designPath, "utf8");
const stat = fs.statSync(assetPath);

assert.match(home, /import\s+homeHero\s+from\s+["']\.\.\/assets\/home-hero\.webp\?inline["'];/, "Hero must be explicitly inlined by Vite.");
assert.doesNotMatch(home, /new\s+URL\([^\n]*home-hero\.webp/, "Hero must not use a separate asset URL request.");
assert.match(home, /backgroundImageSrc=\{homeHero\}/, "Hero must receive the inlined asset.");
assert.ok(stat.size > 0 && stat.size < 100_000, `Hero WebP must be non-empty and below 100KB; got ${stat.size}.`);
assert.match(design, /blue:\s*\{[\s\S]*?icon:\s*["'][^"']*bg-premium-icon-blue[^"']*text-white[^"']*["']/, "Solid blue icon tile must render its icon in white.");

console.log(JSON.stringify({
  heroInline: true,
  heroBytes: stat.size,
  separateHeroRequest: false,
  blueIconContrast: "white_on_blue",
}, null, 2));
