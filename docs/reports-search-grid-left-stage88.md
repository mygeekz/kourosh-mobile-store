# Stage 88 — Reports search grid/no-absolute fix

The reports search icon was still appearing on the right because old absolute positioning could be overridden by RTL/logical rules.

Fix:
- Replaced the `/reports` search markup in `Reports.tsx` with a real grid:
  `[icon] [RTL input]`
- The icon is no longer absolute.
- The wrapper is `dir="ltr"` only for layout; the input remains `dir="rtl"`.
- Old absolute icon fallback is hidden if cached markup appears.

Files:
- `pages/Reports.tsx`
- `styles/runtime-overrides/10q-reports-search-left-final.css`
