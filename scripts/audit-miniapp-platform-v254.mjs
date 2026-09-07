import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const html = read("miniapp.html");
const telegram = read("miniapp/telegram.ts");
const telegramTypes = read("miniapp/telegram-webapp.d.ts");
const index = read("miniapp/index.tsx");
const css = read("miniapp/tailwind.css");
const shell = read("miniapp/components/MiniAppShell.tsx");
const premium = read("miniapp/reference/miniAppPremiumDesignSystem.ts");
const visual = read("miniapp/reference/miniAppVisualSystem.ts");
const bidi = read("miniapp/components/MiniAppBidiText.tsx");
const partnerHeader = read("miniapp/components/premium/PartnerCompactHeader.tsx");

assert.match(html, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
assert.doesNotMatch(html, /maximum-scale|user-scalable\s*=\s*no/i);

const initializeBlock = telegram.slice(telegram.indexOf("export const initializeTelegramWebApp"));
assert.match(initializeBlock, /webApp\.expand\(\)/);
assert.match(initializeBlock, /webApp\.ready\(\)/);
assert.doesNotMatch(initializeBlock, /webApp\.requestFullscreen\(/);
assert.match(telegram, /requestTelegramFullscreenFromUserGesture/);
assert.match(telegram, /viewportStableHeight/);
assert.match(telegramTypes, /viewportHeight\?: number/);
assert.match(telegramTypes, /viewportStableHeight\?: number/);
assert.match(index, /onEvent\("viewportChanged"/);
assert.match(index, /offEvent\("viewportChanged"/);

for (const token of [
  "--miniapp-safe-area-top",
  "--miniapp-safe-area-bottom",
  "--miniapp-safe-area-left",
  "--miniapp-safe-area-right",
  "--miniapp-safe-inline-start",
  "--miniapp-safe-inline-end",
]) assert.match(css, new RegExp(token));
assert.match(css, /env\(safe-area-inset-top/);
assert.match(css, /100svh/);
assert.match(css, /100dvh/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /forced-colors: active/);
assert.match(css, /:focus-visible/);
assert.match(shell, /miniapp-screen/);
assert.match(shell, /miniapp-safe-inline/);
assert.match(premium, /miniapp-safe-area-bottom/);
assert.match(visual, /miniapp-safe-area-bottom/);

assert.match(bidi, /<bdi dir=\{direction\}/);
assert.doesNotMatch(partnerHeader, /dir="ltr"/);
assert.match(partnerHeader, /text-start/);

const offenders = [];
const miniappRoot = path.resolve("miniapp");
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      if (/text-left|text-right/.test(source)) offenders.push(path.relative(process.cwd(), full).replaceAll("\\", "/"));
    }
  }
};
walk(miniappRoot);
assert.deepEqual(offenders, [], `physical text alignment remains in MiniApp: ${offenders.join(", ")}`);

console.log(JSON.stringify({
  status: "PASS",
  zoomAllowed: true,
  automaticFullscreenRemoved: true,
  fullscreenOptInAvailable: true,
  telegramViewportTracked: true,
  fourSidedSafeArea: true,
  reducedMotion: true,
  forcedColorsFocus: true,
  bidiIsolation: true,
  logicalTextAlignment: true,
}, null, 2));
