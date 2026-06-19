# Stage 108 — PartnerDetail hero single-column final

Issue:
The previous two-column desktop hero layout still placed action buttons in the left column. At normal viewport width, actions were clipped by the page/hero boundaries.

Fix:
- PartnerDetail hero is now always single-column.
- Profile info is the first row.
- Action buttons are the second row, full-width inside the card.
- Actions render as 4 columns on desktop, 2 columns on tablet, 1 column on small mobile.
- This avoids side-column clipping entirely.

Files:
- `styles/runtime-overrides/10ze-partner-detail-hero-single-column.css`
- `index.tsx`
