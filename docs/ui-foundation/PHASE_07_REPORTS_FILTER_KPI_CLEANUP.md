# Phase 07 — Reports Filter / KPI Compact Cleanup

## Scope
This phase improves the shared UI foundation for report filters, date preset chips, report toolbars, and KPI cards.

## Files changed

- `components/reports/ReportFilterField.tsx`
- `styles/system/reports-filter-kpi-foundation.css`
- `index.tsx`
- `docs/ui-foundation/PHASE_07_REPORTS_FILTER_KPI_CLEANUP.md`

## What changed

### 1. ReportFilterField icon contract
`ReportFilterField` already accepted an `icon` prop, but it was not rendered. The component now renders the icon inside `.report-filter-field__icon`, which makes existing report filters more consistent without changing each report page.

### 2. Shared report filter foundation
A new shared stylesheet was added:

```txt
styles/system/reports-filter-kpi-foundation.css
```

It defines a compact Apple-minimal contract for:

- report filter surfaces
- `ReportFilterField` labels/icons/controls
- `ReportDatePresetChips`
- shared KPI cards
- common report toolbar surfaces

### 3. Date preset chips compact layout
Date shortcuts now use a more predictable grid layout:

- desktop: compact row/grid
- mobile: two-column fallback
- active state is cleaner and less colorful

### 4. KPI card visual cleanup
Shared KPI cards now use:

- calmer surfaces
- smaller icon containers
- tighter spacing
- stable value alignment
- tone colors only on values, not the whole card background

## What did not change

- No API calls changed.
- No report calculations changed.
- No date filter state logic changed.
- No Excel/CSV export logic changed.
- No database or backend code changed.
- No individual report data mapping changed.

## Test checklist

Please test:

- `/reports`
- `/reports/financial-overview`
- `/reports/product-sales`
- `/reports/sales-summary`
- `/reports/realized-profit`
- `/reports/cashflow`
- `/reports/debtors`
- `/reports/creditors`
- `/reports/analysis/profitability`
- `/reports/analysis/inventory`
- `/reports/analysis/suggestions`

Specific UI checks:

- Report filter icons appear next to labels.
- Date preset chips do not overflow on desktop.
- Date preset chips become readable two-column controls on mobile.
- From/to date controls remain clickable.
- KPI cards are compact and readable.
- Dark mode remains readable.
- Export/print buttons still work.
