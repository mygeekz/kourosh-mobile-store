import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const readText = (relativePath) => read(relativePath).toString('utf8');

const canonicalPath = 'components/assets/kourosh-final-symbol-gold.svg';
const canonical = read(canonicalPath);
const canonicalText = canonical.toString('utf8');

assert.match(canonicalText, /id="kourosh-symbol"[\s\S]*fill="#A98A64"/, 'The canonical SVG must retain the approved matte-gold symbol.');

for (const relativePath of [
  'components/assets/logo_outlined.svg',
  'public/kourosh-logo.svg',
  'public/favicon.svg',
]) {
  assert.deepEqual(read(relativePath), canonical, `${relativePath} must remain byte-identical to ${canonicalPath}.`);
}

assert.match(
  readText('components/assets/logo_outlined_trimmed.svg'),
  /id="kourosh-symbol"[\s\S]*fill="#A98A64"/,
  'The retained legacy trimmed alias must still contain the approved gold symbol.',
);

const sourceContracts = [
  ['components/LoginLogoMotionV3.tsx', /kourosh-final-symbol-gold\.svg\?raw/],
  ['components/auth/AuthBrandLogo.tsx', /kourosh-final-symbol-gold\.svg/],
  ['components/auth/AuthPageShell.tsx', /kourosh-final-symbol-gold\.svg/],
  ['components/sidebar/SidebarBrandBar.tsx', /kourosh-final-symbol-gold\.svg/],
  ['components/AppLoadingScreen.tsx', /kourosh-final-symbol-gold\.svg/],
];

for (const [relativePath, contract] of sourceContracts) {
  assert.match(readText(relativePath), contract, `${relativePath} must use the canonical gold logo.`);
}

const readPng = (relativePath, width, height) => {
  const png = PNG.sync.read(read(relativePath));
  assert.deepEqual([png.width, png.height], [width, height], `${relativePath} has an unexpected size.`);
  return png;
};

const isGold = (data, index) => {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const alpha = data[index + 3];
  return alpha > 220 && red >= 130 && red <= 210 && green >= 95 && green <= 175 && blue >= 55 && blue <= 130;
};

const goldBounds = (png) => {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (y * png.width + x) * 4;
      if (!isGold(png.data, index)) continue;
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assert.ok(count > png.width * png.height * 0.01, 'Rendered icon must contain a visible gold symbol.');
  return { minX, minY, maxX, maxY };
};

const icon192 = readPng('public/icons/icon-192.png', 192, 192);
const icon512 = readPng('public/icons/icon-512.png', 512, 512);
const maskable512 = readPng('public/icons/maskable-512.png', 512, 512);
readPng('public/apple-touch-icon.png', 180, 180);
readPng('public/logo.png', 256, 256);
readPng('components/assets/logo.png', 1024, 1024);

for (const icon of [icon192, icon512, maskable512]) goldBounds(icon);
const safeBounds = goldBounds(maskable512);
const safeInset = Math.round(maskable512.width * 0.16);
assert.ok(
  safeBounds.minX >= safeInset
    && safeBounds.minY >= safeInset
    && safeBounds.maxX <= maskable512.width - safeInset
    && safeBounds.maxY <= maskable512.height - safeInset,
  'The maskable gold symbol must stay inside the reviewed safe zone.',
);

const vite = readText('vite.config.ts');
const publicManifest = readText('public/manifest.json');
const indexHtml = readText('index.html');
assert.match(vite, /kourosh-logo\.svg[\s\S]*icon-192\.png[\s\S]*icon-512\.png[\s\S]*maskable-512\.png/, 'The generated PWA manifest must publish SVG and PNG brand icons.');
assert.match(publicManifest, /kourosh-logo\.svg[\s\S]*icon-192\.png[\s\S]*icon-512\.png[\s\S]*maskable-512\.png/, 'The static manifest must publish SVG and PNG brand icons.');
assert.match(indexHtml, /favicon\.svg[\s\S]*favicon\.ico[\s\S]*apple-touch-icon\.png/, 'The browser icon chain must include SVG, ICO and Apple Touch assets.');
assert.ok(read('public/favicon.ico').length > 0, 'The Windows-compatible favicon must exist.');

console.log('Default Kourosh brand assets audit passed (canonical gold SVG, app surfaces, PWA icons, maskable safe zone and browser fallbacks).');
