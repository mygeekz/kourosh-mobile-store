# Stage 99 — Search final specificity fix

Why previous changes did not show:
1. Stage 98 accidentally put `kp-search-field-host` on some input elements.
2. Old people CSS had stronger selectors like:
   `.people-customers-shell .customers-toolbar__search...`
   which brought wrapper borders/focus back.

Fix:
- Customers/Partners search JSX rewritten directly.
- Search wrapper no longer uses old search wrapper classes.
- Input owns the only visible box.
- Icon is physical-left.
- High-specificity CSS wins against old people/report selectors.

Files:
- `pages/Customers.tsx`
- `pages/Partners.tsx`
- `pages/Reports.tsx`
- `pages/reports/RealizedProfitReport.tsx`
- `styles/runtime-overrides/10y-search-final-specificity-fix.css`
- `index.tsx`
