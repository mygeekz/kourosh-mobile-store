import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`UI contract audit failed: ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const surface = read('components/ui/Surface.tsx');
const table = read('components/ui/DataTableShell.tsx');
const reportControlDock = read('components/reports/ReportControlDock.tsx');
const filters = read('components/ui/ResponsiveFilterBar.tsx');
const pageKit = read('components/ui/PageKit.tsx');
const pageShell = read('components/ui/PageShell.tsx');
const filterChips = read('components/FilterChipsBar.tsx');
const selectFieldCss = read('styles/components/select-field.css');
const buttonFoundation = read('styles/system/shared-action-buttons-foundation.css');
const dialog = read('components/ui/Dialog.tsx');
const responsive = read('styles/layout/responsive.css');
const cards = read('styles/system/ui-contracts/table-card-contract-phase6.css');
const reportFilters = read('styles/system/reports-filter-kpi-foundation.css');
const modal = read('styles/components/modal-system.css');

const styleManifest = JSON.parse(read('styles/manifest/style-manifest.json'));
const runtimeOrder = new Map(styleManifest.localStyles
  .filter((entry) => entry.delivery === 'direct' && entry.runtimeActive)
  .map((entry) => [entry.path, Number(entry.bootstrapOrder)]));
expect(runtimeOrder.get('styles/system/reports-filter-kpi-foundation.css') > runtimeOrder.get('styles/system/reports-redesign/reports-stage236-risk-profit-live.css'), 'report filter/KPI contract must load after report-specific styles.');
expect(runtimeOrder.get('styles/system/ui-contracts/table-card-contract-phase6.css') > runtimeOrder.get('styles/system/customers-directory-v73.css'), 'table/card contract must load after page-specific table styles.');
expect(runtimeOrder.get('styles/components/modal-system.css') > runtimeOrder.get('styles/system/ui-contracts/table-card-contract-phase6.css'), 'modal contract must remain after the global card/table contract.');
expect(runtimeOrder.get('styles/components/date-field.css') > runtimeOrder.get('styles/components/modal-system.css'), 'date field must remain the final geometry owner.');

expect(surface.includes("const showDecoration = isGlass && variant === 'auth'"), 'non-auth surfaces must not render decorative overlays.');
expect(surface.includes("'[&&]:!bg-[var(--ds-surface-card)]'"), 'adaptive panel surfaces must use the semantic card token.');
expect(table.includes('surface="default"'), 'DataTableShell must use the solid canonical surface.');
expect(table.includes('data-ui-table-responsive="scroll"'), 'DataTableShell must declare the responsive scroll contract.');
expect(table.includes('meta?: React.ReactNode'), 'DataTableShell must expose the standard header metadata slot.');
expect(table.includes('titleIcon?: React.ReactNode'), 'DataTableShell must expose the semantic title icon slot.');
expect(reportControlDock.includes('export function ReportControlDateSection'), 'ReportControlDock must expose the canonical date-range section.');
expect(reportControlDock.includes('export function ReportControlComparison'), 'ReportControlDock must expose the canonical comparison section.');
expect(reportControlDock.includes('export function ReportControlFooter'), 'ReportControlDock must expose the canonical status/action footer.');
expect(reportControlDock.includes("presentation === 'approved'"), 'ReportControlDock must preserve the approved report-control presentation.');
expect(filters.includes('data-ui-filter-bar="true"'), 'ResponsiveFilterBar must declare the shared filter contract.');
expect(pageKit.includes('actions={resolvedFilterActions}'), 'PageKit toolbar actions must live inside ResponsiveFilterBar.');
expect(pageKit.includes('controlDock?: React.ReactNode'), 'PageKit must expose the persistent canonical report-control slot.');
expect(pageKit.includes('{controlDock ? <div className="mb-4 sm:mb-5">{controlDock}</div> : null}'), 'PageKit must render the report-control dock before loading and empty states.');
expect(pageKit.includes('actions={undefined}'), 'PageKit must not reserve a separate title-header action lane.');
expect(pageShell.includes('const useCompactHeader = isCompactReportPage || hasControlHeader'), 'control-heavy page headers must use compact density.');
expect(filterChips.includes('!bg-transparent'), 'filter counts must render without a colored badge background.');
expect(buttonFoundation.includes('background: transparent !important'), 'canonical filter-count CSS must stay chrome-free.');
expect(selectFieldCss.includes('padding-inline-start: 2.35rem'), 'small SelectField icon lanes must reserve logical leading space for selected text.');
expect(selectFieldCss.includes('text-overflow: ellipsis'), 'SelectField must keep selected text stable inside its control.');
expect(dialog.includes('surface="default"'), 'Dialog must use the solid canonical modal surface.');
expect(!/button\s*,\s*\n?\s*a\s*\{[\s\S]*?display:\s*flex/.test(responsive), 'responsive CSS must not force every link/button into flex layout.');
expect(cards.includes("@media (max-width: 1279px)"), 'card/table contract must cover laptop/tablet widths.');
expect(cards.includes("@media (max-width: 900px)"), 'card/table contract must cover tablet widths.');
expect(cards.includes("@media (max-width: 640px)"), 'card/table contract must cover mobile widths.');
expect(cards.includes("[data-ui-icon-surface='bare']"), 'card contract must keep icon glyphs chrome-free.');
expect(reportFilters.includes(".report-filter-field__icon"), 'report filters must use the central bare-icon contract.');
expect(reportFilters.includes("background: transparent !important"), 'report filter icons/presets must not use colored tiles.');
expect(reportFilters.includes("Canonical filter-count contract"), 'final filter-count contract must remove nested count badges.');
expect(modal.includes('Final canonical modal contrast/responsive contract'), 'modal system must contain the final shared responsive contract.');
expect(modal.includes("@media (max-width: 900px)"), 'modal contract must cover tablet widths.');
expect(modal.includes("@media (max-width: 640px)"), 'modal contract must cover mobile widths.');

if (!process.exitCode) {
  console.log('Global UI contrast/responsive contract audit passed.');
}
