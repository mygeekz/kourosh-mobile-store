# Stage 94 — Date field single-surface + realized-profit stability

Fixes:
1. Removed the risky DOM search runtime call from `index.tsx` so app boot/login is stable.
2. Rolled back RealizedProfit document search markup to the stable version to stop route crash.
3. Fixed ShamsiDatePicker double-box issue with a dedicated single-surface CSS contract.

Files:
- `index.tsx`
- `pages/reports/RealizedProfitReport.tsx`
- `components/ShamsiDatePicker.tsx`
- `styles/runtime-overrides/10t-date-field-single-surface.css`
