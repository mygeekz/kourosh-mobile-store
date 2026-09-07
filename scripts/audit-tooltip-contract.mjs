import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const component = read('components/SmartTooltipLayer.tsx');
const css = read('styles/system/overlay-layer-contract.css');
const providers = read('app/providers/AppProviders.tsx');

assert(providers.includes('<SmartTooltipLayer'), 'SmartTooltipLayer must remain mounted once at provider level.');
assert(component.includes('SHOW_DELAY_MS = 500'), 'Tooltip display delay must remain 500ms.');
assert(component.includes('AUTO_HIDE_MS = 2000'), 'Tooltip auto-dismiss must remain 2000ms.');
assert(component.includes("element.removeAttribute('title')"), 'Native title attributes must be removed to prevent duplicate tooltips.');
assert(component.includes("const TOOLTIP_SELECTOR = '[data-tooltip]'"), 'Tooltip discovery must remain explicit-only.');
assert(!component.includes('pointermove'), 'Tooltip must not continuously follow pointer movement.');
assert(component.includes('app-tooltip-positioner'), 'Tooltip must use the canonical simple namespace.');
assert(!component.includes('smart-tooltip-layer'), 'Legacy smart-tooltip namespace must not be rendered.');
assert(css.includes('.app-tooltip-bubble'), 'Overlay contract must own canonical tooltip styling.');
assert(!css.includes('radial-gradient') || !css.includes('.app-tooltip-bubble'), 'Canonical tooltip must not use gradient styling.');

if (failures.length) {
  console.error('Tooltip contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Tooltip contract audit passed: one explicit tooltip layer, delayed show and timed dismissal are enforced.');
