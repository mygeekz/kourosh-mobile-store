# Stage 87 — Reports search icon-left fix

Fixes the visible `/reports` category search box:
- `pages/Reports.tsx` now uses dedicated `reports-main-search` classes.
- Icon is physically positioned on the left.
- Input text remains RTL/right aligned with safe padding.
- A final CSS override is imported last.

Files:
- `pages/Reports.tsx`
- `styles/runtime-overrides/10q-reports-search-left-final.css`
- `index.tsx`
