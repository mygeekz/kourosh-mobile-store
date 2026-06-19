# Stage 125 — Partner capital progress final

Target:
Only the progress bar inside the capital column.

Fix:
- Wrapped the desktop table `FinancialProgressBar` with:
  `partner-capital-progress-inline`
- Added `data-progress-value`.
- Added final CSS to reduce progress rail height/width.
- Hides any internal percent/label text.
- Makes zero-progress rails subtle.
- Tightens vertical spacing in the capital cell.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zs-partner-capital-progress-final.css`
- `index.tsx`
