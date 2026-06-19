# Stage 96 — RealizedProfit local search/date cleanup

User requested the report file be fixed so there is no focus/nested box.

Fixes:
- RealizedProfit document search now uses only one visible input field.
- Search icon is physical-left.
- No separate visual wrapper around the search input.
- DatePicker usages in this report receive `inputClassName="realized-profit-date-clean"`.
- Last-loaded CSS suppresses inner input focus boxes caused by report-page generic input rules.

Files:
- `pages/reports/RealizedProfitReport.tsx`
- `styles/runtime-overrides/10v-realized-profit-report-local-fixes.css`
- `index.tsx`
