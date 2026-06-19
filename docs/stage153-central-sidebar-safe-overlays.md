# Stage 153 — Central sidebar-safe overlays

Goal:
Apply the same sidebar/viewport safety used for large modals to large drawers, dropdowns, popovers, notification panels, quick search, and floating panels.

Changes:
- Added central CSS:
  `styles/runtime-overrides/11m-central-sidebar-safe-overlays.css`
- Clamps common overlay surfaces against viewport and reserves right-sidebar space.
- Prevents overlay content/text/icon overlap.
- Keeps right-side drawers/dropdowns inside the visible working area.
- Mobile/smaller viewport fallback uses full viewport-safe width.

Files:
- `styles/runtime-overrides/11m-central-sidebar-safe-overlays.css`
- `index.tsx`
