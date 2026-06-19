# Stage 137 — Collection basis tooltip + JSX fix

Fixes:
- Removed the broken orphan `<span>` left from deleting `خروجی از نوار بالا`.
- This fixes the Vite/Babel error:
  `Expected corresponding JSX closing tag for <span>`
- Added hover/focus tooltip to Collection Center basis badge.

Tooltip explains:
- Collection Center is not based only on sale date.
- Old sales may appear if they have open balance, due installment/check, overdue status, next follow-up date, or high risk.

Files:
- `pages/reports/CollectionFollowupCenter.tsx`
- `styles/runtime-overrides/10zz-collection-center-basis-badge.css`
