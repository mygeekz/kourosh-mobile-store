import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const manifest = JSON.parse(read('config/ui/dashboard-surface-manifest.json'));
const widgetManifest = JSON.parse(read('config/ui/dashboard-widgets-manifest.json'));
const css = read('styles/system/dashboard-smart-widgets-foundation.css');
const dashboard = read('pages/Dashboard.tsx');
const fixedFrame = read('pages/dashboard/FixedWidgetFrame.tsx');
const layout = read('pages/dashboard/OperationalWidgetLayout.tsx');
const widgetHeader = read('pages/dashboard/DashboardWidgetHeader.tsx');
const metric = read('pages/dashboard/DashboardMetric.tsx');
const spotlight = read('pages/dashboard/DashboardSpotlightCard.tsx');
const headerLink = read('pages/dashboard/DashboardHeaderLink.tsx');
const widgetFiles = manifest.widgetComponents.map(read).join('\n');
const styleManifest = JSON.parse(read('styles/manifest/style-manifest.json'));

assert(manifest.canonicalStyle?.path === 'styles/system/dashboard-smart-widgets-foundation.css', 'Dashboard surface manifest must identify the canonical style file.');
assert(manifest.canonicalFixedSurface?.component === 'pages/dashboard/FixedWidgetFrame.tsx', 'FixedWidgetFrame must own fixed widget surfaces.');
assert(manifest.canonicalOperationalLayout?.component === 'pages/dashboard/OperationalWidgetLayout.tsx', 'OperationalWidgetLayout must own widget header/body/scroll.');
assert(manifest.surfacePolicy?.oneOuterSurface === true, 'Dashboard must enforce one outer surface.');
assert(manifest.surfacePolicy?.decorativeGradientAllowed === false, 'Decorative gradients must remain prohibited.');
assert(widgetManifest.styleContract === 'styles/system/dashboard-smart-widgets-foundation.css', 'Dashboard widget manifest must use the canonical style contract.');

assert(dashboard.includes('className="app-dashboard-page'), 'Dashboard page must use the canonical root namespace.');
assert(!dashboard.includes('dashboard-redesign-v1'), 'Dashboard page must not reactivate legacy redesign pass namespaces.');
assert(dashboard.includes('<DashboardSpotlightCard'), 'Spotlight KPIs must use DashboardSpotlightCard.');
assert(dashboard.includes('<DashboardMetric'), 'Executive dashboard metrics must use DashboardMetric.');
assert(dashboard.includes('<FixedWidgetFrame>'), 'Fixed operational widgets must use FixedWidgetFrame.');
assert(!dashboard.includes('[activeTimeframe, token, authReady, featureFlags, usedWidgetIds]'), 'Dashboard data effects must not depend on unstable feature/layout collections.');
assert(dashboard.includes("const assetWidgetActive = usedWidgetIds.includes('asset');"), 'Dashboard must derive a primitive asset-widget activity dependency.');
assert(dashboard.includes("const installmentCalendarWidgetActive = usedWidgetIds.includes('installment_calendar');"), 'Dashboard must derive a primitive installment-widget activity dependency.');
assert(fixedFrame.includes('className="app-dashboard-widget-frame"'), 'FixedWidgetFrame must emit the canonical frame class.');
assert(layout.includes('app-dashboard-operational__viewport'), 'Operational layout must own the canonical scroll viewport.');
assert(layout.includes("scroll ? 'app-dashboard-operational__viewport'"), 'Operational layout must explicitly separate scrolling and non-scrolling bodies.');
assert(widgetHeader.includes('app-dashboard-widget-header'), 'Canonical dashboard header primitive is missing.');
assert(metric.includes('app-dashboard-metric'), 'Canonical dashboard metric primitive is missing.');
assert(spotlight.includes('app-dashboard-spotlight-card'), 'Canonical spotlight primitive is missing.');
assert(headerLink.includes('app-dashboard-header-link'), 'Canonical dashboard header link primitive is missing.');
assert(manifest.surfacePolicy?.fixedFrameOwnsOperationalSurface === true, 'Fixed frame must remain the sole operational surface owner.');
assert(manifest.surfacePolicy?.framelessRangeTabs === true, 'Range tabs must remain frameless.');
assert(manifest.surfacePolicy?.quickActionPanelAllowed === false, 'Quick action panel must remain removed.');
assert(!css.includes('.app-dashboard-segmented'), 'Legacy segmented selector must remain removed.');
assert(!css.includes('.app-dashboard-row-action'), 'Dashboard must avoid legacy row-action selector collisions.');
assert(!dashboard.includes('title="اقدام فوری"'), 'Removed quick action panel must not return.');

for (const selector of [
  '.app-dashboard-page',
  '.app-dashboard-widget-frame',
  '.app-dashboard-operational__viewport',
  '.app-dashboard-widget-header',
  '.app-dashboard-metric',
  '.app-dashboard-list-row',
  '.app-dashboard-range-tabs',
]) {
  assert(css.includes(selector), `Canonical dashboard CSS must define ${selector}.`);
}
assert(!/linear-gradient|radial-gradient/.test(css), 'Canonical dashboard widget CSS must not use decorative gradients.');
assert(!/translateY\s*\(/.test(css), 'Canonical dashboard widget CSS must not move surfaces on hover.');
assert(!/box-shadow:\s*0\s+0\s+0\s+[2-9]px/.test(css), 'Canonical dashboard CSS must not restore focus glow rings.');

for (const legacy of manifest.removedLegacySources) {
  assert(!fs.existsSync(path.join(root, legacy)), `Removed legacy dashboard source still exists: ${legacy}`);
  assert(!styleManifest.localStyles.some((entry) => entry.path === legacy), `Removed legacy dashboard source remains registered: ${legacy}`);
}

const canonicalEntry = styleManifest.localStyles.find((entry) => entry.path === 'styles/system/dashboard-smart-widgets-foundation.css');
assert(canonicalEntry?.status === 'provisional-canonical', 'Canonical dashboard widget style must be provisional-canonical.');
assert(canonicalEntry?.bootstrapOrder === manifest.canonicalStyle.bootstrapOrder, 'Dashboard widget runtime order must match its manifest.');

for (const prohibited of [
  'premium-data-shell',
  'premium-data-header',
  'premium-stat-card',
  'dashboard-widget-local-header',
  'dashboard-widget-scrollarea',
  'hover:-translate-y',
  'blur-3xl',
  'bg-[linear-gradient',
  'bg-[radial-gradient',
]) {
  assert(!widgetFiles.includes(prohibited), `Dashboard widgets must not use legacy/decorative token ${prohibited}.`);
}

for (const widget of [
  'SalesChartWidget.tsx',
  'InstallmentCalendarWidget.tsx',
  'RecentActivitiesWidget.tsx',
]) {
  const source = read(`pages/dashboard/widgets/${widget}`);
  assert(source.includes('<OperationalWidgetLayout'), `${widget} must use OperationalWidgetLayout.`);
  assert(source.includes('<DashboardWidgetHeader'), `${widget} must use DashboardWidgetHeader.`);
}

const salesChart = read('pages/dashboard/widgets/SalesChartWidget.tsx');
assert(salesChart.includes('const chartReady = container.width > 0 && container.height > 0;'), 'Sales chart must wait for a measured positive container.');
assert(salesChart.includes('ctx.showLoadingSkeletons || !chartReady'), 'Sales chart must not mount Recharts before its container is measurable.');
assert(/minWidth=\{(?:0|1)\}/.test(salesChart) && /minHeight=\{(?:0|1)\}/.test(salesChart), 'Sales chart ResponsiveContainer must expose non-negative minimum dimensions.');
assert(/initialDimension=\{\{ width: (?:container\.width|Math\.max\(1, container\.width\)), height: (?:container\.height|Math\.max\(1, container\.height\)) \}\}/.test(salesChart), 'Sales chart must seed Recharts with positive measured widget dimensions.');

if (failures.length) {
  console.error('Dashboard surface contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Dashboard surface contract audit passed: canonical primitives, compact scale, single surfaces and legacy source removal are enforced.');
