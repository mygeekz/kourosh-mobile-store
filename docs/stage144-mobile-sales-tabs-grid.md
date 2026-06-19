# Stage 144 — Mobile Sales Analytics tabs grid

Target:
`/reports/mobile-sales-analytics`

Fix:
- The six tab boxes were squeezed into one row and clipped.
- Converted tab container from horizontal flex/overflow to responsive grid.
- On wide screens: 3 columns x 2 rows.
- On medium screens: 2 columns x 3 rows.
- On mobile: 1 column.
- Also moved local search icon to physical left and fixed input padding.

Files:
- `pages/reports/MobileSalesAnalytics.tsx`
- `styles/runtime-overrides/11d-mobile-sales-tabs-grid.css`
- `index.tsx`
