# Stage 140 — Collection Center date/delay correction

Fixes:
- Display dates in Collection Center as Shamsi instead of raw Gregorian/invalid strings.
- Direct installment/check source now picks earliest due/overdue date using parsed dates, not string sorting.
- Delay (`overdueDays`) is now calculated from actual overdue installment/check due date, not sale date or invalid parsing.
- Frontend date display helper now preserves already-Shamsi dates and converts ISO/Gregorian safely.

Files:
- `server/index.ts`
- `pages/reports/CollectionFollowupCenter.tsx`
