# Stage 95 — Date picker root fix + Realized Profit search icon-left

Fixes:
- ShamsiDatePicker double-box issue caused by report-page global input styling.
- RealizedProfit document search icon moved to physical left with grid layout.

Stability:
- No global DOM runtime contract is used.
- RealizedProfit route remains on stable component logic; only its search markup is changed.

Files:
- `components/ShamsiDatePicker.tsx`
- `pages/reports/RealizedProfitReport.tsx`
- `styles/runtime-overrides/10u-date-and-realized-search-final.css`
- `index.tsx`
