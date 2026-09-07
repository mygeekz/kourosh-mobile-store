import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const manifest = JSON.parse(read('config/ui/dashboard-widgets-manifest.json'));
const css = read(manifest.styleContract);
const legacyCss = read('styles/legacy/09d-legacy-global-charts-kpi-dashboard.css');
const generatedCss = read('styles/generated/tailwind-entry.generated.css');
const widgetFiles = [
  'pages/dashboard/widgets/AssetWidget.tsx',
  'pages/dashboard/widgets/KPIWidget.tsx',
  'pages/dashboard/widgets/ProductSalesKPIWidget.tsx',
  'pages/dashboard/widgets/SalesChartWidget.tsx',
  'pages/dashboard/widgets/InstallmentCalendarWidget.tsx',
  'pages/dashboard/widgets/RecentActivitiesWidget.tsx',
  'pages/dashboard/widgets/KouroshPulseCard.tsx',
  'components/ActionCenterWidget.tsx',
];
const source = widgetFiles.map(read).join('\n');

const dashboardPage = read('pages/Dashboard.tsx');
const installmentWidget = read('pages/dashboard/widgets/InstallmentCalendarWidget.tsx');
const salesChartWidget = read('pages/dashboard/widgets/SalesChartWidget.tsx');
const pulseWidget = read('pages/dashboard/widgets/KouroshPulseCard.tsx');
const headerLink = read('pages/dashboard/DashboardHeaderLink.tsx');

assert(manifest.standards?.singleSurface === true, 'Dashboard widgets must enforce one surface.');
assert(manifest.standards?.compactTypography === true, 'Dashboard widgets must enforce compact typography.');
assert(manifest.standards?.noGradient === true, 'Dashboard widgets must prohibit gradients.');
assert(manifest.standards?.noHoverMotion === true, 'Dashboard widgets must prohibit hover movement.');
assert(manifest.standards?.fixedFrameOwnsOperationalSurface === true, 'FixedWidgetFrame must own operational widget surfaces.');
assert(manifest.standards?.framelessRangeTabs === true, 'Dashboard range tabs must be frameless.');
assert(manifest.standards?.noQuickActionPanel === true, 'Dashboard quick-action panel must remain removed.');
assert(manifest.standards?.noLegacyRowActionCollision === true, 'Dashboard row navigation must avoid legacy row-action selectors.');
assert(manifest.standards?.pulseUsesCanonicalPrimitives === true, 'Kourosh Pulse must use canonical dashboard primitives.');
assert(css.includes('font-size: 15px;'), 'Canonical metric value scale is missing.');
assert(css.includes('inline-size: 26px;'), 'Canonical metric icon scale is missing.');
assert(css.includes('min-block-size: 48px;'), 'Canonical row scale is missing.');
assert(css.includes('min-block-size: 23px;'), 'Canonical range-tab scale is missing.');
assert(!source.includes('text-3xl') && !source.includes('text-[2rem]'), 'Dashboard widgets must not restore oversized values.');
assert(!source.includes('shadow-['), 'Dashboard widget JSX must not own decorative arbitrary shadows.');
assert(!source.includes('bg-gradient') && !source.includes('linear-gradient'), 'Dashboard widget JSX must not own gradients.');
assert(!source.includes('hover:-translate'), 'Dashboard widget JSX must not move on hover.');
assert(source.includes('data-skip-global-button="true"'), 'Dashboard segmented controls must opt out of global button enhancement.');

assert(css.includes('.app-dashboard-widget {') && css.includes('background: transparent;'), 'Inner dashboard widget roots must remain structural and frameless.');
assert(!css.includes('.app-dashboard-text-action'), 'Legacy dashboard text-action selector must be removed.');
assert(!css.includes('.app-dashboard-row-action'), 'Dashboard row navigation must not match legacy row-action selectors.');
assert(!css.includes('.app-dashboard-segmented'), 'Legacy segmented wrapper must be removed.');
assert(css.includes('.app-dashboard-range-tabs') && css.includes('background: transparent;'), 'Dashboard range tabs must use the frameless canonical namespace.');
assert(headerLink.includes('app-dashboard-header-link') && headerLink.includes('data-rgl-no-drag'), 'Canonical compact dashboard header link is incomplete.');
assert(installmentWidget.includes('DashboardHeaderLink') && installmentWidget.includes('app-dashboard-row-link'), 'Installment widget must use compact canonical actions.');
assert(salesChartWidget.includes('app-dashboard-range-tabs') && !salesChartWidget.includes('app-dashboard-segmented'), 'Sales chart must use frameless canonical range tabs.');
assert(!dashboardPage.includes('title="اقدام فوری"') && !dashboardPage.includes('app-dashboard-quick-action'), 'Dashboard quick-action panel must remain fully removed.');
assert(!css.includes('.app-dashboard-quick-action') && !css.includes('.app-dashboard-executive-grid'), 'Removed quick-action layout CSS must not remain active.');
assert(pulseWidget.includes('data-kourosh-pulse-summary="true"') && pulseWidget.includes('app-dashboard-metric-strip'), 'Kourosh Pulse summary must use canonical metrics.');
assert(!pulseWidget.includes('app-dashboard-pulse__alerts'), 'Kourosh Pulse must not restore its legacy alert grid.');

assert(!legacyCss.includes('[class*="dashboard-widget"]'), 'Legacy dashboard CSS must not use substring selectors that match canonical header/title classes.');
assert(!legacyCss.includes('[class*="metric-card"]'), 'Legacy KPI CSS must not use broad metric-card substring selectors.');
assert(!legacyCss.includes('[class*="kpi-card"]'), 'Legacy KPI CSS must not use broad kpi-card substring selectors.');
assert(!legacyCss.includes('[class*="widget-shell"]'), 'Legacy widget CSS must not use broad widget-shell substring selectors.');
assert(!generatedCss.includes('[class*="dashboard-widget"]'), 'Generated CSS must not contain dashboard-widget substring selectors.');
assert(!read('pages/Dashboard.tsx').includes('fa-gauge-simple-low'), 'Dashboard must not use the unavailable gauge-simple-low icon.');

if (failures.length) {
  console.error('Dashboard widget contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Dashboard widget contract audit passed: compact canonical widgets and shared primitives are enforced.');
