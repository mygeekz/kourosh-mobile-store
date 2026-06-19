# Phase 20 — Reports Runtime Reduction

## Scope
This phase moves the remaining reports runtime stylesheet out of `styles/runtime-overrides` and into a controlled system foundation path.

## Changed
- Replaced the direct runtime import:
  - `styles/runtime-overrides/02a-reports-apple-minimal.css`
- With:
  - `styles/system/reports-runtime/reports-apple-minimal-foundation.css`

## Why this was done conservatively
The source file was not merged with other report foundations because it contains hard Apple-minimal overrides for report layouts and depends on its existing cascade position near early app-level styling. The import position in `index.tsx` was preserved.

## Not changed
- Report APIs
- Report calculations
- Report date filters
- Excel/CSV output
- Dashboard or widget logic
- JSX components

## Test checklist
- Reports landing page
- Financial overview
- Profit/loss reports
- Cashflow / Debtors / Creditors
- Report actions and export buttons
- Date filters
- Dark mode and light mode
- 1280 / 1366 / mobile widths
