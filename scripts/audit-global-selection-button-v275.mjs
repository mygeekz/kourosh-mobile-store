import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`[v275 selection-button audit] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[v275 selection-button audit] PASS: ${message}`);
const assert = (condition, message) => condition ? pass(message) : fail(message);

const effects = read('components/GlobalButtonEffects.tsx');
const repairs = read('pages/Repairs.tsx');
const runtimeInjectionRetired = !effects.includes('NATIVE_BUTTON_SELECTOR')
  && !effects.includes('data-ux-enhanced')
  && !effects.includes('ux-btn--native')
  && !effects.includes('classList.add');

assert(
  runtimeInjectionRetired || effects.includes('const STATEFUL_CONTROL_SELECTOR')
    && effects.includes('[aria-pressed]')
    && effects.includes('[aria-selected]')
    && effects.includes('[role="tab"]')
    && effects.includes('[data-state]'),
  'stateful/selectable controls are explicitly excluded from native button skinning',
);

assert(
  runtimeInjectionRetired || effects.includes('if (el.matches(STATEFUL_CONTROL_SELECTOR)) return true;'),
  'GlobalButtonEffects skips state-owned controls before injecting ux-btn classes',
);

assert(
  runtimeInjectionRetired || effects.includes('function clearNativeButtonEnhancement')
    && effects.includes("el.classList.remove(...INJECTED_BUTTON_CLASSES)"),
  'legacy runtime-injected ux-btn classes can be removed safely during HMR/state transitions',
);

assert(
  !/function isActionLikeButton[\s\S]*?\{[\s\S]*?if \(hasVisualIcon\(el\)\) return true;/.test(effects),
  'an icon by itself no longer promotes arbitrary cards/toggles into the legacy button skin',
);

assert(
  runtimeInjectionRetired || effects.includes("attributeFilter: ['disabled', 'aria-disabled', 'aria-busy', 'aria-pressed', 'aria-selected', 'aria-current', 'data-loading', 'data-state', 'data-active', 'class']"),
  'runtime observer reacts to selection-state changes so stale injected classes are cleaned',
);

assert(
  /aria-pressed=\{active\}/.test(repairs)
    && /border-sky-300 bg-sky-50/.test(repairs),
  'Repairs executive filter cards remain React/Tailwind-owned stateful controls',
);

if (process.exitCode) process.exit(process.exitCode);
console.log('[v275 selection-button audit] All checks passed.');
