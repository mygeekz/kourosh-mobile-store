import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const component = read('pages/dashboard/widgets/ClockWidget.tsx');
const dashboard = read('pages/Dashboard.tsx');
const css = read('styles/components/dashboard-clock.css');
const styleManifest = JSON.parse(read('styles/manifest/style-manifest.json'));
const contract = JSON.parse(read('config/ui/dashboard-clock-manifest.json'));
const legacySources = [
  'styles/system/dashboard-smart-widgets-foundation.css',
];
const prohibitedSelectors = [
  'dashboard-clock-card',
  'dashboard-smart-clock-card',
  'dashboard-clock-executive-card',
  'dashboard-clock-mode-switcher',
  'dashboard-clock-analog-face',
  'data-ui-dashboard-clock-mode',
  'data-dashboard-clock-mode',
];

assert(contract.component === 'pages/dashboard/widgets/ClockWidget.tsx', 'Clock manifest must identify the canonical component.');
assert(contract.styleContract === 'styles/components/dashboard-clock.css', 'Clock manifest must identify the canonical style contract.');
assert(contract.surfacePolicy?.outerSurfaceOwnedByDashboardHero === true, 'Dashboard hero must own the outer clock surface.');
assert(contract.surfacePolicy?.nestedCardSurfacesAllowed === false, 'Nested clock card surfaces must be prohibited.');
assert(component.includes('className="app-dashboard-clock"'), 'Clock root must use the canonical namespace.');
assert(component.includes('data-skip-global-button="true"'), 'Clock mode buttons must opt out of the global button enhancer.');
assert(component.includes('const totalSeconds = hour * 60 * 60 + minute * 60 + second;'), 'Clock progress must include live seconds.');
assert(component.includes('dayProgress: clampPercent((totalSeconds / (24 * 60 * 60)) * 100)'), 'Day progress must update from second-level time.');
assert(!component.includes('dashboard-clock-card'), 'Clock component must not use the legacy card namespace.');
assert(!component.includes('text-[72px]') && !component.includes('h-60 w-60'), 'Clock component must not restore oversized Tailwind objects.');
assert(!component.includes('bg-[linear-gradient') && !component.includes('bg-[radial-gradient'), 'Clock component must not define decorative gradient surfaces.');

assert(css.includes('.app-dashboard-clock {'), 'Canonical clock CSS root is missing.');
assert(css.includes('--clock-time-size: 48px;'), 'Wide digital clock scale must remain compact.');
assert(css.includes('--clock-analog-size: 158px;'), 'Wide analog scale must remain compact.');
assert(css.includes("[data-clock-density='regular']"), 'Regular density contract is missing.');
assert(css.includes("[data-clock-density='compact']"), 'Compact density contract is missing.');
assert(!/linear-gradient|radial-gradient/.test(css), 'Canonical clock contract must not use gradients.');
assert(!/translateY\s*\(/.test(css), 'Canonical clock contract must not move on hover.');
assert([...css.matchAll(/box-shadow:\s*([^;]+);/g)].every((match) => match[1].trim() === 'none'), 'Canonical clock contract must not create decorative shadows.');

const styleEntry = styleManifest.localStyles.find((entry) => entry.path === 'styles/components/dashboard-clock.css');
assert(styleEntry?.status === 'provisional-canonical', 'Clock style must be registered as provisional-canonical.');
assert(styleEntry?.bootstrapOrder === 26, 'Clock style must retain the clock foundation runtime slot after dashboard cleanup.');
assert(!styleManifest.localStyles.some((entry) => entry.path === 'styles/system/dashboard-redesign/dashboard-redesign-pass-3.css'), 'Clock-only redesign pass 3 must be removed from the style manifest.');
assert(!fs.existsSync(path.join(root, 'styles/system/dashboard-redesign/dashboard-redesign-pass-3.css')), 'Clock-only redesign pass 3 must be deleted.');

for (const file of legacySources) {
  const source = read(file);
  for (const selector of prohibitedSelectors) {
    assert(!source.includes(selector), `${file} must not retain active clock selector ${selector}.`);
  }
}

for (const deadSymbol of ['ClockWidgetPrefs', 'CLOCK_WIDGET_PREFS_KEY', 'clockPrefs', 'liveClock', 'setLiveNow']) {
  assert(!dashboard.includes(deadSymbol), `Dashboard must not retain dead clock symbol ${deadSymbol}.`);
}
assert(dashboard.includes('min-h-[260px] sm:min-h-[280px] lg:min-h-[310px]'), 'Dashboard hero must use the compact clock height contract.');

if (failures.length) {
  console.error('Dashboard clock contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Dashboard clock contract audit passed: canonical scale, single style owner, compact modes, and legacy cleanup are enforced.');
