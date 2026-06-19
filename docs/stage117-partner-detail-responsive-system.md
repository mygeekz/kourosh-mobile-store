# Stage 117 — PartnerDetail responsive system

Goal:
Make PartnerDetail work reliably across viewport sizes.

Implemented:
- Added root marker: `partner-detail-responsive-root`
- Added a final responsive CSS contract:
  `10zl-partner-detail-responsive-system.css`
- Responsive behavior:
  - desktop: profile + actions in controlled columns
  - <=1180px: actions move to a full-width row without clipping
  - <=900px: section margins/padding reduced
  - <=640px: actions and phone capital metrics become single-column
  - tables scroll horizontally instead of breaking viewport width
- Does not change business logic.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zl-partner-detail-responsive-system.css`
- `index.tsx`
