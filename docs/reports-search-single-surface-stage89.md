# Stage 89 — Reports search single-surface fix

Problem:
The reports search icon was moved correctly, but the input still displayed a second inner blue box on focus.

Fix:
- `Reports.tsx` now uses a ref for the search input.
- The actual DOM input receives important reset styles via `style.setProperty(..., 'important')`.
- CSS also hard-resets `[data-reports-main-search-input="true"]`.
- Only the outer grid shell draws the border and focus ring.

Files:
- `pages/Reports.tsx`
- `styles/runtime-overrides/10q-reports-search-left-final.css`
