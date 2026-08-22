import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homePath = path.join(root, 'miniapp', 'pages', 'PartnerHome.tsx');
const primitivesPath = path.join(root, 'miniapp', 'components', 'premium', 'MiniAppPremiumPrimitives.tsx');
const assetPath = path.join(root, 'miniapp', 'assets', 'home-hero-exact-v184.png');
const home = fs.readFileSync(homePath, 'utf8');
const primitives = fs.readFileSync(primitivesPath, 'utf8');

assert.ok(fs.statSync(assetPath).size > 0, 'bundled home hero asset must exist and be non-empty');
assert.match(home, /new URL\("\.\.\/assets\/home-hero-exact-v184\.png", import\.meta\.url\)\.href/, 'hero asset must be bundled by Vite instead of relying on an absolute public URL');
assert.doesNotMatch(home, /src="\/miniapp\/premium\/home-hero-exact-v183\.png"/, 'legacy absolute public hero path must not remain');
assert.match(home, /compact[\s\S]*availabilityView\.badge/, 'availability badge must use compact reference pill');
assert.match(home, /compact[\s\S]*availabilityView \? availabilityView\.title/, 'store badge must use compact reference pill');
assert.match(primitives, /compact \? "min-h-7 gap-1 px-2 text-\[9px\]"/, 'compact pill reference must remain small');
assert.match(primitives, /Icon size=\{compact \? 11 : 14\}/, 'compact pill icon must be smaller');
assert.match(home, /dir="rtl" className="min-w-0 flex-1 text-right"/, 'partner header copy must be explicitly RTL and right aligned');
assert.match(home, /text-\[1\.05rem\]/, 'partner greeting must use reduced typography');
assert.doesNotMatch(home, /خلاصه همکاری شما با کوروش/, 'obsolete subtitle must stay removed');

console.log(JSON.stringify({
  status: 'PASS',
  version: 'v184',
  bundledHeroAsset: true,
  compactBadges: true,
  compactBadgeIconPx: 11,
  rtlHeader: true,
  reducedHeaderTypography: true,
  legacyPublicHeroPath: false,
}, null, 2));
