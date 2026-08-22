import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const visualRef = read("miniapp/reference/miniAppVisualSystem.ts");
const primitives = read("miniapp/components/MiniAppVisualPrimitives.tsx");
const shell = read("miniapp/components/MiniAppShell.tsx");
const app = read("miniapp/App.tsx");
const pages = [
  "miniapp/pages/PartnerHome.tsx",
  "miniapp/pages/PartnerLedger.tsx",
  "miniapp/pages/PartnerPurchases.tsx",
  "miniapp/pages/PartnerPhones.tsx",
  "miniapp/pages/PartnerAccount.tsx",
  "miniapp/pages/PartnerMore.tsx",
].map(read);

assert.match(visualRef, /MINIAPP_VISUAL_REFERENCE/);
assert.match(visualRef, /MINIAPP_VISUAL_TONE/);
assert.match(primitives, /MiniAppQuickAction/);
assert.match(primitives, /MiniAppMetricCard/);
assert.match(primitives, /MiniAppFilterChip/);
assert.match(shell, /bottomDock/);
assert.match(shell, /to: "\/more"/);
assert.match(app, /path="more" element=\{<PartnerMore \/>\}/);

for (const source of [visualRef, primitives, shell, ...pages]) {
  assert.doesNotMatch(source, /style\s*=\s*\{/);
  assert.doesNotMatch(source, /import\s+["'][^"']+\.(?:css|scss|less)["']/);
}

for (const source of pages) {
  assert.match(source, /MINIAPP_VISUAL_REFERENCE|MiniApp(?:MetricCard|QuickAction|IconTile|Pill|FilterChip)/);
}

const miniappStyleFiles = readdirSync(new URL("../miniapp/", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isFile() && [".css", ".scss", ".less"].includes(extname(entry.name)))
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(miniappStyleFiles, ["tailwind.css"]);

console.log(JSON.stringify({
  status: "PASS",
  partnerScreens: 6,
  referenceComponents: true,
  customCssFilesInMiniapp: 0,
  inlineStylesInRedesign: 0,
}, null, 2));
