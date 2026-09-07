import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`[v277 style-template audit] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[v277 style-template audit] PASS: ${message}`);
const assert = (condition, message) => condition ? pass(message) : fail(message);

const palettes = read('config/stylePalettes.ts');
const context = read('contexts/StyleContext.tsx');
const templates = read('pages/settings/styleTemplates.ts');
const settings = read('pages/settings/StyleSettings.tsx');
const sanitizer = read('pages/settings/useSettingsStyleProfileState.ts');
const css = read('styles/system/ui-personalization-foundation.css');
const effects = read('components/GlobalButtonEffects.tsx');
const textField = read('components/ui/TextField.tsx');

const paletteKeys = ['aurora', 'classic', 'ocean', 'sunset', 'midnight', 'gold'];
for (const key of paletteKeys) {
  const start = palettes.indexOf(`${key}: {`);
  const next = paletteKeys.map((candidate) => palettes.indexOf(`${candidate}: {`, start + 1)).filter((index) => index > start).sort((a,b) => a-b)[0] ?? palettes.length;
  const block = start >= 0 ? palettes.slice(start, next) : '';
  assert(block.includes('buttonPress:') && block.includes('buttonActive:'), `${key} palette declares press + selected colors`);
}

for (const field of [
  'buttonPressHue', 'buttonPressS', 'buttonPressL',
  'buttonActiveHue', 'buttonActiveS', 'buttonActiveL',
]) {
  assert(context.includes(`${field}: number;`), `StyleState persists ${field}`);
  assert(templates.includes(`${field}:`), `templates snapshot ${field}`);
  assert(sanitizer.includes(`sanitized.${field}`), `legacy/custom snapshots backfill ${field}`);
}

assert(context.includes("root.style.setProperty('--button-press'") && context.includes("root.style.setProperty('--button-active'"), 'StyleContext publishes interaction tokens globally');
assert(context.includes("root.style.setProperty('--button-press-foreground'") && context.includes("root.style.setProperty('--button-active-foreground'"), 'interaction foregrounds are contrast-resolved');
assert(textField.includes("data-ui-control={unstyled ? undefined : 'true'}"), 'unstyled TextField fully opts out of global field chrome');
assert(settings.includes('هنگام کلیک') && settings.includes('بعد از کلیک / انتخاب‌شده'), 'Style Center exposes both interaction color controls');
assert(settings.includes('data-style-button-preview-state="press"') && settings.includes('data-style-button-preview-state="active"'), 'Style Center preview renders press and selected states');
assert(/\[data-style-button-preview-state=[\"']press[\"']\]/.test(css) && /\[data-style-button-preview-state=[\"']active[\"']\]/.test(css), 'preview state tokens are painted by canonical CSS');
assert(/\.app-toggle-switch\[data-state=[\"']on[\"']\]/.test(css) && css.includes('.apple-choice-toggle:is('), 'reusable toggle/choice primitives consume selected token');
assert(css.includes('.app-dashboard-range-tab') && css.includes('.app-header-popover__segment'), 'common segmented controls consume selected token');

assert(
  (
    effects.includes('const STATEFUL_CONTROL_SELECTOR')
      && effects.includes('[aria-pressed]')
      && effects.includes('[aria-selected]')
      && effects.includes('[data-state]')
  ) || (
    !effects.includes('detectVariant(')
      && !effects.includes("classList.add('ux-btn'")
      && !effects.includes('data-ux-enhanced')
  ),
  'stateful controls are not reclassified by GlobalButtonEffects (v275 guard or v281 visual-mutation removal)',
);

// Static coverage inventory. These are source occurrences, not runtime unique controls.
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) return [];
    return walk(full);
  }
  return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
});
const tsx = walk(root);
let nativeButtons = 0;
let sharedButtons = 0;
let skipGlobal = 0;
for (const file of tsx) {
  const source = fs.readFileSync(file, 'utf8');
  nativeButtons += (source.match(/<button\b/g) || []).length;
  sharedButtons += (source.match(/<Button\b/g) || []).length;
  skipGlobal += (source.match(/data-skip-global-button/g) || []).length;
}
console.log(`[v277 style-template audit] INFO: static TSX inventory => shared <Button>: ${sharedButtons}, native <button>: ${nativeButtons}, explicit skip-global markers: ${skipGlobal}`);
assert(sharedButtons > 0, 'shared Button primitive is actively used');
assert(nativeButtons > 0, 'legacy/page-owned native buttons remain visible to migration audit (no false 100% coverage claim)');

if (process.exitCode) process.exit(process.exitCode);
console.log('[v277 style-template audit] All contract checks passed.');
