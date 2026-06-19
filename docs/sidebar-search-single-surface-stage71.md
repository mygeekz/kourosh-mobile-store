# Stage 71 — Sidebar search single-surface refinement

Stage 70 fixed overlap by converting sidebar search to a grid. The remaining visual issue was that the input and icon still looked like two nested boxes.

Stage 71 keeps the grid/no-overlap structure but removes internal surfaces:
- input has no border/background/radius
- icon has no border/background/radius
- only the outer wrapper is the visible search pill

Files:
- `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
