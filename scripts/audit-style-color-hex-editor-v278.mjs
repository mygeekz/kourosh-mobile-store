import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const settings = read('pages/settings/StyleSettings.tsx');
const context = read('contexts/StyleContext.tsx');
const css = read('styles/system/ui-personalization-foundation.css');

const fail = (message) => {
  console.error(`[v278 style-color-hex audit] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[v278 style-color-hex audit] PASS: ${message}`);
const assert = (condition, message) => condition ? pass(message) : fail(message);

assert(settings.includes('const normalizeHexColor =') && settings.includes('/^[0-9a-fA-F]{6}$/'), 'manual HEX parser accepts canonical six-digit colors');
assert(settings.includes('/^[0-9a-fA-F]{3}$/') && settings.includes('expanded.toUpperCase()'), 'manual HEX parser supports shorthand and normalizes uppercase');
assert(settings.includes('state: \'primary\' | \'press\' | \'active\''), 'one reusable color editor owns all three button states');
assert(settings.includes('state="primary"') && settings.includes('state="press"') && settings.includes('state="active"'), 'Style Center renders normal, press and selected color editors');
assert(settings.includes('style-color-editor__hex-input') && settings.includes('کد هگز'), 'each state exposes a typed HEX input');
assert(settings.includes("palette: 'custom'") && settings.includes("brandMode: 'custom'"), 'manual primary color switches branding to custom mode');
assert(settings.includes('style-custom-palette-status'), 'custom palette state is visible after a manual primary color change');
assert(!settings.includes('InteractionColorField'), 'legacy two-card interaction picker renderer is retired');
assert(!settings.includes('style-button-state-color-grid'), 'legacy interaction color grid markup is retired');

for (const expected of [
  'const s = clampInt(style.primaryS, 0, 100, DEFAULTS.primaryS);',
  'const l = clampInt(style.primaryL, 0, 100, DEFAULTS.primaryL);',
  'const buttonPressS = clampInt(style.buttonPressS, 0, 100, DEFAULTS.buttonPressS);',
  'const buttonPressL = clampInt(style.buttonPressL, 0, 100, DEFAULTS.buttonPressL);',
  'const buttonActiveS = clampInt(style.buttonActiveS, 0, 100, DEFAULTS.buttonActiveS);',
  'const buttonActiveL = clampInt(style.buttonActiveL, 0, 100, DEFAULTS.buttonActiveL);',
]) {
  assert(context.includes(expected), `exact HEX channels are not narrowed by legacy HSL bounds: ${expected.split(' = ')[0]}`);
}

assert(css.includes('.style-color-palette {') && css.includes('.style-color-editor {'), 'redesigned color editor shell is present');
assert(/data-style-color-state=[\"']press[\"']/.test(css) && /data-style-color-state=[\"']active[\"']/.test(css), 'editor swatches are token-driven per interaction state');
assert(css.includes('.style-color-editor__picker-action:focus-within') && /aria-invalid=[\"']true[\"']/.test(css), 'visual picker and invalid HEX states have accessible focus/error feedback');
assert(css.includes('border-inline-start-width') && !css.includes('box-shadow: inset 3px 0 0'), 'state accent uses RTL-safe logical border instead of physical inset decoration');
assert(!css.includes('.style-interaction-color {') && !css.includes('.style-button-state-color-grid {'), 'obsolete v277 color cards are removed from CSS');

if (process.exitCode) process.exit(process.exitCode);
console.log('[v278 style-color-hex audit] All contract checks passed.');
