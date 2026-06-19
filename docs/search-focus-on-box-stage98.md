# Stage 98 — Search focus-on-box final

User asked to focus only on search boxes.

Changes:
- Removed Stage97 broad `:has()` search/date import.
- Search wrapper is no longer the visible box.
- The input itself is the only visible focused box.
- Search icon is forced to physical left.
- RTL text remains right-aligned.
- Applied to realized-profit search, Reports search, Customers/Partners search and shared toolbar searches.

Files:
- `pages/reports/RealizedProfitReport.tsx`
- `pages/Reports.tsx`
- `pages/Customers.tsx`
- `pages/Partners.tsx`
- `components/reports/ModernTableTools.tsx`
- `components/TableToolbar.tsx`
- `components/ui/PageKit.tsx`
- `styles/runtime-overrides/10x-search-focus-on-box-final.css`
- `index.tsx`
