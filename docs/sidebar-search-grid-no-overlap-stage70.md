# Stage 70 — Sidebar search grid/no-overlap fix

The remaining issue was not just icon direction. The icon and the RTL text start were sharing the same visual space.

This stage removes the root cause:
- Sidebar search icon is no longer `absolute`
- Search field is now a two-column CSS grid
- Input and icon occupy different grid cells
- Text can never start under the icon

Files:
- `components/Sidebar.tsx`
- `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
- `index.tsx`
