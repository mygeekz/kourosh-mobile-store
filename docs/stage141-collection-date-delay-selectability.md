# Stage 141 — Collection date/delay + text selection fix

Fixes:
- Jalali dates like `1405/03/05` were being parsed as Gregorian year 1405, causing:
  - wrong displayed dates
  - huge incorrect delay values
- Backend `collectionCenterSafeMoment` now detects Jalali first and converts before Gregorian parsing.
- Frontend `shamsi()` now preserves already-Shamsi values instead of reparsing them.
- Removed `draggable` from collection cards and added `user-select: text` so text inside cards can be selected/copied.

Files:
- `server/index.ts`
- `pages/reports/CollectionFollowupCenter.tsx`
- `styles/runtime-overrides/11b-collection-date-selectability-fix.css`
- `index.tsx`
