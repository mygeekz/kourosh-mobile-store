# Stage 73 — Hard reset inner sidebar search input

The inner blue box was still visible because the actual input inherited global input focus/surface styles.

Fixes:
- Removed `unstyled-input` from the dedicated sidebar search input.
- Added a hard reset using `all: unset !important` scoped only to:
  `.kourosh-sidebar-search-grid input.kourosh-sidebar-search-grid__input`
- The outer wrapper remains the only visible search surface.

Files:
- `components/Sidebar.tsx`
- `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
