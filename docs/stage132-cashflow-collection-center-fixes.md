# Stage 132 — Cashflow KPI overflow + Collection Center fixes

Cashflow:
- KPI numbers now wrap safely and stay inside their cards.
- KPI cards hide horizontal overflow and use responsive font sizes.

Collection Center:
- Header redesigned from dark gradient to solid Apple-minimal cards.
- KPI header cards made solid and readable.
- Search icon moved to physical left and input padding fixed.
- Empty state changed from misleading success tone to filter-warning tone with reset action.
- Default date window widened from 6 months to 24 months.
- Server fallback: when the selected range returns no actionable items and no query is active, backend widens source window to 24 months so old active debts are not hidden from daily collection operations.

Files:
- pages/reports/CashflowReport.tsx
- pages/reports/CollectionFollowupCenter.tsx
- server/index.ts
- styles/runtime-overrides/10zy-cashflow-collection-center-fixes.css
- index.tsx
